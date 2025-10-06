import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
};

interface ShopifyOrder {
  id: number;
  order_number: string;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  note_attributes?: Array<{ name: string; value: string }>;
  customer?: {
    id: number;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🛍️ Shopify webhook received");

  try {
    // Get Shopify webhook signature
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    const shopifyTopic = req.headers.get("x-shopify-topic");
    const shopifyShop = req.headers.get("x-shopify-shop-domain");

    console.log("📝 Topic:", shopifyTopic);
    console.log("🏪 Shop:", shopifyShop);

    // Get webhook body
    const rawBody = await req.text();
    
    // Verify webhook signature
    const webhookSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (webhookSecret && hmacHeader) {
      const hash = createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("base64");
      
      if (hash !== hmacHeader) {
        console.error("❌ Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("✅ Webhook signature verified");
    } else {
      console.warn("⚠️ No webhook secret configured - skipping signature verification");
    }

    // Only process order creation webhooks
    if (shopifyTopic !== "orders/create" && shopifyTopic !== "orders/paid") {
      console.log("ℹ️ Ignoring non-order webhook:", shopifyTopic);
      return new Response(JSON.stringify({ message: "Webhook received" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order: ShopifyOrder = JSON.parse(rawBody);
    console.log("📦 Processing order:", order.order_number);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract referral code from order notes or note attributes
    let referralCode: string | null = null;
    let referrerUserId: string | null = null;

    if (order.note_attributes) {
      const referralAttr = order.note_attributes.find(
        (attr) => attr.name === "referral_code" || attr.name === "ref"
      );
      if (referralAttr) {
        referralCode = referralAttr.value;
        console.log("🔗 Found referral code:", referralCode);
      }
    }

    // Find referrer by referral code if present
    if (referralCode) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("username", referralCode)
        .single();

      if (profile) {
        referrerUserId = profile.user_id;
        console.log("👤 Found referrer:", referrerUserId);
      }
    }

    // Find or create user by email
    let userId: string | null = null;
    if (order.customer?.email || order.email) {
      const email = order.customer?.email || order.email;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (profile) {
        userId = profile.user_id;
        console.log("✅ Found existing user:", userId);
      } else {
        console.log("ℹ️ Customer not registered yet:", email);
      }
    }

    // Calculate NCTR reward (1 NCTR per dollar)
    const totalPrice = parseFloat(order.total_price);
    const baseNctrReward = totalPrice * 1.0;

    // Store order in database
    const { data: shopifyOrder, error: orderError } = await supabaseAdmin
      .from("shopify_orders")
      .insert({
        shopify_order_id: order.id.toString(),
        order_number: order.order_number,
        user_id: userId,
        total_price: totalPrice,
        currency: order.currency,
        customer_email: order.customer?.email || order.email,
        referral_code: referralCode,
        referrer_user_id: referrerUserId,
        nctr_awarded: baseNctrReward,
        nctr_credited: false,
        order_status: order.financial_status,
        order_data: order,
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Error storing order:", orderError);
      throw orderError;
    }

    console.log("✅ Order stored:", shopifyOrder.id);

    // Award NCTR if user is registered and order is paid
    if (userId && order.financial_status === "paid") {
      console.log("💰 Awarding NCTR to customer:", baseNctrReward);
      
      const { data: rewardResult } = await supabaseAdmin.rpc(
        "award_affiliate_nctr",
        {
          p_user_id: userId,
          p_base_nctr_amount: baseNctrReward,
          p_earning_source: "shopify_purchase",
        }
      );

      console.log("✅ NCTR awarded to customer:", rewardResult);

      // Award referral bonus if there's a referrer (10% of purchase)
      if (referrerUserId) {
        const referralBonus = baseNctrReward * 0.1;
        console.log("🎁 Awarding referral bonus:", referralBonus);

        const { data: referralResult } = await supabaseAdmin.rpc(
          "award_affiliate_nctr",
          {
            p_user_id: referrerUserId,
            p_base_nctr_amount: referralBonus,
            p_earning_source: "merch_referral",
          }
        );

        console.log("✅ Referral bonus awarded:", referralResult);
      }

      // Mark as credited
      await supabaseAdmin
        .from("shopify_orders")
        .update({ nctr_credited: true })
        .eq("id", shopifyOrder.id);
    } else if (!userId) {
      console.log("ℹ️ Customer not registered - NCTR will be credited when they sign up");
    } else if (order.financial_status !== "paid") {
      console.log("ℹ️ Order not paid yet - NCTR will be credited when payment completes");
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: shopifyOrder.id,
        nctr_awarded: baseNctrReward,
        credited: userId && order.financial_status === "paid",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error processing Shopify webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
