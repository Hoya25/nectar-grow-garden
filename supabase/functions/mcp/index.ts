import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Commerce categories (generic, no branded engine names) ───────
const COMMERCE_CATEGORIES = [
  { name: "Powersports & Motorsports", slug: "powersports-motorsports" },
  { name: "Lacrosse & Youth Sports", slug: "lacrosse-youth-sports" },
  { name: "Live Entertainment & Events", slug: "live-entertainment-events" },
  { name: "Skilled Trades & Home Services", slug: "skilled-trades-home-services" },
  { name: "Recovery & Adaptive Fitness", slug: "recovery-adaptive-fitness" },
  { name: "Wellness & Nutrition", slug: "wellness-nutrition" },
];

// ── Tool definitions ─────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_bounties",
    description: "Search and filter NCTR earning opportunities. Filter by category, amount, keyword, or repeatable status.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by opportunity_type (shopping, social_follow, bonus, invite, etc.)" },
        min_amount: { type: "number", description: "Minimum NCTR reward" },
        max_amount: { type: "number", description: "Maximum NCTR reward" },
        keyword: { type: "string", description: "Search keyword in title or description" },
        repeatable_only: { type: "boolean", description: "Only show repeatable (non-invite) bounties" },
      },
    },
  },
  {
    name: "get_earning_rates",
    description: "Get Crescendo tier multipliers and calculate tier-adjusted earnings for any bounty.",
    inputSchema: {
      type: "object",
      properties: {
        tier: { type: "string", description: "Tier name (Bronze, Silver, Gold, Platinum, Diamond)" },
        bounty_id: { type: "string", description: "Bounty ID to calculate adjusted earnings for" },
      },
    },
  },
  {
    name: "check_tier_requirements",
    description: "Check tier progression path. See which tiers are unlocked at a given NCTR balance and what's needed to reach the next level.",
    inputSchema: {
      type: "object",
      properties: {
        current_balance: { type: "number", description: "Current NCTR balance in 360LOCK" },
        target_tier: { type: "string", description: "Target tier to check requirements for" },
      },
    },
  },
  {
    name: "get_active_promotions",
    description: "Get current limited-time promotions and bonus earning opportunities.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_onboarding_link",
    description: "Generate a join link for new members. Supports referral tracking.",
    inputSchema: {
      type: "object",
      properties: {
        referral_code: { type: "string", description: "Optional referral code for tracking" },
      },
    },
  },
  {
    name: "get_commerce_categories",
    description: "Get the list of commerce verticals available in The Garden's brand partner network.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ── DB helpers ───────────────────────────────────────────────────
async function fetchTiers() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("status_tiers")
    .select("tier_name, display_name, badge_emoji, min_nctr_360_locked, max_nctr_360_locked, reward_multiplier, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((t: Record<string, unknown>) => ({
    name: t.display_name,
    tier_name: t.tier_name,
    emoji: t.badge_emoji,
    threshold: Number(t.min_nctr_360_locked),
    multiplier: Number(t.reward_multiplier),
    sort_order: t.sort_order,
  }));
}

async function fetchBounties() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("earning_opportunities")
    .select("id, title, description, opportunity_type, nctr_reward, reward_per_dollar, is_active, featured, partner_name")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []).map((b: Record<string, unknown>) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    category: b.opportunity_type,
    nctr_reward: Number(b.nctr_reward ?? 0),
    reward_per_dollar: Number(b.reward_per_dollar ?? 0),
    featured: b.featured,
    partner_name: b.partner_name,
  }));
}

// ── Tool handlers ────────────────────────────────────────────────
async function handleSearchBounties(args: Record<string, unknown>) {
  let results = await fetchBounties();
  if (args.category) results = results.filter((b) => b.category === args.category);
  if (args.repeatable_only) results = results.filter((b) => b.category !== "invite");
  if (typeof args.min_amount === "number") results = results.filter((b) => b.nctr_reward >= (args.min_amount as number));
  if (typeof args.max_amount === "number") results = results.filter((b) => b.nctr_reward <= (args.max_amount as number));
  if (args.keyword) {
    const kw = (args.keyword as string).toLowerCase();
    results = results.filter((b) => b.title.toLowerCase().includes(kw) || (b.description ?? "").toLowerCase().includes(kw));
  }
  return { content: [{ type: "text", text: JSON.stringify({ bounties: results, count: results.length }, null, 2) }] };
}

