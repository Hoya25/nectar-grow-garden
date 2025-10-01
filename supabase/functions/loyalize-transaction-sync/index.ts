import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeWebhookPayload {
  // Adjust these fields based on actual Loyalize webhook structure
  transaction_id?: string | number
  id?: string | number
  store_id?: number
  store_name?: string
  merchant_name?: string
  amount?: number
  purchase_amount?: number
  cashback?: number
  commission?: number
  status?: string
  user_tracking_id?: string
  tracking_id?: string
  click_id?: string
  subid?: string
  created_at?: string
  updated_at?: string
  event_type?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔔 Loyalize webhook received!')
    console.log(`   Method: ${req.method}`)
    console.log(`   Headers:`, Object.fromEntries(req.headers.entries()))

    // Parse incoming webhook payload
    const payload: LoyalizeWebhookPayload = await req.json()
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract transaction data with multiple possible field names
    const transactionId = payload.transaction_id || payload.id
    const storeId = payload.store_id
    const storeName = payload.store_name || payload.merchant_name
    const amount = payload.amount || payload.purchase_amount || 0
    const cashback = payload.cashback || payload.commission || 0
    const status = payload.status
    
    // Try multiple possible tracking ID field names
    const trackingId = payload.user_tracking_id || 
                       payload.tracking_id || 
                       payload.click_id || 
                       payload.subid

    console.log('\n📊 Parsed webhook data:')
    console.log(`   Transaction ID: ${transactionId}`)
    console.log(`   Store: ${storeName} (ID: ${storeId})`)
    console.log(`   Amount: $${amount}`)
    console.log(`   Cashback: $${cashback}`)
    console.log(`   Status: ${status}`)
    console.log(`   Tracking ID: ${trackingId || 'MISSING ⚠️'}`)

    // Validate required fields
    if (!transactionId) {
      console.error('❌ Missing transaction ID in webhook payload')
      return new Response(
        JSON.stringify({ 
          error: 'Missing transaction ID',
          received_payload: payload 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!trackingId) {
      console.error('❌ Missing tracking ID - cannot match to user')
      return new Response(
        JSON.stringify({ 
          error: 'Missing tracking ID field',
          note: 'Check if Loyalize is configured to send tracking IDs',
          received_payload: payload 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find matching user via tracking ID
    console.log(`\n🔍 Looking up tracking ID: ${trackingId}`)
    
    const { data: mapping, error: mappingError } = await supabase
      .from('affiliate_link_mappings')
      .select('user_id, brand_id')
      .eq('tracking_id', trackingId)
      .maybeSingle()
    
    if (mappingError) {
      console.error('❌ Database lookup error:', mappingError)
      throw mappingError
    }
    
    if (!mapping) {
      console.error(`❌ No user mapping found for tracking ID: ${trackingId}`)
      return new Response(
        JSON.stringify({ 
          error: 'Tracking ID not found',
          tracking_id: trackingId,
          note: 'User may not have clicked through your affiliate link'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = mapping.user_id
    console.log(`✅ Found user: ${userId.slice(0, 8)}...`)
    console.log(`   Brand ID: ${mapping.brand_id?.slice(0, 8) || 'N/A'}...`)

    // Check if already credited
    const externalTxnId = `LOYALIZE_${transactionId}`
    const { data: existing } = await supabase
      .from('nctr_transactions')
      .select('id')
      .eq('external_transaction_id', externalTxnId)
      .maybeSingle()

    if (existing) {
      console.log('ℹ️ Transaction already credited - returning success')
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Transaction already processed',
          transaction_id: transactionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get brand info for reward calculation
    const { data: brand } = await supabase
      .from('brands')
      .select('name, nctr_per_dollar')
      .eq('loyalize_id', storeId?.toString())
      .maybeSingle()

    const nctrPerDollar = brand?.nctr_per_dollar || 50
    const nctrReward = amount * nctrPerDollar
    
    console.log(`\n💰 Calculating reward:`)
    console.log(`   Brand: ${brand?.name || storeName}`)
    console.log(`   Rate: ${nctrPerDollar} NCTR per dollar`)
    console.log(`   Reward: ${nctrReward} NCTR`)

    // Credit the user - get current portfolio
    const { data: currentPortfolio, error: fetchError } = await supabase
      .from('nctr_portfolio')
      .select('total_earned')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (fetchError) {
      console.error('❌ Error fetching portfolio:', fetchError)
      throw fetchError
    }
    
    if (!currentPortfolio) {
      console.error('❌ Portfolio not found for user')
      throw new Error('User portfolio not found')
    }
    
    const newTotalEarned = (currentPortfolio.total_earned || 0) + nctrReward
    
    // Update portfolio
    const { error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .update({
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (portfolioError) {
      console.error('❌ Error updating portfolio:', portfolioError)
      throw portfolioError
    }

    // Create auto-lock (shopping purchases go to 90LOCK)
    await supabase
      .from('nctr_locks')
      .insert({
        user_id: userId,
        nctr_amount: nctrReward,
        lock_type: '90LOCK',
        lock_category: '90LOCK',
        commitment_days: 90,
        unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        can_upgrade: true,
        original_lock_type: '90LOCK'
      })

    // Record transaction
    await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        nctr_amount: nctrReward,
        purchase_amount: amount,
        partner_name: brand?.name || storeName,
        description: `${brand?.name || storeName} purchase via Loyalize ($${amount})`,
        earning_source: 'affiliate_purchase',
        external_transaction_id: externalTxnId,
        status: 'completed'
      })

    console.log(`\n✅ SUCCESS: Credited ${nctrReward} NCTR to user ${userId.slice(0, 8)}...`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction processed successfully',
        transaction_id: transactionId,
        user_id: userId.slice(0, 8) + '...',
        nctr_credited: nctrReward
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('\n❌ Webhook processing error:', error)
    console.error('   Error details:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
