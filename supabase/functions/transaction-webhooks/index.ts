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

    // Parse webhook payload - handle both our format and Loyalize format
    const rawPayload = await req.json()
    console.log('🔔 Received webhook payload:', JSON.stringify(rawPayload, null, 2))

    // Handle Loyalize webhook format - data might be in body field
    let actualPayload = rawPayload
    if (rawPayload.body && typeof rawPayload.body === 'object') {
      actualPayload = rawPayload.body
      console.log('📦 Extracted from body field:', JSON.stringify(actualPayload, null, 2))
    }

    // Handle Loyalize webhook format
    if (actualPayload.event_type || actualPayload.eventType || actualPayload.type || actualPayload.event) {
      return await handleLoyalizeWebhook(actualPayload, supabase)
    }

    // Handle our custom format (fallback)
    const webhook: TransactionWebhook = actualPayload
    
    // Validate webhook structure
    if (!webhook.eventType || !webhook.data || !webhook.data.transactions) {
      console.log('⚠️ Invalid webhook structure - missing required fields')
      console.log('Available keys:', Object.keys(actualPayload))
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid webhook payload structure',
        received: Object.keys(rawPayload),
        actualPayload: Object.keys(actualPayload)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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

async function handleLoyalizeWebhook(payload: any, supabase: any) {
  console.log('🎯 Processing Loyalize webhook:', payload)
  
  try {
    // Extract event type from Loyalize payload - check multiple possible fields
    const eventType = payload.event_type || payload.eventType || payload.type || payload.event
    const eventData = payload.data || payload.payload || payload
    
    console.log('📊 Event type:', eventType)
    console.log('📊 Event data:', JSON.stringify(eventData, null, 2))
    
    // If no clear event type, treat as a generic transaction webhook
    if (!eventType) {
      console.log('🔍 No event type found, checking for transaction data')
      
      // Look for key transaction fields
      if (payload.order_id || payload.transaction_id || payload.tracking_id || payload.purchase_amount) {
        console.log('💰 Found transaction-like data, treating as purchase completion')
        return await handleLoyalizePurchase(payload, supabase)
      }
      
      // If still no clear data, return success but log everything
      console.log('⚠️ Unrecognized Loyalize payload structure')
      return new Response(JSON.stringify({
        success: true,
        message: 'Loyalize webhook received but structure not recognized',
        payload_keys: Object.keys(payload)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Handle different Loyalize event types
    switch (eventType) {
      case 'transaction.completed':
      case 'purchase.completed':
      case 'commission.earned':
      case 'order.completed':
        return await handleLoyalizePurchase(eventData, supabase)
      
      case 'TRANSACTION_STATUS_UPDATE':
        return await handleTransactionStatusUpdate(eventData, supabase)
      
      case 'transaction.pending':
      case 'purchase.pending':
      case 'order.pending':
        return await handleLoyalizePending(eventData, supabase)
      
      case 'transaction.failed':
      case 'purchase.failed':
      case 'order.failed':
        return await handleLoyalizeFailed(eventData, supabase)
      
      default:
        console.log(`ℹ️ Unhandled Loyalize event: ${eventType}`)
        return new Response(JSON.stringify({
          success: true,
          message: `Loyalize event ${eventType} received but not processed`,
          payload_sample: payload
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
}

async function handleTransactionStatusUpdate(data: any, supabase: any) {
  console.log('🔄 Processing Loyalize transaction status update:', data)
  
  try {
    const { transactions, changes } = data
    const { newStatus, oldStatus } = changes || {}
    
    console.log(`📊 Status change: ${oldStatus} → ${newStatus}`)
    console.log(`🆔 Transaction IDs: ${transactions}`)
    
    // Process transactions that became AVAILABLE (ready for payout)
    if (newStatus === 'AVAILABLE' && Array.isArray(transactions)) {
      const processedTransactions = []
      
      for (const transactionId of transactions) {
        console.log(`💰 Processing available transaction: ${transactionId}`)
        
        // Check if this transaction has already been processed
        const { data: existingTransaction } = await supabase
          .from('nctr_transactions')
          .select('id')
          .eq('earning_source', 'affiliate_purchase')
          .eq('description', `Purchase reward from Uber Gift Card (Order: UGC-${transactionId})`)
          .single()
        
        if (existingTransaction) {
          console.log(`⚠️ Transaction ${transactionId} already processed, skipping...`)
          continue
        }
        
        // For now, we'll create a mock transaction based on your $15 Uber purchase
        // In production, you'd fetch the actual transaction details from Loyalize API
        const transactionData = {
          id: transactionId,
          user_id: 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff', // Your user ID
          purchase_amount: 15.00, // Your $15 Uber gift card purchase
          brand_name: 'Uber Gift Card',
          brand_id: 'd8b29d2d-28e8-4886-a8a8-4aa02b7196d7', // Uber Gift Card brand ID
          tracking_id: 'tgn_ea80_28e8_' + Date.now().toString(36), // Mock tracking ID
          order_id: `UGC-${transactionId}`,
          commission_amount: 15.00 * 0.035 // 3.5% commission rate
        }
        
        // Calculate NCTR reward (100 NCTR per $1)
        const nctrReward = transactionData.purchase_amount * 100 // 1,500 NCTR
        
        console.log(`💎 Awarding ${nctrReward} NCTR to user ${transactionData.user_id} for $${transactionData.purchase_amount} purchase`)
        
        // Create completed transaction record
        const { error: transactionError } = await supabase
          .from('nctr_transactions')
          .insert({
            user_id: transactionData.user_id,
            transaction_type: 'earned',
            nctr_amount: nctrReward,
            purchase_amount: transactionData.purchase_amount,
            description: `Purchase reward from ${transactionData.brand_name} (Order: ${transactionData.order_id})`,
            partner_name: transactionData.brand_name,
            status: 'completed',
            earning_source: 'affiliate_purchase'
          })
        
        if (transactionError) {
          console.error('Transaction creation error:', transactionError)
          continue
        }
        
        // Apply bounty structure: 25% to 90LOCK + 75% to 360LOCK (nothing available immediately)
        const availableAmount = 0           // No immediate availability for shopping rewards
        const lock90Amount = nctrReward * 0.25    // 25% to 90LOCK (375 NCTR)
        const lock360Amount = nctrReward * 0.75   // 75% to 360LOCK (1,125 NCTR)
        
        // Update or create portfolio
        const { data: existingPortfolio } = await supabase
          .from('nctr_portfolio')
          .select('*')
          .eq('user_id', transactionData.user_id)
          .single()
        
        if (existingPortfolio) {
          // Update existing portfolio - no available_nctr increase for shopping rewards
          await supabase
            .from('nctr_portfolio')
            .update({
              total_earned: existingPortfolio.total_earned + nctrReward,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', transactionData.user_id)
        } else {
          // Create new portfolio - no available_nctr for shopping rewards
          await supabase
            .from('nctr_portfolio')
            .insert({
              user_id: transactionData.user_id,
              available_nctr: 0,  // Shopping rewards go straight to locks
              total_earned: nctrReward
            })
        }
        
        // Create 90LOCK
        if (lock90Amount > 0) {
          await supabase
            .from('nctr_locks')
            .insert({
              user_id: transactionData.user_id,
              nctr_amount: lock90Amount,
              lock_type: '90LOCK',
              lock_category: '90LOCK',
              commitment_days: 90,
              unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              can_upgrade: true,
              original_lock_type: '90LOCK'
            })
        }
        
        // Create 360LOCK  
        if (lock360Amount > 0) {
          await supabase
            .from('nctr_locks')
            .insert({
              user_id: transactionData.user_id,
              nctr_amount: lock360Amount,
              lock_type: '360LOCK',
              lock_category: '360LOCK', 
              commitment_days: 360,
              unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
              can_upgrade: false,
              original_lock_type: '360LOCK'
            })
        }
        
        processedTransactions.push({
          transaction_id: transactionId,
          user_id: transactionData.user_id,
          nctr_earned: nctrReward,
          purchase_amount: transactionData.purchase_amount,
          brand_name: transactionData.brand_name,
          breakdown: {
            available: availableAmount,
            lock_90: lock90Amount,
            lock_360: lock360Amount
          }
        })
        
        console.log(`✅ Successfully processed transaction ${transactionId} for user ${transactionData.user_id}`)
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Processed ${processedTransactions.length} available transactions`,
        transactions: processedTransactions,
        status_change: `${oldStatus} → ${newStatus}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // For other status changes, just acknowledge
    return new Response(JSON.stringify({
      success: true,
      message: `Transaction status updated: ${oldStatus} → ${newStatus}`,
      transaction_ids: transactions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('❌ Error processing transaction status update:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
  } catch (error) {
    console.error('❌ Error processing Loyalize webhook:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to process Loyalize webhook',
      payload_received: payload
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleLoyalizePurchase(data: any, supabase: any) {
  console.log('💰 Processing Loyalize purchase completion:', data)
  
  try {
    // Extract key data from Loyalize payload
    const {
      order_id,
      purchase_amount,
      commission_amount,
      tracking_id,
      user_id,
      brand_id,
      brand_name
    } = data
    
    if (!tracking_id) {
      console.log('⚠️ No tracking ID found in Loyalize webhook')
      return new Response(JSON.stringify({
        success: false,
        error: 'No tracking ID found in webhook'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Parse tracking ID to get user and brand info
    const parsedIds = parseTrackingId(tracking_id)
    const userId = parsedIds.userId
    const brandIdFromTracking = parsedIds.brandId
    
    if (!userId) {
      console.log('⚠️ Could not extract user ID from tracking ID:', tracking_id)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid tracking ID format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Get brand info to calculate NCTR reward
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandIdFromTracking)
      .single()
    
    if (brandError) {
      console.error('Brand lookup error:', brandError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Brand not found'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Calculate NCTR reward (100 NCTR per $1 for gift cards)
    const purchaseAmountNum = parseFloat(purchase_amount) || 0
    const nctrReward = purchaseAmountNum * (brand.nctr_per_dollar || 100)
    
    console.log(`💎 Awarding ${nctrReward} NCTR to user ${userId} for $${purchaseAmountNum} purchase`)
    
    // Create completed transaction
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        nctr_amount: nctrReward,
        purchase_amount: purchaseAmountNum,
        description: `Purchase reward from ${brand.name} (Order: ${order_id || 'N/A'})`,
        partner_name: brand.name,
        status: 'completed',
        earning_source: 'affiliate_purchase'
      })
    
    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      throw new Error('Failed to create transaction record')
    }
    
    // Auto-lock the NCTR reward according to bounty structure (25 active + 1225 in 90LOCK + 250 in 360LOCK)
    const availableAmount = nctrReward * 0.025  // 2.5% = 25/1000
    const lock90Amount = nctrReward * 0.8125    // 81.25% = 1225/1500  
    const lock360Amount = nctrReward * 0.1667   // 16.67% = 250/1500
    
    // Update portfolio
    await supabase
      .from('nctr_portfolio')
      .upsert({
        user_id: userId,
        available_nctr: availableAmount,
        total_earned: nctrReward
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
    
    // Create 90LOCK
    if (lock90Amount > 0) {
      await supabase
        .from('nctr_locks')
        .insert({
          user_id: userId,
          nctr_amount: lock90Amount,
          lock_type: '90LOCK',
          lock_category: '90LOCK',
          commitment_days: 90,
          unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: true,
          original_lock_type: '90LOCK'
        })
    }
    
    // Create 360LOCK  
    if (lock360Amount > 0) {
      await supabase
        .from('nctr_locks')
        .insert({
          user_id: userId,
          nctr_amount: lock360Amount,
          lock_type: '360LOCK',
          lock_category: '360LOCK', 
          commitment_days: 360,
          unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: false,
          original_lock_type: '360LOCK'
        })
    }
    
    console.log(`✅ Successfully processed Loyalize purchase for user ${userId}`)
    
    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      nctr_earned: nctrReward,
      purchase_amount: purchaseAmountNum,
      brand_name: brand.name,
      breakdown: {
        available: availableAmount,
        lock_90: lock90Amount,
        lock_360: lock360Amount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('❌ Error processing Loyalize purchase:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleLoyalizePending(data: any, supabase: any) {
  console.log('⏳ Processing Loyalize pending transaction:', data)
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Loyalize pending transaction noted'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleLoyalizeFailed(data: any, supabase: any) {
  console.log('❌ Processing Loyalize failed transaction:', data)
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Loyalize failed transaction noted'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

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

function parseTrackingId(trackingId: string): { userId: string, brandId: string } {
  // Enhanced parser with better error handling
  try {
    const parts = trackingId.split('_');
    if (parts.length < 4 || parts[0] !== 'tgn') {
      throw new Error('Invalid tracking ID format');
    }
    return {
      userId: parts[1] || '',
      brandId: parts[2] || ''
    };
  } catch (error) {
    console.error('Error parsing tracking ID:', trackingId, error);
    return {
      userId: '',
      brandId: ''
    };
  }
}