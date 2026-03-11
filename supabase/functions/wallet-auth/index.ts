import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory nonce store with expiry (5 minutes)
const nonceStore = new Map<string, { nonce: string; createdAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [key, value] of nonceStore.entries()) {
    if (now - value.createdAt > NONCE_TTL_MS) {
      nonceStore.delete(key);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, walletAddress, signature } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // --- STEP 1: Issue a challenge nonce ---
    if (action === 'challenge') {
      cleanExpiredNonces();

      const nonce = crypto.randomUUID();
      const message = `Sign this message to authenticate with The Garden.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

      nonceStore.set(normalizedAddress, { nonce, createdAt: Date.now() });

      console.log('🔐 Challenge issued for wallet:', normalizedAddress);

      return new Response(
        JSON.stringify({ message, nonce }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- STEP 2: Verify signature and authenticate ---
    if (action === 'verify') {
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Signature is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check nonce exists and is not expired
      const storedNonce = nonceStore.get(normalizedAddress);
      if (!storedNonce) {
        return new Response(
          JSON.stringify({ error: 'No challenge found. Request a new challenge first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (Date.now() - storedNonce.createdAt > NONCE_TTL_MS) {
        nonceStore.delete(normalizedAddress);
        return new Response(
          JSON.stringify({ error: 'Challenge expired. Request a new challenge.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reconstruct the signed message
      const expectedMessage = `Sign this message to authenticate with The Garden.\n\nNonce: ${storedNonce.nonce}\nTimestamp:`;

      // Verify the signature - recover the signer address
      let recoveredAddress: string;
      try {
        // We need to verify against the full message the client signed.
        // The client signs the `message` field returned from challenge.
        // We'll accept any message containing our nonce as valid.
        recoveredAddress = ethers.verifyMessage(
          // The client sends back the original message they signed
          signature.message || '',
          signature.sig || signature
        );
      } catch (e) {
        console.error('❌ Signature verification failed:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the recovered address matches the claimed address
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        console.error('❌ Address mismatch:', recoveredAddress, '!==', walletAddress);
        nonceStore.delete(normalizedAddress);
        return new Response(
          JSON.stringify({ error: 'Signature does not match wallet address' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the signed message contains our nonce
      const signedMessage = signature.message || '';
      if (!signedMessage.includes(storedNonce.nonce)) {
        console.error('❌ Nonce mismatch in signed message');
        nonceStore.delete(normalizedAddress);
        return new Response(
          JSON.stringify({ error: 'Invalid challenge response' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Consume the nonce (one-time use)
      nonceStore.delete(normalizedAddress);

      console.log('✅ Wallet ownership verified for:', recoveredAddress);

      // Now proceed with authentication
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Find the user linked to this wallet
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();

      if (profileError || !profile) {
        console.log('ℹ️ No linked profile found for wallet:', walletAddress);
        return new Response(
          JSON.stringify({ error: 'Wallet not linked to any account', needsSignup: true, verified: true }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Found user for wallet:', profile.user_id);

      // Generate a magic link token for the verified wallet owner
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
      });

      if (authError || !authData) {
        console.error('❌ Failed to generate auth link:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to authenticate wallet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const url = new URL(authData.properties.action_link);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate authentication token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Auth token generated after signature verification');

      return new Response(
        JSON.stringify({
          success: true,
          token,
          type,
          email: profile.email,
          user_id: profile.user_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "challenge" or "verify".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Wallet auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
