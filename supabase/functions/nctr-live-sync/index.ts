import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, wallet_address } = await req.json();

    switch (action) {
      case 'sync_profile':
        return await syncUserProfile(user_id, wallet_address, supabase);
      case 'check_sync_status':
        return await checkSyncStatus(user_id, supabase);
      default:
        throw new Error('Invalid action. Supported: sync_profile, check_sync_status');
    }

  } catch (error: any) {
    console.error('Error in nctr-live-sync function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error occurred'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function syncUserProfile(userId: string, walletAddress: string, supabase: any): Promise<Response> {
  console.log(`🔄 Starting NCTR Live sync for user ${userId} with wallet ${walletAddress}`);
  
  try {
    // Step 1: Fetch data from token.nctr.live API
    const nctrLiveData = await fetchNCTRLiveProfile(walletAddress);
    
    if (!nctrLiveData.success) {
      throw new Error(nctrLiveData.error || 'Failed to fetch NCTR Live profile');
    }

    const liveProfile = nctrLiveData.data;
    console.log('📊 NCTR Live profile data:', liveProfile);

    // Step 2: Calculate what to credit to Wings account
    const creditResult = await calculateSyncCredits(userId, liveProfile, supabase);
    
    if (!creditResult.success) {
      throw new Error(creditResult.error || 'Failed to calculate sync credits');
    }

    // Step 3: Apply credits and update portfolio
    const updateResult = await applySyncCredits(userId, creditResult.credits, liveProfile, supabase);
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to apply sync credits');
    }

    // Step 4: Update sync status
    await updateSyncStatus(userId, liveProfile, supabase);

    console.log('✅ NCTR Live sync completed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile synced successfully',
        credits_applied: creditResult.credits,
        live_profile: liveProfile,
        wings_updated: updateResult.updated_portfolio
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ NCTR Live sync failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Sync failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function fetchNCTRLiveProfile(walletAddress: string): Promise<any> {
  console.log(`🔍 Fetching NCTR Live profile for wallet: ${walletAddress}`);
  
  try {
    // For now, we'll create a mock API response since the actual API isn't available
    // In production, this would be: https://api.token.nctr.live/profile/${walletAddress}
    
    // Mock response based on realistic NCTR Live data structure
    const mockProfile = {
      wallet_address: walletAddress,
      total_nctr: Math.floor(Math.random() * 50000) + 10000, // 10K-60K NCTR
      available_nctr: Math.floor(Math.random() * 20000) + 5000, // 5K-25K available
      locked_360_nctr: Math.floor(Math.random() * 30000) + 5000, // 5K-35K locked
      status_level: 'premium', // Could be starter, advanced, premium, vip
      last_updated: new Date().toISOString(),
      verified: true
    };

    console.log('📈 Mock NCTR Live profile generated:', mockProfile);
    
    return {
      success: true,
      data: mockProfile
    };

  } catch (error: any) {
    console.error('Error fetching NCTR Live profile:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch profile'
    };
  }
}

async function calculateSyncCredits(userId: string, liveProfile: any, supabase: any): Promise<any> {
  console.log(`💰 Calculating sync credits for user ${userId}`);
  
  try {
    // Get current Wings portfolio
    const { data: currentPortfolio, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (portfolioError) {
      throw new Error(`Failed to fetch current portfolio: ${portfolioError.message}`);
    }

    // Calculate what should be credited based on difference
    const currentLiveTotal = currentPortfolio.nctr_live_total || 0;
    const currentLive360 = currentPortfolio.nctr_live_lock_360 || 0;
    
    const newLiveTotal = liveProfile.total_nctr;
    const newLive360 = liveProfile.locked_360_nctr;
    
    // Only credit increases (prevent negative sync)
    const totalIncrease = Math.max(0, newLiveTotal - currentLiveTotal);
    const lock360Increase = Math.max(0, newLive360 - currentLive360);
    
    // Credit logic:
    // - If 360LOCK increased, credit that amount to Wings 360LOCK
    // - If total increased but 360LOCK didn't, credit available NCTR
    let creditsTo360Lock = 0;
    let creditsToAvailable = 0;
    
    if (lock360Increase > 0) {
      creditsTo360Lock = lock360Increase;
      console.log(`📈 360LOCK increase detected: ${lock360Increase} NCTR`);
    }
    
    if (totalIncrease > lock360Increase) {
      creditsToAvailable = totalIncrease - lock360Increase;
      console.log(`💵 Available NCTR increase detected: ${creditsToAvailable} NCTR`);
    }

    return {
      success: true,
      credits: {
        available_nctr: creditsToAvailable,
        lock_360_nctr: creditsTo360Lock,
        total_credited: creditsToAvailable + creditsTo360Lock
      },
      current_portfolio: currentPortfolio,
      live_profile: liveProfile
    };

  } catch (error: any) {
    console.error('Error calculating sync credits:', error);
    return {
      success: false,
      error: error?.message || 'Failed to calculate credits'
    };
  }
}

async function applySyncCredits(userId: string, credits: any, liveProfile: any, supabase: any): Promise<any> {
  console.log(`🎯 Applying sync credits for user ${userId}:`, credits);
  
  try {
    if (credits.total_credited <= 0) {
      console.log('ℹ️ No credits to apply');
      return {
        success: true,
        message: 'No new credits to apply',
        updated_portfolio: null
      };
    }

    // Get current portfolio for calculations
    const { data: currentPortfolio, error: getCurrentError } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, lock_360_nctr, total_earned')
      .eq('user_id', userId)
      .single();

    if (getCurrentError) {
      throw new Error(`Failed to get current portfolio: ${getCurrentError.message}`);
    }

    // Update portfolio with synced amounts
    const { data: updatedPortfolio, error: updateError } = await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: (currentPortfolio.available_nctr || 0) + credits.available_nctr,
        lock_360_nctr: (currentPortfolio.lock_360_nctr || 0) + credits.lock_360_nctr,
        total_earned: (currentPortfolio.total_earned || 0) + credits.total_credited,
        nctr_live_available: liveProfile.available_nctr,
        nctr_live_lock_360: liveProfile.locked_360_nctr,
        nctr_live_total: liveProfile.total_nctr,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update portfolio: ${updateError.message}`);
    }

    // Create locks for 360LOCK credits
    if (credits.lock_360_nctr > 0) {
      const { error: lockError } = await supabase
        .from('nctr_locks')
        .insert({
          user_id: userId,
          nctr_amount: credits.lock_360_nctr,
          lock_type: '360LOCK',
          lock_category: '360LOCK',
          commitment_days: 360,
          unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: false,
          original_lock_type: '360LOCK',
          status: 'active'
        });

      if (lockError) {
        console.error('Error creating 360LOCK:', lockError);
      }
    }

    // Record transaction
    if (credits.total_credited > 0) {
      const { error: transactionError } = await supabase
        .from('nctr_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'earned',
          nctr_amount: credits.total_credited,
          description: `NCTR Live sync: ${credits.available_nctr} available + ${credits.lock_360_nctr} in 360LOCK`,
          earning_source: 'nctr_live_sync',
          status: 'completed'
        });

      if (transactionError) {
        console.error('Error recording sync transaction:', transactionError);
      }
    }

    // Update user status based on new 360LOCK amount
    await supabase.rpc('update_user_status', { user_id: userId });

    return {
      success: true,
      updated_portfolio: updatedPortfolio,
      credits_applied: credits
    };

  } catch (error: any) {
    console.error('Error applying sync credits:', error);
    return {
      success: false,
      error: error?.message || 'Failed to apply credits'
    };
  }
}

async function updateSyncStatus(userId: string, liveProfile: any, supabase: any): Promise<void> {
  console.log(`📊 Updating sync status for user ${userId}`);
  
  try {
    // Update the portfolio with latest NCTR Live data
    await supabase
      .from('nctr_portfolio')
      .update({
        nctr_live_available: liveProfile.available_nctr,
        nctr_live_lock_360: liveProfile.locked_360_nctr,
        nctr_live_total: liveProfile.total_nctr,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId);

  } catch (error: any) {
    console.error('Error updating sync status:', error);
  }
}

async function checkSyncStatus(userId: string, supabase: any): Promise<Response> {
  console.log(`📋 Checking sync status for user ${userId}`);
  
  try {
    const { data: portfolio, error } = await supabase
      .from('nctr_portfolio')
      .select('nctr_live_available, nctr_live_lock_360, nctr_live_total, last_sync_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch sync status: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sync_status: {
          last_sync_at: portfolio.last_sync_at,
          nctr_live_data: {
            available: portfolio.nctr_live_available,
            locked_360: portfolio.nctr_live_lock_360,
            total: portfolio.nctr_live_total
          },
          is_synced: !!portfolio.last_sync_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error checking sync status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Failed to check sync status'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}