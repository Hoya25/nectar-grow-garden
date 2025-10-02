import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
}

interface PurchaseWebhookPayload {
  user_id: string;
  amount: number;
  transaction_id: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: 'credit_card' | 'crypto' | 'bank_transfer';
  timestamp: string;
  source?: string;
  lock_type?: '360LOCK' | '90LOCK' | 'available';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // CRITICAL SECURITY: Mandatory webhook signature verification
    const webhookSecret = Deno.env.get('PURCHASE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[SECURITY] PURCHASE_WEBHOOK_SECRET not configured - refusing all requests');
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
      console.error('[SECURITY] Missing webhook signature', { ip: req.headers.get('x-forwarded-for') });
      return new Response(JSON.stringify({ error: 'Authentication required' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const body = await req.text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (signature !== expectedSignature) {
      console.error('[SECURITY] Invalid webhook signature', { ip: req.headers.get('x-forwarded-for') });
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[SECURITY] ✅ Webhook signature verified');

    // Parse validated body
    let payload: PurchaseWebhookPayload;
    try {
      if (!body.trim()) {
        throw new Error('Empty request body');
      }
      payload = JSON.parse(body);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced input validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!payload.user_id || !uuidRegex.test(payload.user_id)) {
      throw new Error('Invalid user_id format');
    }
    
    if (typeof payload.amount !== 'number' || payload.amount <= 0 || payload.amount > 10000) {
      throw new Error('Invalid amount');
    }
    
    if (!payload.transaction_id || payload.transaction_id.length < 5 || payload.transaction_id.length > 100) {
      throw new Error('Invalid transaction_id');
    }
    
    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(payload.status)) {
      throw new Error('Invalid status');
    }
    
    // Validate timestamp if provided
    if (payload.timestamp) {
      const timestamp = new Date(payload.timestamp);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (timestamp < dayAgo || timestamp > new Date()) {
        throw new Error('Invalid timestamp');
      }
    }
    
    // Sanitize string inputs
    const sanitize = (str: string) => str.replace(/[<>\"']/g, '');
    if (payload.payment_method) {
      payload.payment_method = sanitize(payload.payment_method) as any;
    }

    // Only process completed purchases
    if (payload.status !== 'completed') {
      console.log(`Purchase not completed yet: ${payload.status}`);
      return new Response(JSON.stringify({ message: 'Purchase not completed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ message: 'Transaction already processed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        }

        console.log('User status updated after purchase');
      } catch (statusUpdateError) {
        console.error('Failed to update user status:', statusUpdateError);
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
    console.error('[ERROR] Purchase webhook error:', error);
    
    // Sanitize error for external response
    let publicError = 'Transaction processing failed';
    const errorMsg = error instanceof Error ? error.message : '';
    
    if (errorMsg.includes('user_id')) {
      publicError = 'Invalid user reference';
    } else if (errorMsg.includes('duplicate')) {
      publicError = 'Duplicate transaction';
    } else if (errorMsg.includes('amount')) {
      publicError = 'Invalid amount';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: publicError 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
