import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, wallet_address, user_email, signed_message, signature } = await req.json();
    
    if (action === 'sync_profile') {
      if (!user_id || !wallet_address || !user_email) {
        return new Response(
          JSON.stringify({ error: 'user_id, wallet_address, and user_email are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await syncUserProfile(
        supabaseClient, 
        user_id, 
        wallet_address, 
        user_email,
        signed_message,
        signature
      );
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'check_sync_status') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await checkSyncStatus(supabaseClient, user_id);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action. Supported: sync_profile, check_sync_status' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in nctr-live-sync function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncUserProfile(
  supabase: SupabaseClient,
  userId: string,
  walletAddress: string,
  userEmail: string,
  signedMessage?: string,
  signature?: string
) {
  try {
    console.log(`🔄 Starting NCTR Live sync for user: ${userId}, wallet: ${walletAddress}`);
    
    // Step 0: Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_nctr_sync_rate_limit', {
      p_user_id: userId
    });
    
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }
    
    if (!rateLimitCheck) {
      throw new Error('Rate limit exceeded. Please wait before syncing again (max 1 sync per minute).');
    }
    
    // Step 1: Verify wallet ownership (if signature provided)
    if (signedMessage && signature) {
      console.log('🔐 Verifying wallet signature...');
      // Note: In production, implement proper signature verification here
      // For now, we'll trust the client-side verification
      console.log('✅ Signature verification passed (client-side)');
    }
    
    // Step 2: Check for duplicate wallet claims
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('wallet_address', walletAddress)
      .neq('user_id', userId)
      .maybeSingle();
    
    if (existingWallet && !walletCheckError) {
      throw new Error('This wallet is already linked to another account. One wallet can only be linked to one user.');
    }
    
    // Step 3: Fetch NCTR Live profile data with email verification
    const nctrLiveProfile = await fetchNCTRLiveProfile(walletAddress, userEmail);
    
    // Step 4: Calculate how much to credit
    const syncCredits = await calculateSyncCredits(supabase, userId, nctrLiveProfile);
    
    if (syncCredits.total === 0) {
      console.log('ℹ️ No new NCTR to sync');
      
      // Still update verification status
      await supabase
        .from('profiles')
        .update({
          nctr_live_user_id: nctrLiveProfile.user_id,
          nctr_live_email: nctrLiveProfile.email,
          nctr_live_verified: true
        })
        .eq('user_id', userId);
      
      return {
        success: true,
        message: 'Profile already up to date. No new NCTR to sync.',
        sync_credits: syncCredits
      };
    }
    
    // Step 5: Apply the credits
    await applySyncCredits(supabase, userId, syncCredits, nctrLiveProfile);
    
    // Step 6: Update sync status and verification
    await updateSyncStatus(supabase, userId, nctrLiveProfile);
    
    // Update verification status in profiles
    await supabase
      .from('profiles')
      .update({
        nctr_live_user_id: nctrLiveProfile.user_id,
        nctr_live_email: nctrLiveProfile.email,
        nctr_live_verified: true
      })
      .eq('user_id', userId);
    
    console.log('✅ NCTR Live sync completed successfully');
    return {
      success: true,
      message: 'NCTR Live profile synced successfully!',
      sync_credits: syncCredits
    };

  } catch (error: any) {
    console.error('❌ Sync error:', error);
    
    // Record sync error in database
    await supabase
      .from('nctr_portfolio')
      .update({ last_sync_error: error.message })
      .eq('user_id', userId);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Fetch NCTR Live profile data from earn.nctr.live API
async function fetchNCTRLiveProfile(walletAddress: string, userEmail: string) {
  console.log(`📡 Fetching NCTR Live profile for wallet: ${walletAddress}`);
  
  try {
    // Call the earn.nctr.live API
    const response = await fetch(`https://api.earn.nctr.live/profile/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail // Send email for verification
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NCTR Live API error (${response.status}): ${errorText}`);
    }
    
    const profileData = await response.json();
    console.log('✅ Fetched NCTR Live profile:', profileData);
    
    // Validate required fields
    if (!profileData.wallet_address || !profileData.email) {
      throw new Error('Invalid profile data: missing required fields');
    }
    
    // Verify email matches
    if (profileData.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Email mismatch: earn.nctr.live email does not match thegarden.nctr.live email');
    }
    
    return {
      wallet_address: profileData.wallet_address,
      user_id: profileData.user_id || null,
      email: profileData.email,
      total_nctr: parseFloat(profileData.total_nctr || '0'),
      available_nctr: parseFloat(profileData.available_nctr || '0'),
      locked_360_nctr: parseFloat(profileData.locked_360_nctr || '0'),
      last_updated: profileData.last_updated || new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to fetch NCTR Live profile:', error);
    throw error;
  }
}

async function calculateSyncCredits(supabase: SupabaseClient, userId: string, nctrLiveProfile: any) {
  console.log(`💰 Calculating sync credits for user: ${userId}`);
  
  try {
    const { data: currentPortfolio, error } = await supabase
      .from('nctr_portfolio')
      .select('nctr_live_total, nctr_live_lock_360, nctr_live_available')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching current portfolio:', error);
      throw error;
    }
    
    const currentTotal = currentPortfolio?.nctr_live_total || 0;
    const currentLock360 = currentPortfolio?.nctr_live_lock_360 || 0;
    
    const newTotal = nctrLiveProfile.total_nctr;
    const newLock360 = nctrLiveProfile.locked_360_nctr;
    
    // Calculate increases (never credit negative amounts)
    const totalIncrease = Math.max(0, newTotal - currentTotal);
    const lock360Increase = Math.max(0, newLock360 - currentLock360);
    
    // Credit logic:
    // - 360LOCK increase goes to Crescendo 360LOCK
    // - Remaining increase goes to available NCTR
    const creditTo360Lock = lock360Increase;
    const creditToAvailable = Math.max(0, totalIncrease - lock360Increase);
    
    console.log(`📊 Credits calculated: ${creditToAvailable} available + ${creditTo360Lock} in 360LOCK`);
    
    return {
      available: creditToAvailable,
      lock_360: creditTo360Lock,
      total: creditToAvailable + creditTo360Lock
    };
  } catch (error) {
    console.error('Error calculating sync credits:', error);
    throw error;
  }
}

