import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  wallet_address: string;
  nctr_amount: number;
  user_email?: string;
  transaction_id: string;
  source: string;
  user_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Receive earn withdrawal request started');

    // Verify API secret
    const authHeader = req.headers.get('Authorization');
    const gardenApiSecret = Deno.env.get('GARDEN_API_SECRET');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providedSecret = authHeader.replace('Bearer ', '');
    if (providedSecret !== gardenApiSecret) {
      console.error('❌ Invalid API secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: WithdrawalRequest = await req.json();
    console.log('📦 Request body:', { ...body, wallet_address: body.wallet_address?.substring(0, 10) + '...' });

    // Validate required fields
    if (!body.wallet_address || !body.nctr_amount || !body.transaction_id || !body.source) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: wallet_address, nctr_amount, transaction_id, source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Looking up user by wallet address:', body.wallet_address.substring(0, 10) + '...');

    // Find user by wallet_address (primary) or email (fallback)
    let userQuery = supabase
      .from('profiles')
      .select('user_id, username, email')
      .eq('wallet_address', body.wallet_address);

    let { data: user, error: userError } = await userQuery.single();

    // If not found by wallet and email provided, try email
    if (!user && body.user_email) {
      console.log('👤 User not found by wallet, trying email:', body.user_email);
      const { data: emailUser, error: emailError } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .eq('email', body.user_email)
        .single();

      if (emailUser) {
        user = emailUser;
        console.log('✅ User found by email');
      } else {
        console.log('⚠️ User not found by email either');
      }
    }

    let userId: string;

    // Create user profile if doesn't exist
    if (!user) {
      console.log('👤 Creating new user profile');

      // Create auth user first (if using email)
      if (body.user_email) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: body.user_email,
          email_confirm: true,
        });

        if (authError) {
          console.error('❌ Error creating auth user:', authError);
          return new Response(
            JSON.stringify({ error: 'Failed to create user account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = authData.user.id;
      } else {
        console.error('❌ Cannot create user without email');
        return new Response(
          JSON.stringify({ error: 'Cannot create user: email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          wallet_address: body.wallet_address,
          email: body.user_email,
          full_name: body.user_name || null,
          username: body.user_email?.split('@')[0] || 'user_' + userId.substring(0, 8),
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create portfolio
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .insert({
          user_id: userId,
          available_nctr: 0,
          total_earned: 0,
        });

      if (portfolioError) {
        console.error('❌ Error creating portfolio:', portfolioError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user portfolio' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ New user created:', userId);
    } else {
      userId = user.user_id;
      console.log('✅ Existing user found:', userId);
    }

    // Credit the NCTR amount to portfolio
    console.log('💰 Crediting NCTR amount:', body.nctr_amount);

    const { data: portfolio, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned')
      .eq('user_id', userId)
      .single();

    if (portfolioError) {
      console.error('❌ Error fetching portfolio:', portfolioError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user portfolio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newAvailableBalance = (portfolio?.available_nctr || 0) + body.nctr_amount;
    const newTotalEarned = (portfolio?.total_earned || 0) + body.nctr_amount;

    const { error: updateError } = await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: newAvailableBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating portfolio:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to credit NCTR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        nctr_amount: body.nctr_amount,
        description: `NCTR withdrawal from ${body.source}`,
        earning_source: body.source,
        status: 'completed',
        external_transaction_id: body.transaction_id,
      });

    if (transactionError) {
      console.error('⚠️ Warning: Failed to log transaction:', transactionError);
      // Don't fail the request if transaction logging fails
    }

    console.log('✅ Successfully credited NCTR:', {
      userId,
      amount: body.nctr_amount,
      newBalance: newAvailableBalance,
    });

    return new Response(
      JSON.stringify({
        success: true,
        credited_amount: body.nctr_amount,
        new_balance: newAvailableBalance,
        user_id: userId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
