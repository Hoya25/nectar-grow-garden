import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeTransaction {
  id: number
  sid: string | null
  shopperId: string
  storeId: number
  storeName: string
  orderNumber: string
  status: 'PENDING' | 'AVAILABLE' | 'PAYMENT_INITIATED' | 'PAID' | 'NON_COMMISSIONABLE'
  currency: string
  saleAmount: string
  shopperCommission: string
  tier: string
  purchaseDate: string
  pendingDate: string
  availabilityDate: string | null
  paymentDate: string | null
  lastUpdate: string
}

type MatchMethod = 'exact' | 'user_id_prefix' | 'shopper_id' | 'unmatched'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 Manual Loyalize transaction sync started')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch transactions from Loyalize v2 API
    console.log('🔍 Fetching transactions from Loyalize v2 API')
    const transactionsResponse = await fetch(
      'https://api.loyalize.com/v2/transactions?size=50&page=0&sort=purchaseDate,desc',
      {
        method: 'GET',
        headers: {
          'Authorization': loyalizeApiKey,
          'Content-Type': 'application/json',
        }
      }
    )

    console.log(`📡 Loyalize API response status: ${transactionsResponse.status}`)

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text()
      console.error(`❌ Loyalize API failed: ${errorText}`)
      throw new Error(`Loyalize API error: ${transactionsResponse.status}`)
    }

    const transactionsData = await transactionsResponse.json()
    const transactions: LoyalizeTransaction[] = transactionsData.content || []
    console.log(`✅ Retrieved ${transactions.length} transactions from Loyalize API`)

    const results = {
      checked: 0,
      credited: 0,
      already_processed: 0,
      failed: 0,
      unmatched: 0,
      match_methods: { exact: 0, user_id_prefix: 0, shopper_id: 0, unmatched: 0 } as Record<MatchMethod, number>,
      details: [] as any[]
    }

    for (const transaction of transactions) {
      results.checked++
      
      const transactionId = transaction.id
      const storeId = transaction.storeId
      const storeName = transaction.storeName
      const amount = parseFloat(transaction.saleAmount || '0')
      const cashback = parseFloat(transaction.shopperCommission || '0')
      const status = transaction.status
      const shopperId = transaction.shopperId
      const trackingId = transaction.sid

      console.log(`\n💰 Processing Transaction #${transactionId}`)
      console.log(`   Store: ${storeName} (ID: ${storeId})`)
      console.log(`   Amount: $${amount}, Commission: $${cashback}, Status: ${status}`)
      console.log(`   Shopper ID: ${shopperId}, Tracking ID: ${trackingId || 'MISSING'}`)

      try {
        // Check if already credited
        const externalTxnId = `LOYALIZE_${transactionId}`
        const { data: existing } = await supabase
          .from('nctr_transactions')
          .select('id')
          .eq('external_transaction_id', externalTxnId)
          .maybeSingle()

        if (existing) {
          console.log('   ℹ️ Transaction already credited')
          results.already_processed++
          results.details.push({ transaction_id: transactionId, status: 'already_processed' })
          continue
        }

        // Also check unmatched_transactions to avoid re-storing
        const { data: existingUnmatched } = await supabase
          .from('unmatched_transactions')
          .select('id, matched')
          .eq('loyalize_transaction_id', transactionId.toString())
          .maybeSingle()

        // --- MULTI-STRATEGY USER MATCHING ---
        let userId: string | null = null
        let matchMethod: MatchMethod = 'unmatched'

        // Strategy 1: Exact tracking_id match
        if (trackingId) {
          const { data: mapping } = await supabase
            .from('affiliate_link_mappings')
            .select('user_id')
            .eq('tracking_id', trackingId)
            .maybeSingle()
          
          if (mapping) {
            userId = mapping.user_id
            matchMethod = 'exact'
            console.log(`   ✅ [exact] Found user via tracking ID: ${userId.slice(0, 8)}...`)
          }
        }

        // Strategy 2: Extract user_id prefix from tracking_id format "userId8chars_brandId8chars_timestamp"
        if (!userId && trackingId) {
          const parts = trackingId.split('_')
          if (parts.length >= 2) {
            const userPrefix = parts[0]
            // Only try if it looks like a UUID prefix (8 hex chars)
            if (/^[0-9a-f]{8}$/i.test(userPrefix)) {
              console.log(`   🔍 [user_id_prefix] Trying prefix match: ${userPrefix}...`)
              const { data: mappings } = await supabase
                .from('affiliate_link_mappings')
                .select('user_id')
                .ilike('user_id', `${userPrefix}%`)
                .limit(1)
              
              if (mappings && mappings.length > 0) {
                userId = mappings[0].user_id
                matchMethod = 'user_id_prefix'
                console.log(`   ✅ [user_id_prefix] Found user: ${userId.slice(0, 8)}...`)
              }
            }
          }
        }

        // Strategy 3: Use shopperId (cp parameter = user UUID)
        if (!userId && shopperId) {
          // Check if shopperId looks like a UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidRegex.test(shopperId)) {
            console.log(`   🔍 [shopper_id] Trying shopperId as user_id: ${shopperId.slice(0, 8)}...`)
            const { data: mapping } = await supabase
              .from('affiliate_link_mappings')
              .select('user_id')
              .eq('user_id', shopperId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (mapping) {
              userId = mapping.user_id
              matchMethod = 'shopper_id'
              console.log(`   ✅ [shopper_id] Found user: ${userId.slice(0, 8)}...`)
            } else {
              // shopperId is a UUID but not in mappings — still use it if the user exists
              const { data: profile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', shopperId)
                .maybeSingle()
              
              if (profile) {
                userId = shopperId
                matchMethod = 'shopper_id'
                console.log(`   ✅ [shopper_id] Found user via profiles: ${userId.slice(0, 8)}...`)
              }
            }
          }
        }

        // Log match method
        results.match_methods[matchMethod]++

        // If no match, store in unmatched_transactions
        if (!userId) {
          console.log(`   ⚠️ [unmatched] No user found — storing for admin review`)
          results.unmatched++

          if (!existingUnmatched) {
            await supabase
              .from('unmatched_transactions')
              .upsert({
                loyalize_transaction_id: transactionId.toString(),
                tracking_id: trackingId || null,
                shopper_id: shopperId || null,
                merchant_name: storeName,
                amount: amount,
                commission: cashback,
                currency: transaction.currency || 'USD',
                purchase_date: transaction.purchaseDate || null,
                raw_data: transaction as any,
                matched: false,
              }, { onConflict: 'loyalize_transaction_id' })
          }

          results.details.push({
            transaction_id: transactionId,
            status: 'unmatched',
            tracking_id: trackingId || 'MISSING',
            shopper_id: shopperId || 'MISSING',
            match_method: matchMethod
          })
          continue
        }

        // --- CREDIT THE USER ---
        // Get brand info for reward calculation
        const { data: brand } = await supabase
          .from('brands')
          .select('name, nctr_per_dollar')
          .eq('loyalize_id', storeId?.toString())
          .maybeSingle()

        const nctrPerDollar = brand?.nctr_per_dollar || 50
        const baseNctrReward = amount * nctrPerDollar
        
        console.log(`   💰 Base Reward: ${baseNctrReward} NCTR (${nctrPerDollar}/dollar)`)

        // Apply reward multiplier using the secure function
        const { data: rewardResult, error: rewardError } = await supabase.rpc(
          'award_affiliate_nctr',
          {
            p_user_id: userId,
            p_base_nctr_amount: baseNctrReward,
            p_earning_source: 'affiliate_purchase',
            p_brand_name: brand?.name || storeName,
            p_purchase_amount: amount
          }
        )

        if (rewardError || !rewardResult?.success) {
          console.error('   ❌ Reward calculation error:', rewardError || rewardResult)
          results.failed++
          results.details.push({
            transaction_id: transactionId,
            status: 'failed',
            match_method: matchMethod,
            error: rewardError?.message || 'award_affiliate_nctr failed'
          })
          continue
        }

        const finalNctrReward = rewardResult.multiplied_amount
        const multiplier = rewardResult.multiplier

        // Update the transaction record with external ID
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

        // If this was previously in unmatched_transactions, mark it matched
        if (existingUnmatched) {
          await supabase
            .from('unmatched_transactions')
            .update({ matched: true, matched_user_id: userId, matched_at: new Date().toISOString() })
            .eq('loyalize_transaction_id', transactionId.toString())
        }

        console.log(`   ✅ SUCCESS [${matchMethod}]: Credited ${finalNctrReward} NCTR (${multiplier}x multiplier)`)
        results.credited++
        results.details.push({
          transaction_id: transactionId,
          status: 'credited',
          match_method: matchMethod,
          base_nctr: baseNctrReward,
          final_nctr: finalNctrReward,
          multiplier: multiplier,
          user_id: userId.slice(0, 8) + '...'
        })

      } catch (error) {
        console.error(`   ❌ Error processing transaction ${transactionId}:`, error)
        results.failed++
        results.details.push({
          transaction_id: transactionId,
          status: 'failed',
          error: (error as Error).message
        })
      }
    }

    console.log('\n📊 Sync Summary:')
    console.log(`   Checked: ${results.checked}`)
    console.log(`   Credited: ${results.credited}`)
    console.log(`   Already Processed: ${results.already_processed}`)
    console.log(`   Unmatched: ${results.unmatched}`)
    console.log(`   Failed: ${results.failed}`)
    console.log(`   Match Methods:`, JSON.stringify(results.match_methods))

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction sync complete',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('\n❌ Sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})