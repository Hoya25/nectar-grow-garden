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

    const payload: PurchaseWebhookPayload = await req.json();
    console.log('Purchase webhook received:', payload);

    // Validate required fields
    if (!payload.user_id || !payload.amount || !payload.transaction_id || !payload.status) {
      return new Response('Missing required fields', { 
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

    // Get current portfolio to update amounts
    const { data: currentPortfolio } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned')
      .eq('user_id', payload.user_id)
      .single();

    if (!currentPortfolio) {
      throw new Error('User portfolio not found');
    }

    // Update user's portfolio with purchased NCTR
    const { error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: currentPortfolio.available_nctr + payload.amount,
        total_earned: currentPortfolio.total_earned + payload.amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payload.user_id);

    if (portfolioError) {
      console.error('Error updating portfolio:', portfolioError);
      throw portfolioError;
    }

    // Record the purchase transaction
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: payload.user_id,
        transaction_type: 'earned',
        nctr_amount: payload.amount,
        description: `NCTR purchase via ${payload.payment_method} - ${payload.transaction_id}`,
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
        transaction_id: payload.transaction_id
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
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})