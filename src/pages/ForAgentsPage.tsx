import { useState } from "react";
import { Check, Copy, ArrowRight, Search, ShoppingBag, TrendingUp } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const CodeBlock = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg p-5 text-sm leading-relaxed" style={{ background: "#0D0D0D", color: "#D9D9D9" }}>
        <code className="whitespace-pre-wrap break-all">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={{ background: copied ? "#E2FF6D" : "#2A2A2A", color: copied ? "#121212" : "#D9D9D9" }}
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
};

const ucpManifest = JSON.stringify({
  ucp: {
    version: "2026-01-11",
    services: {
      "dev.ucp.shopping": {
        version: "2026-01-11",
        spec: "https://ucp.dev/specification/overview",
        rest: {
          schema: "https://thegarden.nctr.live/api/ucp/openapi.json",
          endpoint: "https://thegarden.nctr.live/api/ucp/v1"
        }
      }
    },
    capabilities: [
      {
        name: "dev.ucp.shopping.checkout",
        version: "2026-01-11",
        spec: "https://ucp.dev/specification/checkout",
        schema: "https://ucp.dev/schemas/shopping/checkout.json"
      },
      {
        name: "com.nctr.loyalty.rewards",
        version: "2026-03-01",
        extends: "dev.ucp.shopping.checkout",
        description: "NCTR participation economy rewards — earn NCTR on every commerce transaction routed through The Garden's 6,000+ brand partner network."
      }
    ]
  },
  loyalty: {
    provider: "NCTR Alliance",
    program: "Crescendo",
    currency: "NCTR",
    earn_model: "commission_share",
    avg_commission_rate: 0.05,
    tiers: [
      { name: "Bronze", threshold: 0, multiplier: 1.0 },
      { name: "Silver", multiplier: 1.25 },
      { name: "Gold", multiplier: 1.5 },
      { name: "Platinum", multiplier: 2.0 },
      { name: "Diamond", multiplier: 2.5 }
    ],
    commitment: { mechanism: "360LOCK", duration_days: 360 },
    brand_partners: { count: 6000, discovery_endpoint: "https://thegarden.nctr.live/api/brands" },
    enrollment: { url: "https://crescendo.nctr.live", agent_api: "https://thegarden.nctr.live/api/enroll" }
  }
}, null, 2);

const tiers = [
  { name: "Bronze", emoji: "🥉", multiplier: "1×" },
  { name: "Silver", emoji: "🥈", multiplier: "1.25×" },
  { name: "Gold", emoji: "🥇", multiplier: "1.5×" },
  { name: "Platinum", emoji: "💎", multiplier: "2×" },
  { name: "Diamond", emoji: "💠", multiplier: "2.5×" },
];

const steps = [
  { icon: Search, label: "Discover", desc: "Your agent reads our .well-known/ucp manifest and discovers commerce + loyalty capabilities" },
  { icon: ShoppingBag, label: "Route", desc: "Agent searches 6,000+ brand partners, finds products, and routes purchases through The Garden" },
  { icon: TrendingUp, label: "Earn", desc: "Every transaction earns NCTR. Crescendo tier progression multiplies earning power over time." },
];

const mcpTools = [
  { name: "search_bounties", desc: "Search and filter NCTR earning opportunities. Filter by category, amount, keyword, or repeatable status.", params: ["category", "min_amount", "max_amount", "keyword", "repeatable_only"] },
  { name: "get_earning_rates", desc: "Get Crescendo tier multipliers and calculate tier-adjusted earnings for any bounty.", params: ["tier", "bounty_id"] },
  { name: "check_tier_requirements", desc: "Check tier progression path. See which tiers are unlocked at a given NCTR balance and what's needed to reach the next level.", params: ["current_balance", "target_tier"] },
  { name: "get_active_promotions", desc: "Get current limited-time promotions and bonus earning opportunities.", params: [] },
  { name: "get_onboarding_link", desc: "Generate a join link for new members. Supports referral tracking.", params: ["referral_code"] },
  { name: "get_commerce_categories", desc: "Get the list of commerce verticals available in The Garden's brand partner network.", params: [] },
];

const MCP_URL = "https://rndivcsonsojgelzewkb.supabase.co/functions/v1/mcp/rpc";

const curlExample = `curl -X POST ${MCP_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`;

