import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeTransaction {
  id: number
  sid: string | null // Our tracking ID
  shopperId: string // User ID we passed as 'cp'
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
      details: [] as any[]
    }

    // Process each transaction
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
      console.log(`   Amount: $${amount}`)
      console.log(`   Commission: $${cashback}`)
      console.log(`   Status: ${status}`)
      console.log(`   Shopper ID: ${shopperId}`)
      console.log(`   Tracking ID: ${trackingId || 'MISSING'}`)

      try {
        // Determine user ID from tracking_id ONLY
        let userId: string | null = null
        
        // Look up user from tracking ID in affiliate_link_mappings
        if (trackingId) {
          const { data: mapping } = await supabase
            .from('affiliate_link_mappings')
            .select('user_id')
            .eq('tracking_id', trackingId)
            .maybeSingle()
          
          if (mapping) {
            userId = mapping.user_id
            console.log(`   ✅ Found user via tracking ID: ${userId.slice(0, 8)}...`)
          }
        }
        
        // No tracking_id or no match found - skip this transaction
        if (!userId) {
          console.error(`   ❌ Could not determine user ID (tracking_id: ${trackingId || 'MISSING'})`)
          results.failed++
          results.details.push({
            transaction_id: transactionId,
            status: 'failed',
            reason: `No user mapping found for tracking_id: ${trackingId || 'MISSING'}`
          })
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
          results.already_processed++
          results.details.push({
            transaction_id: transactionId,
            status: 'already_processed'
          })
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

        // Update portfolio total_earned
        const { error: portfolioError } = await supabase
          .from('nctr_portfolio')
          .update({
            total_earned: supabase.rpc('increment', { x: nctrReward })
          })
          .eq('user_id', userId)

        if (portfolioError) {
          console.error('   ❌ Portfolio update error:', portfolioError)
          results.failed++
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
        results.credited++
        results.details.push({
          transaction_id: transactionId,
          status: 'credited',
          nctr_amount: nctrReward,
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
    console.log(`   Failed: ${results.failed}`)

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
