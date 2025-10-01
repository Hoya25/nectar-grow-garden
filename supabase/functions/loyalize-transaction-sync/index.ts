import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeTransaction {
  // Based on official Loyalize v2 API documentation
  id: number
  sid: string | null // Our tracking ID (sub-ID)
  shopperId: string // The 'cp' parameter we passed (user ID)
  storeId: number
  storeName: string
  orderNumber: string
  status: 'PENDING' | 'AVAILABLE' | 'PAYMENT_INITIATED' | 'PAID' | 'NON_COMMISSIONABLE'
  currency: string
  saleAmount: number // Purchase amount
  shopperCommission: number // Cashback/commission amount
  tier: string
  purchaseDate: string
  pendingDate: string
  availabilityDate: string | null
  paymentDate: string | null
  adminComment: string | null
  lastUpdate: string
  isSkuDetailsBrand: boolean
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
        // Fetch full transaction details from Loyalize v2 API
        console.log(`   🔑 Using API key: ${loyalizeApiKey.substring(0, 10)}...`)
        const loyalizeResponse = await fetch(
          `https://api.loyalize.com/v2/transactions/${txnId}`,
          {
            headers: {
              'Authorization': `Bearer ${loyalizeApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        console.log(`   📡 Response status: ${loyalizeResponse.status}`)

        if (!loyalizeResponse.ok) {
          console.error(`❌ Failed to fetch transaction ${txnId}: ${loyalizeResponse.status}`)
          results.push({ transaction_id: txnId, error: 'Failed to fetch from Loyalize API' })
          continue
        }

        const transaction: LoyalizeTransaction = await loyalizeResponse.json()
        console.log(`✅ Transaction data:`, JSON.stringify(transaction, null, 2))

        // Extract transaction details per Loyalize v2 API spec
        const transactionId = transaction.id
        const storeId = transaction.storeId
        const storeName = transaction.storeName
        const amount = transaction.saleAmount || 0
        const cashback = transaction.shopperCommission || 0
        const status = transaction.status
        const shopperId = transaction.shopperId // The user_id we passed as 'cp'
        
        // Extract tracking ID from 'sid' field (this is what we passed)
        const trackingId = transaction.sid

        console.log(`\n💰 Transaction Details:`)
        console.log(`   ID: ${transactionId}`)
        console.log(`   Store: ${storeName} (ID: ${storeId})`)
        console.log(`   Amount: $${amount}`)
        console.log(`   Commission: $${cashback}`)
        console.log(`   Status: ${status}`)
        console.log(`   Shopper ID (cp): ${shopperId}`)
        console.log(`   Tracking ID (sid): ${trackingId || 'MISSING ⚠️'}`)

        if (!trackingId && !shopperId) {
          console.error('❌ Missing both tracking ID and shopper ID - cannot match to user')
          results.push({ transaction_id: txnId, error: 'Missing tracking identifiers' })
          continue
        }

        // Try to find user by tracking ID first, fallback to shopper ID
        console.log(`   🔍 Looking up user...`)
        
        let userId: string | null = null
        
        // Try tracking ID lookup first
        if (trackingId) {
          const { data: mapping } = await supabase
            .from('affiliate_link_mappings')
            .select('user_id, brand_id')
            .eq('tracking_id', trackingId)
            .maybeSingle()
          
          if (mapping) {
            userId = mapping.user_id
            console.log(`   ✅ Found user via tracking ID: ${userId.slice(0, 8)}...`)
          }
        }
        
        // Fallback to shopper ID (which is the user_id we passed as 'cp')
        if (!userId && shopperId) {
          console.log(`   🔍 Trying shopper ID fallback: ${shopperId}`)
          userId = shopperId
          console.log(`   ✅ Using shopper ID as user ID: ${userId.slice(0, 8)}...`)
        }
        
        if (!userId) {
          console.error(`   ❌ Could not determine user ID`)
          results.push({ transaction_id: txnId, error: 'User not found' })
          continue
        }

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
