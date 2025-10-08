import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Webhook received from earn.nctr.live');

    // Verify webhook secret
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = Deno.env.get('NCTR_LIVE_WEBHOOK_SECRET');
    
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error('❌ Unauthorized webhook request');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));

    const {
      event,
      wallet_address,
      user_id: nctr_live_user_id,
      email,
      total_nctr,
      available_nctr,
      locked_360_nctr,
      timestamp
    } = payload;

    // Validate required fields
    if (!event || !wallet_address || !email) {
      console.error('❌ Missing required fields in webhook payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 Looking up user with wallet: ${wallet_address} and email: ${email}`);

    // Find user by wallet address and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, nctr_live_verified')
      .eq('wallet_address', wallet_address)
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found with this wallet and email combination' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found user: ${profile.user_id}`);

    // Parse NCTR amounts
    const totalNCTR = parseFloat(total_nctr || '0');
    const availableNCTR = parseFloat(available_nctr || '0');
    const locked360NCTR = parseFloat(locked_360_nctr || '0');

    console.log(`💰 Updating balances - Total: ${totalNCTR}, Available: ${availableNCTR}, Locked 360: ${locked360NCTR}`);

    // Update portfolio with new balances
    const { error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        nctr_live_available: availableNCTR,
        nctr_live_lock_360: locked360NCTR,
        nctr_live_total: totalNCTR,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id);

    if (portfolioError) {
      console.error('❌ Error updating portfolio:', portfolioError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update portfolio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile verification status if needed
    if (!profile.nctr_live_verified) {
      console.log('🔐 Marking user as NCTR Live verified');
      await supabase
        .from('profiles')
        .update({
          nctr_live_verified: true,
          nctr_live_user_id: nctr_live_user_id,
          nctr_live_email: email
        })
        .eq('user_id', profile.user_id);
    }

    // Log the webhook event
    await supabase
      .from('nctr_transactions')
      .insert({
        user_id: profile.user_id,
        transaction_type: 'sync',
        nctr_amount: totalNCTR,
        description: `NCTR Live webhook update: ${event}`,
        earning_source: 'nctr_live_sync',
        status: 'completed',
        metadata: {
          event,
          timestamp,
          webhook: true
        }
      });

    console.log('✅ Webhook processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Portfolio updated successfully',
        user_id: profile.user_id,
        balances: {
          total: totalNCTR,
          available: availableNCTR,
          locked_360: locked360NCTR
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
