import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from "https://esm.sh/ethers@6.7.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WithdrawalRequest {
  id: string
  user_id: string
  wallet_address: string
  nctr_amount: number
  net_amount_nctr: number
  gas_fee_nctr: number
  status: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Enhanced security: validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Enhanced security: validate JWT token and verify treasury admin role
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get authenticated user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // CRITICAL SECURITY: Verify user has active treasury admin role
    const { data: treasuryRole, error: roleError } = await supabaseClient
      .from('treasury_admin_roles')
      .select('role_type, is_active, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !treasuryRole) {
      console.error(`❌ Unauthorized treasury access attempt by user ${user.id.slice(0, 8)}`)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Treasury admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Check if role has expired
    if (treasuryRole.expires_at && new Date(treasuryRole.expires_at) < new Date()) {
      console.error(`❌ Expired treasury admin role for user ${user.id.slice(0, 8)}`)
      return new Response(
        JSON.stringify({ error: 'Treasury admin access expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log(`✅ Treasury admin verified: ${user.id.slice(0, 8)} (role: ${treasuryRole.role_type})`)

    // Parse and validate request body
    let requestBody
    try {
      const text = await req.text()
      if (!text.trim()) {
        throw new Error('Empty request body')
      }
      requestBody = JSON.parse(text)
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { action, request_id } = requestBody

    // Enhanced security: validate required fields
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid action parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Enhanced security: validate request_id for process_withdrawal
    if (action === 'process_withdrawal') {
      if (!request_id || typeof request_id !== 'string' || request_id.length !== 36) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid request_id parameter' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      return await processWithdrawal(supabaseClient, request_id)
    }

    if (action === 'get_pending_withdrawals') {
      return await getPendingWithdrawals(supabaseClient)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action parameter' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    // Enhanced security: don't expose sensitive error details
    console.error('Treasury withdrawal error:', error)
    return new Response(
      JSON.stringify({ error: 'Request processing failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function processWithdrawal(supabaseClient: any, requestId: string) {
  console.log(`🏦 Processing withdrawal request: ${requestId}`)

  // Get withdrawal request details - security is now enforced by RLS policies
  const { data: withdrawal, error: withdrawalError } = await supabaseClient
    .from('withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (withdrawalError || !withdrawal) {
    console.error('❌ Withdrawal request not found:', withdrawalError)
    return new Response(
      JSON.stringify({ error: 'Withdrawal request not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    )
  }

  // Fetch user profile for logging
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('full_name, username, email')
    .eq('user_id', withdrawal.user_id)
    .maybeSingle()
  
  const userName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Unknown User'
  console.log(`👤 Processing withdrawal for ${userName} (${withdrawal.user_id.slice(0, 8)}...)`)

  try {
    // Update status to processing
    await supabaseClient
      .from('withdrawal_requests')
      .update({ status: 'processing' })
      .eq('id', requestId)

    // Get treasury wallet private key
    const privateKey = Deno.env.get('TREASURY_WALLET_PRIVATE_KEY')
    if (!privateKey) {
      throw new Error('Treasury wallet private key not configured')
    }

    // Set up Ethereum provider and wallet - Use Base network
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org') // Base network
    const wallet = new ethers.Wallet(privateKey, provider)

    // NCTR Token Contract Address on Base network
    const NCTR_CONTRACT_ADDRESS = '0x973104fAa7F2B11787557e85953ECA6B4e262328'
    
    // ERC-20 ABI for transfer function
    const ERC20_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ]

    const nctrContract = new ethers.Contract(NCTR_CONTRACT_ADDRESS, ERC20_ABI, wallet)

    // Convert NCTR amount to wei (assuming 18 decimals)
    const amountInWei = ethers.parseUnits(withdrawal.net_amount_nctr.toString(), 18)

    // Check treasury balance
    const balance = await nctrContract.balanceOf(wallet.address)
    if (balance < amountInWei) {
      throw new Error('Insufficient treasury balance')
    }

    // Execute the transfer (completely fee-free)
    console.log(`💸 Sending ${withdrawal.net_amount_nctr} NCTR to ${withdrawal.wallet_address} (fee-free withdrawal)`)
    const tx = await nctrContract.transfer(withdrawal.wallet_address, amountInWei)
    
    console.log(`📋 Transaction hash: ${tx.hash}`)
    
    // Wait for confirmation
    const receipt = await tx.wait()
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`)

    // Update withdrawal request as completed
    await supabaseClient
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        transaction_hash: tx.hash,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    // Update user's transaction status
    await supabaseClient
      .from('nctr_transactions')
      .update({ status: 'completed' })
      .eq('user_id', withdrawal.user_id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'pending')

    console.log(`🎉 Withdrawal completed successfully for ${userName} (${withdrawal.user_id.slice(0, 8)}...)`)

    return new Response(
      JSON.stringify({
        success: true,
        transaction_hash: tx.hash,
        net_amount: withdrawal.net_amount_nctr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Withdrawal processing failed:', error)

    // Update withdrawal as failed
    await supabaseClient
      .from('withdrawal_requests')
      .update({
        status: 'failed',
        failure_reason: error instanceof Error ? error.message : 'Unknown error occurred'
      })
      .eq('id', requestId)

    // Refund user's available balance
    await supabaseClient.rpc('move_pending_to_available', {
      p_user_id: withdrawal.user_id,
      p_amount: withdrawal.nctr_amount
    })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function getPendingWithdrawals(supabaseClient: any) {
  // Security is now enforced by RLS policies - only treasury admins can see this data
  console.log('🔐 Fetching pending withdrawals (access controlled by RLS)')
  
  const { data, error } = await supabaseClient
    .from('withdrawal_requests')
    .select(`
      *,
      profiles!inner(username, full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending withdrawals:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pending withdrawals' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({ withdrawals: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}