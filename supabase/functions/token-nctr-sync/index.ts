import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const nctrTokenApiKey = Deno.env.get('NCTR_TOKEN_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NCTRPortfolioData {
  user_id: string;
  available_nctr: number;
  lock_360_nctr: number;
  total_earned: number;
  wallet_address?: string;
}

async function fetchPortfolioFromNCTRLive(walletAddress: string): Promise<NCTRPortfolioData | null> {
  try {
    console.log(`Fetching portfolio for wallet: ${walletAddress}`);
    
    const response = await fetch(`https://token.nctr.live/api/portfolio/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${nctrTokenApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`NCTR Live API error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('NCTR Live portfolio data:', data);
    
    return {
      user_id: '', // Will be set by caller
      available_nctr: data.available_nctr || 0,
      lock_360_nctr: data.lock_360_nctr || 0,
      total_earned: data.total_earned || 0,
      wallet_address: walletAddress,
    };
  } catch (error) {
    console.error('Error fetching from NCTR Live:', error);
    return null;
  }
}

async function syncUserPortfolio(userId: string, walletAddress: string): Promise<{ success: boolean; message: string; data?: any }> {
  // Fetch portfolio data from token.nctr.live
  const nctrLiveData = await fetchPortfolioFromNCTRLive(walletAddress);
  
  if (!nctrLiveData) {
    return { success: false, message: 'Failed to fetch portfolio from NCTR Live' };
  }

  try {
    // Update local portfolio with NCTR Live data
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: nctrLiveData.available_nctr,
        lock_360_nctr: nctrLiveData.lock_360_nctr,
        total_earned: nctrLiveData.total_earned,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (portfolioError) {
      console.error('Portfolio update error:', portfolioError);
      return { success: false, message: 'Failed to update portfolio' };
    }

    // Update user status based on new 360LOCK amount
    const { data: statusData, error: statusError } = await supabase.rpc('update_user_status', {
      user_id: userId
    });

    if (statusError) {
      console.error('Status update error:', statusError);
      // Don't fail the whole sync if status update fails
    }

    // Create a sync record/transaction for audit trail
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'sync',
        nctr_amount: nctrLiveData.total_earned,
        description: `Portfolio synced with NCTR Live - 360LOCK: ${nctrLiveData.lock_360_nctr} NCTR`,
        earning_source: 'nctr_live_sync',
        status: 'completed'
      });

    if (transactionError) {
      console.error('Transaction log error:', transactionError);
      // Don't fail sync if transaction logging fails
    }

    return {
      success: true,
      message: 'Portfolio synced successfully',
      data: {
        available_nctr: nctrLiveData.available_nctr,
        lock_360_nctr: nctrLiveData.lock_360_nctr,
        total_earned: nctrLiveData.total_earned,
        status_updated: !statusError,
        new_status: statusData?.new_status || portfolioData?.opportunity_status
      }
    };

  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, message: 'Internal sync error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, wallet_address } = await req.json();

    if (action === 'sync_portfolio') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's wallet address if not provided
      let userWalletAddress = wallet_address;
      if (!userWalletAddress) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('user_id', user_id)
          .single();

        if (profileError || !profileData?.wallet_address) {
          return new Response(
            JSON.stringify({ success: false, error: 'User wallet address not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userWalletAddress = profileData.wallet_address;
      }

      console.log(`Syncing portfolio for user ${user_id} with wallet ${userWalletAddress}`);
      
      const result = await syncUserPortfolio(user_id, userWalletAddress);

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Batch sync for multiple users (admin function)
    if (action === 'batch_sync') {
      const { data: usersWithWallets, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, wallet_address')
        .not('wallet_address', 'is', null);

      if (usersError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];
      for (const user of usersWithWallets || []) {
        const result = await syncUserPortfolio(user.user_id, user.wallet_address);
        results.push({ user_id: user.user_id, ...result });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Batch sync completed for ${results.length} users`,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});