async function handleGetEarningRates(args: Record<string, unknown>) {
  const tiers = await fetchTiers();
  const meta = { thresholds_status: "illustrative" };
  if (args.tier) {
    const tier = tiers.find((t) => t.name.toLowerCase() === (args.tier as string).toLowerCase() || t.tier_name === (args.tier as string).toLowerCase());
    if (!tier) return { content: [{ type: "text", text: JSON.stringify({ error: "Unknown tier" }) }] };
    const result: Record<string, unknown> = { tier, ...meta };
    if (args.bounty_id) {
      const bounties = await fetchBounties();
      const bounty = bounties.find((b) => b.id === args.bounty_id);
      if (bounty) {
        result.adjusted_reward = +(bounty.nctr_reward * tier.multiplier).toFixed(2);
        result.bounty = bounty;
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
  return { content: [{ type: "text", text: JSON.stringify({ tiers, ...meta }, null, 2) }] };
}

async function handleCheckTierRequirements(args: Record<string, unknown>) {
  const tiers = await fetchTiers();
  const balance = (args.current_balance as number) ?? 0;
  const currentTier = [...tiers].reverse().find((t) => balance >= t.threshold) ?? tiers[0];
  const currentIdx = tiers.indexOf(currentTier);
  const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;

  const result: Record<string, unknown> = {
    current_balance: balance,
    current_tier: currentTier,
    next_tier: nextTier,
    nctr_needed: nextTier ? Math.max(0, nextTier.threshold - balance) : 0,
    thresholds_status: "illustrative",
  };

  if (args.target_tier) {
    const target = tiers.find((t) => t.name.toLowerCase() === (args.target_tier as string).toLowerCase() || t.tier_name === (args.target_tier as string).toLowerCase());
    if (target) {
      result.target = target;
      result.target_nctr_needed = Math.max(0, target.threshold - balance);
      result.target_unlocked = balance >= target.threshold;
    }
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handleGetActivePromotions() {
  const sb = getSupabase();
  const { data } = await sb
    .from("partner_campaigns")
    .select("id, title, description, bonus_multiplier, start_date, end_date, is_active")
    .eq("is_active", true);
  const promotions = data ?? [];
  return {
    content: [{
      type: "text",
      text: JSON.stringify(
        promotions.length > 0
          ? { promotions }
          : { promotions: [], message: "No active promotions right now. Check back soon or browse The Garden for earning opportunities." },
        null, 2,
      ),
    }],
  };
}

function handleGetOnboardingLink(args: Record<string, unknown>) {
  const base = "https://thegarden.nctr.live/auth";
  const url = args.referral_code ? `${base}?ref=${encodeURIComponent(args.referral_code as string)}` : base;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ join_url: url, referral_code: args.referral_code ?? null }, null, 2),
    }],
  };
}

function handleGetCommerceCategories() {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ categories: COMMERCE_CATEGORIES, count: COMMERCE_CATEGORIES.length }, null, 2),
    }],
  };
}

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "search_bounties": return await handleSearchBounties(args);
    case "get_earning_rates": return await handleGetEarningRates(args);
    case "check_tier_requirements": return await handleCheckTierRequirements(args);
    case "get_active_promotions": return await handleGetActivePromotions();
    case "get_onboarding_link": return handleGetOnboardingLink(args);
    case "get_commerce_categories": return handleGetCommerceCategories();
    default: return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
  }
}

// ── JSON-RPC router ──────────────────────────────────────────────
async function handleJsonRpc(body: { method: string; params?: Record<string, unknown>; id?: unknown }) {
  const { method, params, id } = body;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "nctr-garden-mcp", version: "2.0.0" },
        capabilities: { tools: { listChanged: false } },
      },
    };
  }

  if (method === "notifications/initialized") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const toolName = (params as Record<string, unknown>)?.name as string;
    const toolArgs = ((params as Record<string, unknown>)?.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = await callTool(toolName, toolArgs);
      return { jsonrpc: "2.0", id, result };
    } catch (e) {
      return { jsonrpc: "2.0", id, error: { code: -32603, message: `Tool error: ${(e as Error).message}` } };
    }
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ── Hono app ─────────────────────────────────────────────────────
const app = new Hono();

app.options("/*", () => new Response(null, { headers: corsHeaders }));

app.post("/*", async (c) => {
  try {
    const body = await c.req.json();

    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((req: { method: string; params?: Record<string, unknown>; id?: unknown }) => handleJsonRpc(req))
      );
      return c.json(results, 200, corsHeaders);
    }

    const result = await handleJsonRpc(body);
    return c.json(result, 200, corsHeaders);
  } catch (_e) {
    return c.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      400,
      corsHeaders,
    );
  }
});

app.get("/*", (c) => {
  return c.json(
    {
      name: "nctr-garden-mcp",
      version: "2.0.0",
      status: "live",
      tools: TOOLS.map((t) => t.name),
      docs: "https://thegarden.nctr.live/for-agents",
    },
    200,
    corsHeaders,
  );
});

Deno.serve(app.fetch);
