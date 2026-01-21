import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface PurchasePayload {
  user_id: string
  purchase_amount: number
  partner_name: string
  brand_id?: string
  tracking_id: string
  external_transaction_id?: string
  nctr_per_dollar?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔐 Processing purchase request from Xano...')

    // Verify webhook secret
    const webhookSecret = Deno.env.get('XANO_WEBHOOK_SECRET')
    const providedSecret = req.headers.get('x-webhook-secret')
    
    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error('❌ Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: PurchasePayload = await req.json()
    console.log('📦 Purchase payload:', JSON.stringify(payload, null, 2))

    const {
      user_id,
      purchase_amount,
      partner_name,
      brand_id,
      tracking_id,
      external_transaction_id,
      nctr_per_dollar = 25 // Default 25 NCTR per dollar
    } = payload

    // Validate required fields
    if (!user_id || !purchase_amount || !partner_name) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, purchase_amount, partner_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`💰 Processing $${purchase_amount} purchase for user ${user_id.slice(0, 8)}...`)

    // Calculate base NCTR reward
    const baseNCTR = purchase_amount * nctr_per_dollar
    console.log(`🎁 Base NCTR reward: ${baseNCTR}`)

    // Get user's current status to apply multiplier
    const { data: portfolio, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .select('opportunity_status')
      .eq('user_id', user_id)
      .single()

    if (portfolioError) {
      console.error('❌ Error fetching portfolio:', portfolioError)
      throw new Error(`Portfolio not found: ${portfolioError.message}`)
    }

    console.log(`👤 User status: ${portfolio.opportunity_status}`)

    // Get status multiplier
    const { data: statusLevel } = await supabase
      .from('opportunity_status_levels')
      .select('reward_multiplier')
      .eq('status_name', portfolio.opportunity_status)
      .single()

    const multiplier = statusLevel?.reward_multiplier || 1.0
    const finalNCTR = baseNCTR * multiplier
    console.log(`✨ Final NCTR with ${multiplier}x multiplier: ${finalNCTR}`)

    // Check for duplicate transaction
    if (external_transaction_id) {
      const { data: existing } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('external_transaction_id', external_transaction_id)
        .maybeSingle()

      if (existing) {
        console.log('⚠️ Transaction already processed:', external_transaction_id)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Transaction already processed',
            transaction_id: existing.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update portfolio total_earned
    const { error: updateError } = await supabase
      .from('nctr_portfolio')
      .update({
        total_earned: supabase.rpc('increment', { x: finalNCTR }),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)

    if (updateError) {
      console.error('❌ Error updating portfolio:', updateError)
      throw new Error(`Failed to update portfolio: ${updateError.message}`)
    }

    console.log('✅ Portfolio updated')

    // Create 90LOCK (shopping purchases auto-lock for 90 days)
    const unlockDate = new Date()
    unlockDate.setDate(unlockDate.getDate() + 90)

    const { data: lock, error: lockError } = await supabase
      .from('nctr_locks')
      .insert({
        user_id,
        nctr_amount: finalNCTR,
        lock_type: '90LOCK',
        lock_category: '90LOCK',
        commitment_days: 90,
        unlock_date: unlockDate.toISOString(),
        can_upgrade: true,
        original_lock_type: '90LOCK'
      })
      .select()
      .single()

    if (lockError) {
      console.error('❌ Error creating lock:', lockError)
      throw new Error(`Failed to create lock: ${lockError.message}`)
    }

    console.log(`🔒 Created 90LOCK: ${lock.id}`)

    // Record transaction
    const { data: transaction, error: txnError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id,
        transaction_type: 'earned',
        nctr_amount: finalNCTR,
        purchase_amount,
        partner_name,
        description: `${partner_name} purchase: $${purchase_amount} (${finalNCTR} NCTR with ${multiplier}x Crescendo multiplier in 90LOCK)`,
        earning_source: 'affiliate_purchase',
        external_transaction_id,
        status: 'completed'
      })
      .select()
      .single()

    if (txnError) {
      console.error('❌ Error creating transaction:', txnError)
      throw new Error(`Failed to create transaction: ${txnError.message}`)
    }

    console.log(`📝 Transaction recorded: ${transaction.id}`)

    // Update user status (triggers automatic recalculation)
    const { data: statusUpdate } = await supabase.rpc('update_user_status', {
      user_id
    })

    console.log('🎖️ Status update:', statusUpdate)

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        lock_id: lock.id,
        nctr_earned: finalNCTR,
        base_nctr: baseNCTR,
        multiplier,
        status_update: statusUpdate,
        message: `Successfully processed $${purchase_amount} purchase. Earned ${finalNCTR} NCTR (${multiplier}x multiplier)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error processing purchase:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