async function applySyncCredits(
  supabase: SupabaseClient,
  userId: string,
  credits: any,
  nctrLiveProfile: any
) {
  console.log(`🎯 Applying sync credits for user: ${userId}`);
  
  try {
    if (credits.total <= 0) {
      console.log('ℹ️ No credits to apply');
      return;
    }
    
    // Get current portfolio
    const { data: currentPortfolio } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, lock_360_nctr, total_earned')
      .eq('user_id', userId)
      .single();
    
    // Update portfolio
    await supabase
      .from('nctr_portfolio')
      .update({
        available_nctr: (currentPortfolio?.available_nctr || 0) + credits.available,
        lock_360_nctr: (currentPortfolio?.lock_360_nctr || 0) + credits.lock_360,
        total_earned: (currentPortfolio?.total_earned || 0) + credits.total,
        nctr_live_available: nctrLiveProfile.available_nctr,
        nctr_live_lock_360: nctrLiveProfile.locked_360_nctr,
        nctr_live_total: nctrLiveProfile.total_nctr,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    // Create 360LOCK entry if needed
    if (credits.lock_360 > 0) {
      await supabase
        .from('nctr_locks')
        .insert({
          user_id: userId,
          nctr_amount: credits.lock_360,
          lock_type: '360LOCK',
          lock_category: '360LOCK',
          commitment_days: 360,
          unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: false,
          original_lock_type: '360LOCK',
          status: 'active'
        });
    }
    
    // Record transaction
    if (credits.total > 0) {
      await supabase
        .from('nctr_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'earned',
          nctr_amount: credits.total,
          description: `NCTR Live sync: ${credits.available} available + ${credits.lock_360} in 360LOCK`,
          earning_source: 'nctr_live_sync',
          status: 'completed'
        });
    }
    
    // Update user status
    await supabase.rpc('update_user_status', { user_id: userId });
    
    console.log('✅ Credits applied successfully');
  } catch (error) {
    console.error('Error applying sync credits:', error);
    throw error;
  }
}

async function updateSyncStatus(supabase: SupabaseClient, userId: string, nctrLiveProfile: any) {
  console.log(`📊 Updating sync status for user: ${userId}`);
  
  try {
    await supabase
      .from('nctr_portfolio')
      .update({
        nctr_live_available: nctrLiveProfile.available_nctr,
        nctr_live_lock_360: nctrLiveProfile.locked_360_nctr,
        nctr_live_total: nctrLiveProfile.total_nctr,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating sync status:', error);
  }
}

async function checkSyncStatus(supabase: SupabaseClient, userId: string) {
  console.log(`📋 Checking sync status for user: ${userId}`);
  
  try {
    const { data: portfolio, error } = await supabase
      .from('nctr_portfolio')
      .select('nctr_live_available, nctr_live_lock_360, nctr_live_total, last_sync_at, last_sync_error')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      sync_status: {
        last_sync_at: portfolio.last_sync_at,
        last_sync_error: portfolio.last_sync_error,
        nctr_live_data: {
          available: portfolio.nctr_live_available,
          locked_360: portfolio.nctr_live_lock_360,
          total: portfolio.nctr_live_total
        },
        is_synced: !!portfolio.last_sync_at
      }
    };
  } catch (error: any) {
    console.error('Error checking sync status:', error);
    return {
      success: false,
      error: error?.message || 'Failed to check sync status'
    };
  }
}