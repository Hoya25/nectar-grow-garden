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

      try {
        // Try to find matching user via tracking ID
        let userId: string | null = null
        
        if (txn.user_tracking_id) {
          // Parse tracking ID format: tgn_{userId}_{brandId}_{timestamp}
          const parts = txn.user_tracking_id.split('_')
          if (parts.length >= 2) {
            const userIdPart = parts[1]
            
            // Look up in tracking mappings
            const { data: mapping } = await supabase
              .from('affiliate_link_mappings')
              .select('user_id')
              .eq('tracking_id', txn.user_tracking_id)
              .maybeSingle()
            
            if (mapping) {
              userId = mapping.user_id
              results.matched++
            } else {
              // Try to find user by partial match
              const { data: users } = await supabase
                .from('profiles')
                .select('user_id')
                .ilike('user_id', `${userIdPart}%`)
                .limit(1)
              
              if (users && users.length > 0) {
                userId = users[0].user_id
                results.matched++
              }
            }
          }
        }

        if (!userId) {
          console.log(`⚠️ Could not match transaction ${txn.id} to user (tracking_id: ${txn.user_tracking_id})`)
          continue
        }

        // Check if already credited
        const { data: existing } = await supabase
          .from('nctr_transactions')
          .select('id')
          .eq('external_transaction_id', `LOYALIZE_${txn.id}`)
          .maybeSingle()

        if (existing) {
          console.log(`✓ Transaction ${txn.id} already credited`)
          continue
        }

        // Get brand info
        const { data: brand } = await supabase
          .from('brands')
          .select('name, nctr_per_dollar')
          .eq('loyalize_id', txn.store_id.toString())
          .maybeSingle()

        const nctrPerDollar = brand?.nctr_per_dollar || 50
        const nctrReward = txn.amount * nctrPerDollar

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
        console.log(`✅ Credited ${nctrReward} NCTR to user ${userId.slice(0, 8)} for transaction ${txn.id}`)

      } catch (error) {
        console.error(`❌ Error processing transaction ${txn.id}:`, error)
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
