import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API secret
    const apiSecret = req.headers.get('x-api-secret');
    const expectedSecret = Deno.env.get('GARDEN_API_SECRET');
    
    if (!apiSecret || apiSecret !== expectedSecret) {
      console.log('Unauthorized: Invalid or missing API secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API secret' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, created_at')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // User not found
    if (!profile) {
      return new Response(
        JSON.stringify({ 
          exists: false,
          profile_complete: false,
          user_id: null,
          created_at: null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if profile is complete (full_name and email must be non-null)
    const profileComplete = !!(profile.full_name && profile.email);

    // Return success response
    return new Response(
      JSON.stringify({
        exists: true,
        profile_complete: profileComplete,
        user_id: profile.user_id,
        created_at: profile.created_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-user-profile function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
