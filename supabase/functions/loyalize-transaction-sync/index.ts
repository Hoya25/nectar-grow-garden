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
    const payload: any = await req.json()
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Loyalize sends notification webhooks with transaction IDs
    // Format: { body: { eventType: "NEW_TRANSACTION", data: { transactions: [1, 2, 3] } } }
    const eventType = payload.body?.eventType
    const transactionIds = payload.body?.data?.transactions || []

    console.log(`\n📨 Event: ${eventType}`)
    console.log(`   Transaction IDs: [${transactionIds.join(', ')}]`)

    if (!transactionIds || transactionIds.length === 0) {
      console.error('❌ No transaction IDs in webhook payload')
      return new Response(
        JSON.stringify({ 
          error: 'No transaction IDs found',
          received_payload: payload 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process each transaction ID
    const results = []
    for (const txnId of transactionIds) {
      console.log(`\n🔍 Fetching transaction #${txnId} from Loyalize API...`)
      
      try {
        // Fetch full transaction details from Loyalize API
        const loyalizeResponse = await fetch(
          `https://api.loyalize.io/v1/transactions/${txnId}`,
          {
            headers: {
              'Authorization': `Bearer ${loyalizeApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!loyalizeResponse.ok) {
          console.error(`❌ Failed to fetch transaction ${txnId}: ${loyalizeResponse.status}`)
          results.push({ transaction_id: txnId, error: 'Failed to fetch from Loyalize API' })
          continue
        }

        const transaction = await loyalizeResponse.json()
        console.log(`✅ Transaction data:`, JSON.stringify(transaction, null, 2))

        // Extract transaction details
        const transactionId = transaction.id
        const storeId = transaction.store_id
        const storeName = transaction.store_name || transaction.merchant_name
        const amount = transaction.amount || transaction.purchase_amount || 0
        const cashback = transaction.cashback || transaction.commission || 0
        const status = transaction.status
        
        // Extract tracking ID
        const trackingId = transaction.user_tracking_id || 
                          transaction.tracking_id || 
                          transaction.click_id || 
                          transaction.subid ||
                          transaction.custom_data?.tracking_id

        console.log(`\n💰 Transaction Details:`)
        console.log(`   ID: ${transactionId}`)
        console.log(`   Store: ${storeName} (ID: ${storeId})`)
        console.log(`   Amount: $${amount}`)
        console.log(`   Cashback: $${cashback}`)
        console.log(`   Status: ${status}`)
        console.log(`   Tracking ID: ${trackingId || 'MISSING ⚠️'}`)

        if (!trackingId) {
          console.error('❌ Missing tracking ID - cannot match to user')
          results.push({ transaction_id: txnId, error: 'Missing tracking ID' })
          continue
        }

        // Find matching user via tracking ID
        console.log(`   🔍 Looking up tracking ID: ${trackingId}`)
        
        const { data: mapping, error: mappingError } = await supabase
          .from('affiliate_link_mappings')
          .select('user_id, brand_id')
          .eq('tracking_id', trackingId)
          .maybeSingle()
        
        if (mappingError) {
          console.error('   ❌ Database lookup error:', mappingError)
          results.push({ transaction_id: txnId, error: 'Database error' })
          continue
        }
        
        if (!mapping) {
          console.error(`   ❌ No user mapping found for tracking ID: ${trackingId}`)
          results.push({ transaction_id: txnId, error: 'Tracking ID not found' })
          continue
        }

        const userId = mapping.user_id
        console.log(`   ✅ Found user: ${userId.slice(0, 8)}...`)

        // Check if already credited
        const externalTxnId = `LOYALIZE_${transactionId}`
        const { data: existing } = await supabase
          .from('nctr_transactions')
          .select('id')
          .eq('external_transaction_id', externalTxnId)
          .maybeSingle()

        if (existing) {
          console.log('   ℹ️ Transaction already credited')
          results.push({ transaction_id: txnId, status: 'already_processed' })
          continue
        }

        // Get brand info for reward calculation
        const { data: brand } = await supabase
          .from('brands')
          .select('name, nctr_per_dollar')
          .eq('loyalize_id', storeId?.toString())
          .maybeSingle()

        const nctrPerDollar = brand?.nctr_per_dollar || 50
        const nctrReward = amount * nctrPerDollar
        
        console.log(`   💰 Reward: ${nctrReward} NCTR (${nctrPerDollar} per dollar)`)

        // Credit the user
        const { data: currentPortfolio, error: fetchError } = await supabase
          .from('nctr_portfolio')
          .select('total_earned')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (fetchError || !currentPortfolio) {
          console.error('   ❌ Portfolio error:', fetchError)
          results.push({ transaction_id: txnId, error: 'Portfolio error' })
          continue
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
          console.error('   ❌ Portfolio update error:', portfolioError)
          results.push({ transaction_id: txnId, error: 'Update failed' })
          continue
        }

        // Create auto-lock
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

        console.log(`   ✅ SUCCESS: Credited ${nctrReward} NCTR`)
        results.push({ 
          transaction_id: txnId, 
          status: 'success',
          nctr_credited: nctrReward,
          user_id: userId.slice(0, 8) + '...'
        })

      } catch (error) {
        console.error(`   ❌ Error processing transaction ${txnId}:`, error)
        results.push({ transaction_id: txnId, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed',
        results
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
