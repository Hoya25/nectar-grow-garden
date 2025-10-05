import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, opportunity_id } = await req.json();

    if (!user_id || !opportunity_id) {
      throw new Error('Missing required fields: user_id and opportunity_id');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get opportunity details
    const { data: opportunity, error: oppError } = await supabase
      .from('earning_opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (oppError || !opportunity) {
      throw new Error('Opportunity not found');
    }

    // Award NCTR using the award_affiliate_nctr function
    const { data: awardResult, error: awardError } = await supabase.rpc(
      'award_affiliate_nctr',
      {
        p_user_id: user_id,
        p_base_nctr_amount: opportunity.nctr_reward || 0,
        p_earning_source: 'free_trial'
      }
    );

    if (awardError) throw awardError;

    console.log('✅ Free trial completed and credited:', awardResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credited: awardResult.multiplied_amount,
        message: 'Free trial completion credited'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Free trial webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
