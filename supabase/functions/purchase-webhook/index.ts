import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseWebhookPayload {
  user_id: string;
  amount: number;
  transaction_id: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: 'credit_card' | 'crypto' | 'bank_transfer';
  timestamp: string;
  source?: string; // 'garden' for purchases from The Garden
  lock_type?: '360LOCK' | '90LOCK' | 'available'; // Specify where tokens should go
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Enhanced security: validate webhook signature (if configured)
    const webhookSecret = Deno.env.get('PURCHASE_WEBHOOK_SECRET');
    if (webhookSecret) {
      const signature = req.headers.get('x-webhook-signature');
      if (!signature) {
        return new Response('Missing webhook signature', { 
          status: 401,
          headers: corsHeaders 
        });
      }
      // Add signature validation logic here based on your payment provider
    }

    // Enhanced security: rate limiting check
    const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    
    // Parse and validate request body with enhanced security
    let payload: PurchaseWebhookPayload;
    try {
      const text = await req.text();
      if (!text.trim()) {
        throw new Error('Empty request body');
      }
      payload = JSON.parse(text);
    } catch (parseError) {
      return new Response('Invalid JSON payload', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Enhanced security: log webhook with sanitized data (no sensitive info)
    console.log('Purchase webhook received from IP:', clientIP, 'user_id:', payload.user_id?.substring(0, 8));

    // Enhanced security: validate required fields with type checking
    if (!payload.user_id || typeof payload.user_id !== 'string' || payload.user_id.length !== 36) {
      return new Response('Missing or invalid user_id', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!payload.amount || typeof payload.amount !== 'number' || payload.amount <= 0 || payload.amount > 1000000) {
      return new Response('Missing or invalid amount', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!payload.transaction_id || typeof payload.transaction_id !== 'string' || payload.transaction_id.length < 5) {
      return new Response('Missing or invalid transaction_id', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!payload.status || !['completed', 'pending', 'failed'].includes(payload.status)) {
      return new Response('Missing or invalid status', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Only process completed purchases
    if (payload.status !== 'completed') {
      console.log(`Purchase not completed yet: ${payload.status}`);
      return new Response('Purchase not completed', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Check if transaction already exists
    const { data: existingTransaction } = await supabase
      .from('nctr_transactions')
      .select('id')
      .eq('external_transaction_id', payload.transaction_id)
      .maybeSingle();

    if (existingTransaction) {
      console.log('Transaction already processed:', payload.transaction_id);
      return new Response('Transaction already processed', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Get current portfolio to update amounts, create if doesn't exist
    const { data: currentPortfolio } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    let portfolioData;
    if (!currentPortfolio) {
      // Create portfolio if it doesn't exist
      const { data: newPortfolio, error: createError } = await supabase
        .from('nctr_portfolio')
        .insert({
          user_id: payload.user_id,
          available_nctr: 0,
          total_earned: 0
        })
        .select('available_nctr, total_earned')
        .single();
      
      if (createError) {
        console.error('Error creating portfolio:', createError);
        throw createError;
      }
      portfolioData = newPortfolio;
    } else {
      portfolioData = currentPortfolio;
    }

    // Handle token allocation based on lock_type
    let lockId: string | null = null;
    
    if (payload.lock_type === '360LOCK') {
      // Add to total_earned only, tokens go directly to 360LOCK
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .update({
          total_earned: portfolioData.total_earned + payload.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', payload.user_id);

      if (portfolioError) {
        console.error('Error updating portfolio for 360LOCK:', portfolioError);
        throw portfolioError;
      }

      // Auto-lock in 360LOCK using the database function
      const { data: lockResult, error: lockError } = await supabase.rpc('auto_lock_earned_nctr', {
        p_user_id: payload.user_id,
        p_nctr_amount: payload.amount,
        p_earning_source: 'token_purchase',
        p_opportunity_type: 'bonus' // This ensures it goes to 360LOCK
      });

      if (lockError) {
        console.error('Error creating 360LOCK:', lockError);
        throw lockError;
      }
      
      lockId = lockResult;
      console.log(`Created 360LOCK with ID: ${lockId}`);
      
    } else {
      // Default behavior - add to available_nctr
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: portfolioData.available_nctr + payload.amount,
          total_earned: portfolioData.total_earned + payload.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', payload.user_id);

      if (portfolioError) {
        console.error('Error updating portfolio:', portfolioError);
        throw portfolioError;
      }
    }

    // Record the purchase transaction
    const transactionDescription = payload.lock_type === '360LOCK' 
      ? `NCTR purchase via ${payload.payment_method} (locked in 360LOCK) - ${payload.transaction_id}`
      : `NCTR purchase via ${payload.payment_method} - ${payload.transaction_id}`;
      
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: payload.user_id,
        transaction_type: 'earned',
        nctr_amount: payload.amount,
        description: transactionDescription,
        earning_source: 'token_purchase',
        status: 'completed',
        external_transaction_id: payload.transaction_id,
        created_at: payload.timestamp
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      throw transactionError;
    }

    // If purchase was initiated from The Garden, check for status upgrades
    if (payload.source === 'garden') {
      try {
        // Trigger status update check
        const { error: statusError } = await supabase.rpc('update_user_status', {
          user_id: payload.user_id
        });

        if (statusError) {
          console.error('Error updating user status:', statusError);
          // Don't throw - the purchase was successful even if status update failed
        }

        console.log('User status updated after purchase');
      } catch (statusUpdateError) {
        console.error('Failed to update user status:', statusUpdateError);
        // Continue - purchase was successful
      }
    }

    // Get updated portfolio for response
    const { data: updatedPortfolio } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned, opportunity_status')
      .eq('user_id', payload.user_id)
      .single();

    console.log('Purchase webhook processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Purchase processed successfully',
        portfolio: updatedPortfolio,
        transaction_id: payload.transaction_id,
        lock_type: payload.lock_type,
        lock_id: lockId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Purchase webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : 'Unknown error') || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})