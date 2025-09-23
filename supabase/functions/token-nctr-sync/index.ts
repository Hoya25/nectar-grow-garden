import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const userProfileApiKey = Deno.env.get('USER_PROFILE_API_KEY')!;

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
    
    // Use the correct NCTR.live API endpoint
    const endpoint = 'https://arkwiktiehqafjvlhjrt.supabase.co/functions/v1/get-user-portfolio';
    
    console.log(`Using endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': userProfileApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: walletAddress
      })
    });

    console.log(`Response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('NCTR Live portfolio data:', data);
        
        return {
          user_id: '', // Will be set by caller
          available_nctr: data.available_nctr || 0,
          lock_360_nctr: data.lock_360_nctr || 0,
          total_earned: data.total_earned || 0,
          wallet_address: walletAddress,
        };
      } else {
        const responseText = await response.text();
        console.log('Non-JSON response received:', responseText);
        return null;
      }
    } else {
      const responseText = await response.text();
      console.error(`HTTP ${response.status} error from ${endpoint}:`, responseText);
      return null;
    }

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
    // Get current portfolio to calculate Garden-earned amounts
    const { data: currentPortfolio, error: getCurrentError } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, lock_360_nctr, total_earned, nctr_live_available, nctr_live_lock_360, nctr_live_total')
      .eq('user_id', userId)
      .single();

    if (getCurrentError) {
      console.error('Error getting current portfolio:', getCurrentError);
      return { success: false, message: 'Failed to get current portfolio' };
    }

    // Calculate Garden-only amounts (current totals minus previous NCTR Live amounts)
    const gardenAvailable = (currentPortfolio.available_nctr || 0) - (currentPortfolio.nctr_live_available || 0);
    const gardenLock360 = (currentPortfolio.lock_360_nctr || 0) - (currentPortfolio.nctr_live_lock_360 || 0);
    const gardenTotal = (currentPortfolio.total_earned || 0) - (currentPortfolio.nctr_live_total || 0);

    // Calculate new totals (Garden amounts + new NCTR Live amounts)
    const newAvailable = Math.max(0, gardenAvailable) + nctrLiveData.available_nctr;
    const newLock360 = Math.max(0, gardenLock360) + nctrLiveData.lock_360_nctr;
    const newTotal = Math.max(0, gardenTotal) + nctrLiveData.total_earned;

    // Update local portfolio with combined data and NCTR Live tracking
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: newAvailable,
        lock_360_nctr: newLock360,
        total_earned: newTotal,
        nctr_live_available: nctrLiveData.available_nctr,
        nctr_live_lock_360: nctrLiveData.lock_360_nctr,
        nctr_live_total: nctrLiveData.total_earned,
        last_sync_at: new Date().toISOString(),
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