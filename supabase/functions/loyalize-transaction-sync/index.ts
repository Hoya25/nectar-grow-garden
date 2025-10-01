import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeTransaction {
  id: number
  store_id: number
  store_name: string
  amount: number
  cashback: number
  status: string
  created_at: string
  updated_at: string
  user_tracking_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY')
    if (!loyalizeApiKey) {
      throw new Error('LOYALIZE_API_KEY not configured')
    }

    console.log('🔄 Starting Loyalize transaction sync...')

    // Fetch recent transactions from Loyalize API
    const loyalizeResponse = await fetch('https://api.loyalize.com/v1/transactions?status=pending,available', {
      headers: {
        'Authorization': `Bearer ${loyalizeApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!loyalizeResponse.ok) {
      throw new Error(`Loyalize API error: ${loyalizeResponse.status}`)
    }

    const loyalizeData = await loyalizeResponse.json()
    const transactions: LoyalizeTransaction[] = loyalizeData.data || []

    console.log(`📊 Found ${transactions.length} pending/available Loyalize transactions`)

    const results = {
      checked: 0,
      matched: 0,
      credited: 0,
      errors: [] as string[]
    }

    for (const txn of transactions) {
      results.checked++
      
      console.log(`\n📦 Processing transaction ${txn.id}:`)
      console.log(`   Amount: $${txn.amount}`)
      console.log(`   Store: ${txn.store_name}`)
      console.log(`   Tracking ID: ${txn.user_tracking_id || 'MISSING'}`)

      try {
        // Try to find matching user via tracking ID
        let userId: string | null = null
        
        if (txn.user_tracking_id) {
          console.log(`🔍 Looking up tracking ID: ${txn.user_tracking_id}`)
          
          // First attempt: Direct database lookup
          const { data: mapping, error: mappingError } = await supabase
            .from('affiliate_link_mappings')
            .select('user_id, brand_id')
            .eq('tracking_id', txn.user_tracking_id)
            .maybeSingle()
          
          if (mappingError) {
            console.error(`   ❌ Database lookup error:`, mappingError)
          }
          
          if (mapping) {
            userId = mapping.user_id
            results.matched++
            console.log(`   ✅ Found user via database: ${userId.slice(0, 8)}...`)
            console.log(`   └─ Brand ID: ${mapping.brand_id?.slice(0, 8) || 'N/A'}...`)
          } else {
            console.log(`   ⚠️ No mapping found in database for: ${txn.user_tracking_id}`)
            
            // Fallback: Try to parse tracking ID parts
            const parts = txn.user_tracking_id.split('_')
            console.log(`   └─ Tracking ID parts: ${parts.join(', ')}`)
            
            if (parts.length >= 2 && parts[0] === 'tgn') {
              const userIdPart = parts[1]
              console.log(`   └─ Attempting partial user ID match with: ${userIdPart}`)
              
              // Try to find user by partial match
              const { data: users } = await supabase
                .from('profiles')
                .select('user_id')
                .ilike('user_id', `${userIdPart}%`)
                .limit(1)
              
              if (users && users.length > 0) {
                userId = users[0].user_id
                results.matched++
                console.log(`   ✅ Found user via partial match: ${userId.slice(0, 8)}...`)
              } else {
                console.log(`   ❌ No user found via partial match`)
              }
            }
          }
        } else {
          console.log(`   ⚠️ Transaction missing user_tracking_id field`)
        }

        if (!userId) {
          console.log(`❌ SKIPPING: Could not match transaction ${txn.id} to any user`)
          results.errors.push(`Transaction ${txn.id}: No user match found for tracking_id: ${txn.user_tracking_id}`)
          continue
        }

        console.log(`✓ User matched: ${userId.slice(0, 8)}...`)
        
        // Check if already credited
        const { data: existing } = await supabase
          .from('nctr_transactions')
          .select('id')
          .eq('external_transaction_id', `LOYALIZE_${txn.id}`)
          .maybeSingle()

        if (existing) {
          console.log(`   ℹ️ Already credited - skipping`)
          continue
        }

        console.log(`   💰 Processing credit...`)
        
        // Get brand info
        const { data: brand } = await supabase
          .from('brands')
          .select('name, nctr_per_dollar')
          .eq('loyalize_id', txn.store_id.toString())
          .maybeSingle()

        const nctrPerDollar = brand?.nctr_per_dollar || 50
        const nctrReward = txn.amount * nctrPerDollar
        
        console.log(`   Brand: ${brand?.name || txn.store_name}`)
        console.log(`   Rate: ${nctrPerDollar} NCTR per dollar`)
        console.log(`   Reward: ${nctrReward} NCTR`)

        // Credit the user
        const { error: portfolioError } = await supabase
          .from('nctr_portfolio')
          .update({
            total_earned: supabase.rpc('increment', { value: nctrReward }),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (portfolioError) throw portfolioError

        // Create auto-lock (shopping purchases go to 90LOCK)
        const { data: lock } = await supabase
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
          .select()
          .single()

        // Record transaction
        await supabase
          .from('nctr_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'earned',
            nctr_amount: nctrReward,
            purchase_amount: txn.amount,
            partner_name: brand?.name || txn.store_name,
            description: `${brand?.name || txn.store_name} purchase via Loyalize ($${txn.amount})`,
            earning_source: 'affiliate_purchase',
            external_transaction_id: `LOYALIZE_${txn.id}`,
            status: 'completed'
          })

        results.credited++
        console.log(`✅ CREDITED: ${nctrReward} NCTR → user ${userId.slice(0, 8)}...\n`)

      } catch (error) {
        console.error(`\n❌ ERROR processing transaction ${txn.id}:`, error)
        console.error(`   Error details:`, error.message)
        results.errors.push(`Transaction ${txn.id}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Sync complete: ${results.credited}/${results.checked} transactions credited`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Loyalize sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