const ForAgentsPage = () => {

  return (
    <div style={{ background: "#121212", minHeight: "100vh" }}>
      <SEOHead
        title="For AI Agents — NCTR Commerce Infrastructure"
        description="Connect your AI agent to 6,000+ brands via UCP. The Garden is the first commerce gateway with a built-in loyalty rewards layer."
        canonicalPath="/for-agents"
      />

      <div className="mx-auto px-6 pb-20" style={{ maxWidth: 840 }}>

        {/* ── Hero ── */}
        <section className="pt-16 pb-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <p className="text-xs font-medium tracking-widest uppercase mb-6" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>
            For AI Agents
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            Connect Your Agent to 6,000+ Brands
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
            The Garden is the first UCP-compatible commerce gateway with a built-in loyalty rewards layer. Your agent discovers brands, routes purchases, and earns NCTR — all programmatically.
          </p>
        </section>

        {/* ── How Agent Discovery Works ── */}
        <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <h2 className="text-2xl font-bold mb-10" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            How Agent Discovery Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.label} className="rounded-xl p-6" style={{ background: "#1E1E1E", border: "1px solid #2A2A2A" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "#E2FF6D", color: "#121212" }}>
                    {i + 1}
                  </div>
                  <span className="text-base font-semibold" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>{s.label}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── UCP Manifest ── */}
        <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            UCP Manifest
          </h2>
          <p className="text-sm mb-6" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
            Add this endpoint to your agent's service discovery:{" "}
            <code className="font-mono px-2 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#E2FF6D" }}>
              https://thegarden.nctr.live/.well-known/ucp
            </code>
          </p>
          <CodeBlock>{ucpManifest}</CodeBlock>
        </section>

        {/* ── MCP Server — Live ── */}
        <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
              MCP Server
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#E2FF6D" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#4ADE80" }} /> Live
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-6 max-w-2xl" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
            Connect any MCP-compatible agent (Claude, Perplexity Comet, OpenClaw) to The Garden's commerce infrastructure.
          </p>

          <div className="space-y-3 mb-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#5A5A58" }}>Server URL</p>
              <CodeBlock>{MCP_URL}</CodeBlock>
            </div>
            <div className="flex gap-6 text-sm" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <div><span style={{ color: "#5A5A58" }}>Transport:</span> <span style={{ color: "#D9D9D9" }}>SSE (Server-Sent Events)</span></div>
              <div><span style={{ color: "#5A5A58" }}>Required Header:</span> <code className="font-mono px-2 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#E2FF6D" }}>Accept: application/json, text/event-stream</code></div>
            </div>
          </div>

          {/* Available Tools */}
          <h3 className="text-lg font-bold mb-4" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>Available Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {mcpTools.map((tool) => (
              <div key={tool.name} className="rounded-xl p-5" style={{ background: "#1E1E1E", border: "1px solid #2A2A2A" }}>
                <code className="text-sm font-mono font-semibold" style={{ color: "#E2FF6D" }}>{tool.name}</code>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>{tool.desc}</p>
                {tool.params.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tool.params.map((p) => (
                      <span key={p} className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#5A5A58" }}>{p}</span>
                    ))}
                  </div>
                )}
                {tool.params.length === 0 && (
                  <p className="text-xs mt-3 font-mono" style={{ color: "#5A5A58" }}>no parameters</p>
                )}
              </div>
            ))}
          </div>

          {/* Quick Start */}
          <h3 className="text-lg font-bold mb-4" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>Quick Start</h3>
          <CodeBlock>{curlExample}</CodeBlock>
        </section>

        {/* ── Earning Structure ── */}
        <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <h2 className="text-2xl font-bold mb-8" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            Earning Structure
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A2A" }}>
            <table className="w-full text-sm" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <thead>
                <tr style={{ background: "#1E1E1E" }}>
                  <th className="text-left px-5 py-3 font-semibold" style={{ color: "#D9D9D9" }}>Tier</th>
                  <th className="text-right px-5 py-3 font-semibold" style={{ color: "#D9D9D9" }}>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr key={t.name} style={{ background: i % 2 === 0 ? "#161616" : "#1A1A1A", borderTop: "1px solid #2A2A2A" }}>
                    <td className="px-5 py-3.5" style={{ color: "#FFFFFF" }}>
                      <span className="mr-2">{t.emoji}</span>{t.name}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium" style={{ color: "#E2FF6D" }}>
                      {t.multiplier}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-4 leading-relaxed" style={{ color: "#5A5A58", fontFamily: "DM Sans, sans-serif" }}>
            Tier thresholds shown are illustrative. Final thresholds announced at{" "}
            <a href="https://crescendo.nctr.live" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: "#5A5A58" }}>
              crescendo.nctr.live
            </a>
          </p>
          <div className="mt-6 rounded-lg px-5 py-4" style={{ background: "#1E1E1E", border: "1px solid #2A2A2A" }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>360LOCK Commitment</p>
            <p className="text-sm leading-relaxed" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
              NCTR earned is committed for 360 days. Tokens remain yours after the lock period.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-14 text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            Ready to integrate?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#5A5A58", fontFamily: "DM Sans, sans-serif" }}>
            Get in touch or explore The Garden yourself.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:anderson@butterflystudios.live"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#E2FF6D", color: "#121212", fontFamily: "DM Sans, sans-serif" }}
            >
              Contact Us <ArrowRight size={16} />
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}
            >
              Explore The Garden
            </a>
          </div>
        </section>

        <p className="text-center text-xs pb-4" style={{ color: "#3A3A38", fontFamily: "DM Sans, sans-serif" }}>
          NCTR Alliance — Live and Earn
        </p>
      </div>
    </div>
  );
};

export default ForAgentsPage;
