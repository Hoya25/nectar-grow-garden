import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔄 Starting password migration for wallet: ${walletAddress}`);

    // Generate deterministic password using SHA-256
    // Password must contain lowercase, uppercase, and numbers for Supabase
    const encoder = new TextEncoder();
    const data = encoder.encode(walletAddress.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // Create password with mixed case to meet Supabase requirements
    const deterministicPassword = `Wallet${hashHex.slice(0, 28)}9X`;

    console.log(`🔐 Generated deterministic password for wallet`);

    // Find user by wallet email
    const walletEmail = `${walletAddress.toLowerCase()}@wallet.base.app`;
    
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (searchError) {
      console.error('❌ Error searching for user:', searchError);
      return new Response(
        JSON.stringify({ error: 'Failed to search for user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = users.users.find(u => u.email === walletEmail);

    if (!user) {
      console.log('ℹ️ No existing user found - this is a new wallet');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No migration needed - new user',
          requiresSignup: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update user password to deterministic scheme
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: deterministicPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎉 Password migrated successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password migrated successfully',
        userId: user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
