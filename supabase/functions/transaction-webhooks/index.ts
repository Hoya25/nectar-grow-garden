import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransactionWebhook {
  eventType: string
  data: {
    transactions: number[]
    changes: {
      newStatus: string
      [key: string]: any
    }
  }
}

interface TransactionData {
  id: number
  user_id: string
  amount: number
  currency: string
  brand_name?: string
  commission_rate?: number
  purchase_amount?: number
  status: string
  created_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const webhook: TransactionWebhook = await req.json()
    console.log('🔔 Received transaction webhook:', JSON.stringify(webhook, null, 2))

    // Validate webhook structure
    if (!webhook.eventType || !webhook.data || !webhook.data.transactions) {
      throw new Error('Invalid webhook payload structure')
    }

    // Handle different event types
    switch (webhook.eventType) {
      case 'NEW_TRANSACTION':
        return await handleNewTransaction(webhook, supabase)
      case 'TRANSACTION_UPDATED':
        return await handleTransactionUpdate(webhook, supabase)
      case 'TRANSACTION_COMPLETED':
        return await handleTransactionComplete(webhook, supabase)
      case 'TRANSACTION_FAILED':
        return await handleTransactionFailed(webhook, supabase)
      default:
        console.log(`⚠️ Unhandled event type: ${webhook.eventType}`)
        return new Response(JSON.stringify({
          success: true,
          message: `Event type ${webhook.eventType} received but not processed`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Webhook processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleNewTransaction(webhook: TransactionWebhook, supabase: any) {
  console.log('💰 Processing new transaction(s):', webhook.data.transactions)
  
  const processedTransactions = []
  
  for (const transactionId of webhook.data.transactions) {
    try {
      // In a real scenario, you'd fetch transaction details from your payment provider
      // For now, we'll simulate transaction processing
      const transactionData = await simulateTransactionFetch(transactionId)
      
      if (transactionData) {
        // Record the transaction in our system
        const { data: nctrTransaction, error: transactionError } = await supabase
          .from('nctr_transactions')
          .insert({
            user_id: transactionData.user_id,
            transaction_type: 'earned',
            nctr_amount: calculateNCTRReward(transactionData.purchase_amount || 0),
            purchase_amount: transactionData.purchase_amount,
            partner_name: transactionData.brand_name,
            description: `Purchase reward from ${transactionData.brand_name || 'partner'}`,
            earning_source: 'shopping',
            status: 'pending' // Start as pending, will be updated when transaction completes
          })
          .select()
          .single()

        if (transactionError) {
          console.error('Error recording transaction:', transactionError)
          continue
        }

        // Update user portfolio with pending NCTR
        const nctrReward = calculateNCTRReward(transactionData.purchase_amount || 0)
        const { error: portfolioError } = await supabase
          .from('nctr_portfolio')
          .update({
            pending_nctr: supabase.rpc('increment', { x: nctrReward }),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transactionData.user_id)

        if (portfolioError) {
          console.error('Error updating portfolio:', portfolioError)
        }

        processedTransactions.push({
          id: transactionId,
          nctr_transaction_id: nctrTransaction.id,
          nctr_reward: nctrReward,
          status: 'processed'
        })

        console.log(`✅ Processed transaction ${transactionId} for user ${transactionData.user_id}`)
      }
    } catch (error) {
      console.error(`❌ Error processing transaction ${transactionId}:`, error)
      processedTransactions.push({
        id: transactionId,
        status: 'error',
        error: error.message
      })
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${processedTransactions.length} transactions`,
    processed_transactions: processedTransactions,
    event_type: webhook.eventType
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleTransactionComplete(webhook: TransactionWebhook, supabase: any) {
  console.log('✅ Processing completed transaction(s):', webhook.data.transactions)
  
  const completedTransactions = []
  
  for (const transactionId of webhook.data.transactions) {
    try {
      // Find pending NCTR transaction
      const { data: pendingTransactions, error: findError } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('status', 'pending')
        .ilike('description', `%transaction ${transactionId}%`)

      if (findError) {
        console.error('Error finding pending transaction:', findError)
        continue
      }

      for (const transaction of pendingTransactions || []) {
        // Update transaction to completed
        const { error: updateError } = await supabase
          .from('nctr_transactions')
          .update({ status: 'completed' })
          .eq('id', transaction.id)

        if (updateError) {
          console.error('Error updating transaction status:', updateError)
          continue
        }

        // Move NCTR from pending to available
        const { error: portfolioError } = await supabase.rpc('move_pending_to_available', {
          p_user_id: transaction.user_id,
          p_amount: transaction.nctr_amount
        })

        if (portfolioError) {
          console.error('Error moving NCTR to available:', portfolioError)
          continue
        }

        // Auto-lock the earned NCTR
        const lockId = await supabase.rpc('auto_lock_earned_nctr', {
          p_user_id: transaction.user_id,
          p_nctr_amount: transaction.nctr_amount,
          p_earning_source: transaction.earning_source
        })

        completedTransactions.push({
          id: transactionId,
          nctr_transaction_id: transaction.id,
          nctr_amount: transaction.nctr_amount,
          lock_id: lockId,
          status: 'completed'
        })

        console.log(`✅ Completed transaction ${transactionId} for user ${transaction.user_id}`)
      }
    } catch (error) {
      console.error(`❌ Error completing transaction ${transactionId}:`, error)
      completedTransactions.push({
        id: transactionId,
        status: 'error',
        error: error.message
      })
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Completed ${completedTransactions.length} transactions`,
    completed_transactions: completedTransactions,
    event_type: webhook.eventType
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleTransactionUpdate(webhook: TransactionWebhook, supabase: any) {
  console.log('🔄 Processing transaction update(s):', webhook.data.transactions)
  
  // Handle status updates, amount changes, etc.
  const updatedTransactions = []
  
  for (const transactionId of webhook.data.transactions) {
    try {
      // Find existing transaction and update based on changes
      const changes = webhook.data.changes
      
      // Log the update for now - implement specific update logic as needed
      console.log(`Transaction ${transactionId} updated:`, changes)
      
      updatedTransactions.push({
        id: transactionId,
        changes: changes,
        status: 'updated'
      })
    } catch (error) {
      console.error(`❌ Error updating transaction ${transactionId}:`, error)
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Updated ${updatedTransactions.length} transactions`,
    updated_transactions: updatedTransactions,
    event_type: webhook.eventType
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleTransactionFailed(webhook: TransactionWebhook, supabase: any) {
  console.log('❌ Processing failed transaction(s):', webhook.data.transactions)
  
  const failedTransactions = []
  
  for (const transactionId of webhook.data.transactions) {
    try {
      // Find pending NCTR transaction and mark as failed
      const { data: pendingTransactions, error: findError } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('status', 'pending')
        .ilike('description', `%transaction ${transactionId}%`)

      if (findError) {
        console.error('Error finding pending transaction:', findError)
        continue
      }

      for (const transaction of pendingTransactions || []) {
        // Update transaction to failed
        const { error: updateError } = await supabase
          .from('nctr_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id)

        if (updateError) {
          console.error('Error updating transaction status:', updateError)
          continue
        }

        // Remove pending NCTR from portfolio
        const { error: portfolioError } = await supabase
          .from('nctr_portfolio')
          .update({
            pending_nctr: supabase.rpc('decrement', { x: transaction.nctr_amount }),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id)

        if (portfolioError) {
          console.error('Error updating portfolio:', portfolioError)
        }

        failedTransactions.push({
          id: transactionId,
          nctr_transaction_id: transaction.id,
          nctr_amount: transaction.nctr_amount,
          status: 'failed'
        })

        console.log(`❌ Failed transaction ${transactionId} for user ${transaction.user_id}`)
      }
    } catch (error) {
      console.error(`❌ Error processing failed transaction ${transactionId}:`, error)
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${failedTransactions.length} failed transactions`,
    failed_transactions: failedTransactions,
    event_type: webhook.eventType
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Helper function to simulate fetching transaction details
// In a real implementation, you'd fetch this from your payment provider's API
async function simulateTransactionFetch(transactionId: number): Promise<TransactionData | null> {
  // This would typically make an API call to your payment provider
  // For now, return mock data
  return {
    id: transactionId,
    user_id: 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff', // This should come from your payment system
    amount: 50.00,
    currency: 'USD',
    brand_name: 'Nike',
    commission_rate: 0.05,
    purchase_amount: 50.00,
    status: 'PENDING',
    created_at: new Date().toISOString()
  }
}

// Calculate NCTR reward based on purchase amount (100 NCTR per $1)
function calculateNCTRReward(purchaseAmount: number): number {
  return purchaseAmount * 100 // 100 NCTR per dollar spent
}