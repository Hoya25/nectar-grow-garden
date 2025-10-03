import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Loyalize webhook IP whitelist
const LOYALIZE_IP_WHITELIST = ['34.171.245.170']

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
    // IP Whitelist check for Loyalize webhooks
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown'
    
    console.log('📍 Webhook request from IP:', clientIP)
    
    if (!LOYALIZE_IP_WHITELIST.includes(clientIP)) {
      console.error('❌ Unauthorized IP address:', clientIP)
      return new Response(JSON.stringify({ error: 'Unauthorized IP address' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('✅ IP whitelist check passed')
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
        // Use direct API key in Authorization header (no Bearer prefix) like v1 endpoints
        console.log(`   🔑 Using API key: ${loyalizeApiKey.substring(0, 10)}...`)
        const loyalizeResponse = await fetch(
          `https://api.loyalize.com/v2/transactions/${txnId}`,
          {
            headers: {
              'Authorization': loyalizeApiKey,
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
        let userName: string = 'Unknown User'
        
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

        // Fetch user profile for logging
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username, email')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (profile) {
          userName = profile.full_name || profile.username || profile.email?.split('@')[0] || 'Unknown User'
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
        const baseNctrReward = amount * nctrPerDollar
        
        console.log(`   💰 Base Reward: ${baseNctrReward} NCTR (${nctrPerDollar} per dollar)`)

        // Apply reward multiplier using the secure function
        const { data: rewardResult, error: rewardError } = await supabase.rpc(
          'award_affiliate_nctr',
          {
            p_user_id: userId,
            p_base_nctr_amount: baseNctrReward,
            p_earning_source: 'affiliate_purchase'
          }
        )

        if (rewardError || !rewardResult?.success) {
          console.error('   ❌ Reward calculation error:', rewardError || rewardResult)
          results.push({ transaction_id: txnId, error: 'Reward calculation failed' })
          continue
        }

        const finalNctrReward = rewardResult.multiplied_amount
        const multiplier = rewardResult.multiplier
        
        console.log(`   🎯 Final Reward: ${finalNctrReward} NCTR (${multiplier}x multiplier applied)`)

        // Transaction is already recorded by award_affiliate_nctr function
        // Just update with external transaction ID
        await supabase
          .from('nctr_transactions')
          .update({
            external_transaction_id: externalTxnId,
            purchase_amount: amount,
            partner_name: brand?.name || storeName
          })
          .eq('user_id', userId)
          .eq('earning_source', 'affiliate_purchase')
          .order('created_at', { ascending: false })
          .limit(1)

        console.log(`   ✅ SUCCESS: Credited ${finalNctrReward} NCTR to ${userName} (${userId.slice(0, 8)}...) with ${multiplier}x Wings multiplier`)
        results.push({ 
          transaction_id: txnId, 
          status: 'success',
          base_nctr: baseNctrReward,
          final_nctr: finalNctrReward,
          multiplier: multiplier,
          user_id: userId.slice(0, 8) + '...',
          user_name: userName
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
