import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      logStep("ERROR: No signature header");
      return new Response(JSON.stringify({ error: "No signature header" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("✅ Webhook signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      logStep("❌ Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    logStep("Event received", { type: event.type, id: event.id });

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Processing checkout session", {
        sessionId: session.id,
        metadata: session.metadata,
      });

      const { nctr_amount, user_id, purchase_type } = session.metadata || {};
      
      if (!nctr_amount || !user_id) {
        throw new Error("Missing metadata in checkout session");
      }

      const nctrAmountNum = parseFloat(nctr_amount);
      const usdAmount = session.amount_total ? session.amount_total / 100 : 0;

      logStep("Creating transaction", {
        userId: user_id,
        nctrAmount: nctrAmountNum,
        usdAmount,
      });

      // Create transaction record
      const { error: transactionError } = await supabaseClient
        .from("nctr_transactions")
        .insert({
          user_id,
          transaction_type: "earned",
          nctr_amount: nctrAmountNum,
          description: `NCTR purchase via Stripe ($${usdAmount.toFixed(2)}) - Locked in 360LOCK`,
          earning_source: "token_purchase",
          status: "completed",
          external_transaction_id: session.id,
          purchase_amount: usdAmount,
        });

      if (transactionError) {
        throw new Error(`Transaction error: ${transactionError.message}`);
      }

      // Create 360LOCK
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + 360);

      const { error: lockError } = await supabaseClient
        .from("nctr_locks")
        .insert({
          user_id,
          nctr_amount: nctrAmountNum,
          lock_type: "360LOCK",
          lock_category: "360LOCK",
          commitment_days: 360,
          unlock_date: unlockDate.toISOString(),
          can_upgrade: false,
          original_lock_type: "360LOCK",
        });

      if (lockError) {
        throw new Error(`Lock error: ${lockError.message}`);
      }

      // Update portfolio - get current values first
      const { data: currentPortfolio } = await supabaseClient
        .from("nctr_portfolio")
        .select("lock_360_nctr, total_earned")
        .eq("user_id", user_id)
        .single();

      if (currentPortfolio) {
        const { error: portfolioError } = await supabaseClient
          .from("nctr_portfolio")
          .update({
            lock_360_nctr: (currentPortfolio.lock_360_nctr || 0) + nctrAmountNum,
            total_earned: (currentPortfolio.total_earned || 0) + nctrAmountNum,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);

        if (portfolioError) {
          logStep("Portfolio update error (will be handled by trigger)", { message: portfolioError.message });
        }
      }

      logStep("✅ Purchase processed successfully", {
        userId: user_id,
        nctrAmount: nctrAmountNum,
        sessionId: session.id,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("❌ ERROR in stripe-webhook", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    // Return 200 even on error to prevent Stripe from retrying
    // Log the error for debugging but acknowledge receipt
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
});
