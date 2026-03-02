import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
};

// ── Crescendo tier data (canonical) ──────────────────────────────
const TIERS = [
  { name: "Bronze", threshold: 0, multiplier: 1.0 },
  { name: "Silver", threshold: 1000, multiplier: 1.25 },
  { name: "Gold", threshold: 2500, multiplier: 1.5 },
  { name: "Platinum", threshold: 10000, multiplier: 2.0 },
  { name: "Diamond", threshold: 50000, multiplier: 2.5 },
];
const TIERS_META = { thresholds_status: "illustrative" };

// ── Sample bounties (static for now) ─────────────────────────────
const BOUNTIES = [
  { id: "daily-checkin", title: "Daily Check-In", category: "engagement", nctr_reward: 5, repeatable: true, description: "Check in daily to earn NCTR and build your streak." },
  { id: "social-follow", title: "Follow on Social", category: "social", nctr_reward: 25, repeatable: false, description: "Follow NCTR Alliance on social media." },
  { id: "learn-earn-101", title: "Learn & Earn: NCTR 101", category: "education", nctr_reward: 50, repeatable: false, description: "Complete the introductory learning module." },
  { id: "shop-garden", title: "Shop The Garden", category: "commerce", nctr_reward: 0, reward_per_dollar: 0.05, repeatable: true, description: "Earn NCTR on every purchase through The Garden's 6,000+ brand partners." },
  { id: "referral", title: "Refer a Friend", category: "referral", nctr_reward: 100, repeatable: true, description: "Earn NCTR when your referral signs up and completes onboarding." },
];

// ── Tool definitions ─────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_bounties",
    description: "Search and filter NCTR earning opportunities. Filter by category, amount, keyword, or repeatable status.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (engagement, social, education, commerce, referral)" },
        min_amount: { type: "number", description: "Minimum NCTR reward" },
        max_amount: { type: "number", description: "Maximum NCTR reward" },
        keyword: { type: "string", description: "Search keyword in title or description" },
        repeatable_only: { type: "boolean", description: "Only show repeatable bounties" },
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
];

// ── Tool handlers ────────────────────────────────────────────────
function handleSearchBounties(args: Record<string, unknown>) {
  let results = [...BOUNTIES];
  if (args.category) results = results.filter((b) => b.category === args.category);
  if (args.repeatable_only) results = results.filter((b) => b.repeatable);
  if (typeof args.min_amount === "number") results = results.filter((b) => b.nctr_reward >= (args.min_amount as number));
  if (typeof args.max_amount === "number") results = results.filter((b) => b.nctr_reward <= (args.max_amount as number));
  if (args.keyword) {
    const kw = (args.keyword as string).toLowerCase();
    results = results.filter((b) => b.title.toLowerCase().includes(kw) || b.description.toLowerCase().includes(kw));
  }
  return { content: [{ type: "text", text: JSON.stringify({ bounties: results, count: results.length }, null, 2) }] };
}

function handleGetEarningRates(args: Record<string, unknown>) {
  const tierData = { tiers: TIERS, ...TIERS_META };
  if (args.tier) {
    const tier = TIERS.find((t) => t.name.toLowerCase() === (args.tier as string).toLowerCase());
    if (!tier) return { content: [{ type: "text", text: JSON.stringify({ error: "Unknown tier" }) }] };
    const result: Record<string, unknown> = { tier, ...TIERS_META };
    if (args.bounty_id) {
      const bounty = BOUNTIES.find((b) => b.id === args.bounty_id);
      if (bounty) {
        result.adjusted_reward = +(bounty.nctr_reward * tier.multiplier).toFixed(2);
        result.bounty = bounty;
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(tierData, null, 2) }] };
}

function handleCheckTierRequirements(args: Record<string, unknown>) {
  const balance = (args.current_balance as number) ?? 0;
  const currentTier = [...TIERS].reverse().find((t) => balance >= t.threshold) ?? TIERS[0];
  const currentIdx = TIERS.indexOf(currentTier);
  const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;

  const result: Record<string, unknown> = {
    current_balance: balance,
    current_tier: currentTier,
    next_tier: nextTier,
    nctr_needed: nextTier ? Math.max(0, nextTier.threshold - balance) : 0,
    ...TIERS_META,
  };

  if (args.target_tier) {
    const target = TIERS.find((t) => t.name.toLowerCase() === (args.target_tier as string).toLowerCase());
    if (target) {
      result.target = target;
      result.target_nctr_needed = Math.max(0, target.threshold - balance);
      result.target_unlocked = balance >= target.threshold;
    }
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function handleGetActivePromotions() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          promotions: [],
          message: "No active promotions right now. Check back soon or browse The Garden for earning opportunities.",
        }, null, 2),
      },
    ],
  };
}

function handleGetOnboardingLink(args: Record<string, unknown>) {
  const base = "https://thegarden.nctr.live/auth";
  const url = args.referral_code ? `${base}?ref=${encodeURIComponent(args.referral_code as string)}` : base;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ join_url: url, referral_code: args.referral_code ?? null }, null, 2),
      },
    ],
  };
}

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "search_bounties": return handleSearchBounties(args);
    case "get_earning_rates": return handleGetEarningRates(args);
    case "check_tier_requirements": return handleCheckTierRequirements(args);
    case "get_active_promotions": return handleGetActivePromotions();
    case "get_onboarding_link": return handleGetOnboardingLink(args);
    default: return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
  }
}

// ── JSON-RPC router ──────────────────────────────────────────────
function handleJsonRpc(body: { method: string; params?: Record<string, unknown>; id?: unknown }) {
  const { method, params, id } = body;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "nctr-garden-mcp", version: "1.0.0" },
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
    const result = callTool(toolName, toolArgs);
    return { jsonrpc: "2.0", id, result };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ── Hono app ─────────────────────────────────────────────────────
const app = new Hono();

app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

app.post("/*", async (c) => {
  try {
    const body = await c.req.json();

    // Support batched requests
    if (Array.isArray(body)) {
      const results = body.map((req: { method: string; params?: Record<string, unknown>; id?: unknown }) => handleJsonRpc(req));
      return c.json(results, 200, corsHeaders);
    }

    const result = handleJsonRpc(body);
    return c.json(result, 200, corsHeaders);
  } catch (e) {
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
      version: "1.0.0",
      status: "live",
      tools: TOOLS.map((t) => t.name),
      docs: "https://thegarden.nctr.live/for-agents",
    },
    200,
    corsHeaders,
  );
});

Deno.serve(app.fetch);
