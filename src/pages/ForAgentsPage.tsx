import { useState } from "react";
import { Check, Copy, ArrowRight, Mail, Search, ShoppingBag, TrendingUp } from "lucide-react";
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

const ForAgentsPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

        {/* ── MCP Server — Coming Soon ── */}
        <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
              MCP Integration
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: "#2A2A2A", color: "#E2FF6D" }}>
              Coming Soon
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
            We're building an MCP server so Claude, Perplexity Comet, and any MCP-compatible agent can connect to The Garden as a native tool. Sign up to be notified when it launches.
          </p>
          {submitted ? (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#E2FF6D" }}>
              <Check size={16} /> You're on the list. We'll be in touch.
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }}
              className="flex gap-3 max-w-md"
            >
              <div className="flex-1 relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5A5A58" }} />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#E2FF6D"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#2A2A2A"}
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#E2FF6D", color: "#121212", fontFamily: "DM Sans, sans-serif" }}
              >
                Notify Me
              </button>
            </form>
          )}
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
