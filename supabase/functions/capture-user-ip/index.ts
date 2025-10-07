import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    // Get IP from request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Prioritize IPs: CF connecting IP > X-Real-IP > X-Forwarded-For
    const ipAddress = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || 'unknown';

    console.log('📍 Capturing IP:', {
      ip: ipAddress,
      forwardedFor,
      realIp,
      cfConnectingIp
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const { action } = await req.json();
    
    // Update profile with IP address
    if (action === 'signup') {
      // First signup - set signup_ip
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          signup_ip: ipAddress,
          last_login_ip: ipAddress 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Error updating signup IP:', updateError);
        throw updateError;
      }

      console.log('✅ Signup IP captured:', ipAddress, 'for user:', user.id);

      // Check for duplicate IPs immediately
      const { data: duplicates, error: dupError } = await supabase
        .from('profiles')
        .select('user_id, email, created_at')
        .eq('signup_ip', ipAddress)
        .neq('user_id', user.id);

      if (!dupError && duplicates && duplicates.length > 0) {
        console.warn('⚠️ DUPLICATE IP DETECTED:', {
          ip: ipAddress,
          newUser: user.id,
          existingAccounts: duplicates.length,
          accounts: duplicates
        });

        // Log to security audit
        await supabase
          .from('security_audit_log')
          .insert({
            user_id: user.id,
            action_type: 'duplicate_ip_signup',
            resource_table: 'profiles',
            resource_id: user.id,
            risk_level: 'high'
          });
      }
      
    } else if (action === 'login') {
      // Login - update last_login_ip only
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_login_ip: ipAddress })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Error updating login IP:', updateError);
        throw updateError;
      }

      console.log('✅ Login IP captured:', ipAddress, 'for user:', user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ip: ipAddress,
        action 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in capture-user-ip:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});