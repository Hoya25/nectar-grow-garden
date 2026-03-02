import { useState } from "react";
import { Check, Copy } from "lucide-react";

const CodeBlock = ({ children, className = "" }: { children: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`relative group ${className}`}>
      <pre className="overflow-x-auto rounded-lg p-4 text-sm leading-relaxed" style={{ background: "#0D0D0D", color: "#D9D9D9" }}>
        <code className="whitespace-pre-wrap break-all">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "#2A2A2A" }}
      >
        {copied ? <Check size={14} color="#E2FF6D" /> : <Copy size={14} color="#D9D9D9" />}
      </button>
    </div>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-6" style={{ background: "#1E1E1E", border: "1px solid #2A2A2A" }}>
    <h2 className="text-xl font-semibold mb-4" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>{title}</h2>
    {children}
  </div>
);

const tools = [
  { name: "search_bounties", desc: "Search and filter all 19 available bounties by category, amount, keyword, or repeatability" },
  { name: "get_earning_rates", desc: "Get earning multipliers by Crescendo tier, with optional bounty calculations" },
  { name: "check_tier_requirements", desc: "Check tier thresholds, perks, and progress toward next tier" },
  { name: "get_active_promotions", desc: "Current limited-time offers and launch bonuses" },
  { name: "get_onboarding_link", desc: "Generate a join link with optional referral code" },
  { name: "get_impact_engines", desc: "Discover all 6 Impact Engine communities" },
];

const ucpManifest = `{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "dev.ucp.shopping": {
        "version": "2026-01-11",
        "spec": "https://ucp.dev/specification/overview",
        "rest": {
          "schema": "https://thegarden.nctr.live/api/ucp/openapi.json",
          "endpoint": "https://thegarden.nctr.live/api/ucp/v1"
        }
      }
    },
    "capabilities": [
      {
        "name": "dev.ucp.shopping.checkout",
        "version": "2026-01-11",
        "spec": "https://ucp.dev/specification/checkout",
        "schema": "https://ucp.dev/schemas/shopping/checkout.json"
      },
      {
        "name": "com.nctr.loyalty.rewards",
        "version": "2026-03-01",
        "extends": "dev.ucp.shopping.checkout",
        "description": "NCTR participation economy rewards — earn NCTR tokens on every commerce transaction routed through The Garden's 6,000+ brand partner network."
      }
    ]
  },
  "loyalty": {
    "provider": "NCTR Alliance",
    "program": "Crescendo",
    "currency": "NCTR",
    "earn_model": "commission_share",
    "avg_commission_rate": 0.05,
    "tiers": [
      { "name": "Bronze", "threshold": 0, "multiplier": 1.0 },
      { "name": "Silver", "multiplier": 1.25 },
      { "name": "Gold", "multiplier": 1.5 },
      { "name": "Platinum", "multiplier": 2.0 },
      { "name": "Diamond", "multiplier": 2.5 }
    ],
    "commitment": { "mechanism": "360LOCK", "duration_days": 360 },
    "brand_partners": { "count": 6000, "discovery_endpoint": "https://thegarden.nctr.live/api/brands" },
    "enrollment": { "url": "https://crescendo.nctr.live", "agent_api": "https://thegarden.nctr.live/api/enroll" }
  }
}`;

const links = [
  { url: "https://nctr.live", label: "nctr.live", desc: "NCTR Alliance" },
  { url: "https://thegarden.nctr.live", label: "thegarden.nctr.live", desc: "The Garden" },
  { url: "https://crescendo.nctr.live", label: "crescendo.nctr.live", desc: "Crescendo" },
  { url: "https://basecamp.nctr.live", label: "basecamp.nctr.live", desc: "BaseCamp" },
];

const ForAgentsPage = () => (
  <div style={{ background: "#121212", minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
    <div className="mx-auto px-6 pb-16" style={{ maxWidth: 800, paddingTop: 48 }}>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#FFFFFF" }}>
            NCTR Alliance — For AI Agents
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#D9D9D9" }}>
            Structured data for AI agents to discover and interact with the NCTR rewards program. Connect your AI client to our MCP server to access real-time bounty data, earning rates, tier progression, and Impact Engine communities.
          </p>
        </div>

        <Card title="MCP Server">
          <p className="mb-3 text-sm" style={{ color: "#D9D9D9" }}>Connect your AI client using this URL:</p>
          <CodeBlock>https://yhwcaodofmbusjurawhp.supabase.co/functions/v1/mcp/rpc</CodeBlock>
          <p className="mt-4 mb-3 text-sm" style={{ color: "#D9D9D9" }}>Claude Desktop / Cursor config:</p>
          <CodeBlock>{`{"mcpServers":{"nctr-alliance":{"url":"https://yhwcaodofmbusjurawhp.supabase.co/functions/v1/mcp/rpc"}}}`}</CodeBlock>
        </Card>

        <Card title="Available Tools">
          <div className="flex flex-col gap-3">
            {tools.map((t) => (
              <div key={t.name}>
                <code className="text-sm font-mono" style={{ color: "#E2FF6D" }}>{t.name}</code>
                <span className="text-sm ml-2" style={{ color: "#D9D9D9" }}>— {t.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Start">
          <CodeBlock>{`curl -X POST https://yhwcaodofmbusjurawhp.supabase.co/functions/v1/mcp/rpc \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_bounties","arguments":{}}}'`}</CodeBlock>
        </Card>

        <Card title="UCP Manifest">
          <p className="mb-3 text-sm" style={{ color: "#D9D9D9" }}>
            Universal Commerce Protocol config available at{" "}
            <a href="/.well-known/ucp.json" target="_blank" rel="noopener noreferrer" className="font-mono hover:underline" style={{ color: "#E2FF6D" }}>
              /.well-known/ucp.json
            </a>
          </p>
          <CodeBlock>{ucpManifest}</CodeBlock>
        </Card>

        <Card title="Ecosystem Links">
          <div className="flex flex-col gap-2">
            {links.map((l) => (
              <div key={l.url} className="text-sm">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline" style={{ color: "#E2FF6D" }}>
                  {l.label}
                </a>
                <span className="ml-2" style={{ color: "#D9D9D9" }}>— {l.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-center text-sm mt-4" style={{ color: "#5A5A58" }}>NCTR Alliance — Live and Earn</p>
      </div>
    </div>
  </div>
);

export default ForAgentsPage;
