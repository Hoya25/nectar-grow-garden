import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ManualCreditRequest {
  user_id: string
  purchase_amount: number
  partner_name: string
  order_id?: string
  notes?: string
  nctr_per_dollar?: number
  admin_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: ManualCreditRequest = await req.json()

    // Validate admin access
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role, access_level')
      .eq('user_id', payload.admin_id)
      .maybeSingle()

    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🛠️ Manual credit initiated by admin ${payload.admin_id.slice(0, 8)}`)

    // Get brand NCTR rate or use provided rate
    const { data: brand } = await supabase
      .from('brands')
      .select('nctr_per_dollar')
      .ilike('name', payload.partner_name)
      .maybeSingle()

    const nctrPerDollar = payload.nctr_per_dollar || brand?.nctr_per_dollar || 50
    const nctrReward = payload.purchase_amount * nctrPerDollar

    // Check for duplicate
    const externalId = `MANUAL_${payload.order_id || Date.now()}_${payload.user_id.slice(0, 8)}`
    const { data: existing } = await supabase
      .from('nctr_transactions')
      .select('id')
      .eq('external_transaction_id', externalId)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'This purchase has already been credited' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update portfolio
    const { error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        total_earned: supabase.rpc('increment', { value: nctrReward }),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payload.user_id)

    if (portfolioError) throw portfolioError

    // Create auto-lock (shopping purchases go to 90LOCK)
    const { data: lock } = await supabase
      .from('nctr_locks')
      .insert({
        user_id: payload.user_id,
        nctr_amount: nctrReward,
        lock_type: '90LOCK',
        lock_category: '90LOCK',
        commitment_days: 90,
        unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        can_upgrade: true,
        original_lock_type: '90LOCK'
      })
      .select()
      .single()

    // Record transaction
    const { data: transaction } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: payload.user_id,
        transaction_type: 'earned',
        nctr_amount: nctrReward,
        purchase_amount: payload.purchase_amount,
        partner_name: payload.partner_name,
        description: `Manual credit: ${payload.partner_name} purchase ($${payload.purchase_amount}) - ${payload.notes || 'Admin credited'}`,
        earning_source: 'manual_credit',
        external_transaction_id: externalId,
        status: 'completed'
      })
      .select()
      .single()

    // Log admin action
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: payload.admin_id,
        action: 'manual_credit',
        resource_type: 'nctr_transactions',
        resource_id: transaction.id,
        details: {
          user_id: payload.user_id,
          amount: nctrReward,
          purchase_amount: payload.purchase_amount,
          partner: payload.partner_name,
          notes: payload.notes
        }
      })

    console.log(`✅ Manually credited ${nctrReward} NCTR to user ${payload.user_id.slice(0, 8)}`)

    return new Response(
      JSON.stringify({
        success: true,
        nctr_credited: nctrReward,
        purchase_amount: payload.purchase_amount,
        lock_id: lock.id,
        transaction_id: transaction.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Manual credit error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
