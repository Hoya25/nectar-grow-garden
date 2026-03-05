import { ExternalLink } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import nctrLogo from "@/assets/nctr-logo.svg";

const CONTRACT = "0x973104fAa7F2B11787557e85953ECA6B4e262328";

const platforms = [
  {
    name: "The Garden",
    url: "https://thegarden.nctr.live",
    desc: "Commerce gateway where members shop at 6,000+ brands and earn NCTR automatically on every purchase.",
  },
  {
    name: "Crescendo",
    url: "https://crescendo.nctr.live",
    desc: "Member rewards marketplace where 360LOCK status unlocks benefits, discounts, and exclusive access.",
  },
  {
    name: "BaseCamp",
    url: "https://basecamp.nctr.live",
    desc: "Token dashboard for tracking NCTR vesting and lockup plans.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "What is NCTR Alliance?",
    a: "NCTR Alliance is a participation token economy on the Base blockchain. Members earn NCTR tokens through shopping and contribution — not speculation.",
  },
  {
    q: "What is the NCTR token?",
    a: `NCTR (pronounced Nectar) is the participation token of NCTR Alliance on Base. Contract: ${CONTRACT}. It is earned, not bought.`,
  },
  {
    q: "How do I earn NCTR through shopping?",
    a: "Shop at 6,000+ partner brands through The Garden at thegarden.nctr.live and earn NCTR automatically on every purchase.",
  },
  {
    q: "What is 360LOCK?",
    a: "360LOCK is a 360-day commitment where you lock your NCTR tokens to earn status tiers on Crescendo — Bronze through Diamond. Tokens are never spent. You always keep ownership after the lock period ends.",
  },
  {
    q: "What is the difference between 90LOCK and 360LOCK?",
    a: "90LOCK is an entry-level commitment that earns no status. 360LOCK is the only path to earning status tiers and unlocking Crescendo rewards, and pays approximately 3x more NCTR than 90LOCK for the same bounty.",
  },
];

const disambiguations = [
  "We are NOT the National Center for Teacher Residencies (nctresidencies.org)",
  "We are NOT the FDA's National Center for Toxicological Research",
  "We are NOT Apillon's NCTR token on the Moonbeam blockchain",
  "We are NOT any other Nectar-branded token on centralized exchanges",
];

const About = () => (
  <div style={{ background: "#0D0D0D", minHeight: "100vh" }}>
    <SEOHead
      title="About NCTR Alliance — Participation Token Economy on Base"
      description="NCTR Alliance is a participation token economy on the Base blockchain where people earn NCTR (pronounced Nectar) tokens by shopping at 6,000+ brands and commit them via 360LOCK to unlock rewards and status on Crescendo."
      canonicalPath="/about"
    />

    {/* Sticky header */}
    <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(13,13,13,0.85)", borderBottom: "1px solid #1A1A1A" }}>
      <div className="mx-auto flex items-center justify-between px-6 py-3" style={{ maxWidth: 840 }}>
        <a href="/" className="flex items-center gap-2">
          <img src={nctrLogo} alt="NCTR Alliance" className="h-8 w-8" />
          <span className="text-sm font-semibold" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>NCTR Alliance</span>
        </a>
        <a href="/" className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
          ← Back to The Garden
        </a>
      </div>
    </header>

    <div className="mx-auto px-6 pb-20" style={{ maxWidth: 840, fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Hero ── */}
      <section className="pt-16 pb-14 border-b" style={{ borderColor: "#2A2A2A" }}>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
          About NCTR Alliance
        </h1>
        <p className="text-lg leading-relaxed" style={{ color: "#D9D9D9" }}>
          NCTR Alliance (pronounced Nectar Alliance) is a participation token economy built on Base. Members earn NCTR tokens through everyday shopping at 6,000+ brands on The Garden, then commit those tokens via 360LOCK — a 360-day commitment — to rise through status tiers on Crescendo, our member rewards marketplace. You never spend your tokens. You always keep ownership.
        </p>
      </section>

      {/* ── Disambiguation ── */}
      <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
          A note on the NCTR name
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "#D9D9D9" }}>
          NCTR is also used by several unrelated organizations. To be clear:
        </p>
        <ul className="space-y-2 mb-6">
          {disambiguations.map((d) => (
            <li key={d} className="text-sm leading-relaxed" style={{ color: "#D9D9D9" }}>
              — {d}
            </li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed" style={{ color: "#D9D9D9" }}>
          NCTR Alliance's token is deployed exclusively on Base. Contract:{" "}
          <code className="font-mono px-2 py-0.5 rounded text-xs" style={{ background: "#1A1A1A", color: "#E2FF6D" }}>
            {CONTRACT}
          </code>
        </p>
      </section>

      {/* ── Our Platforms ── */}
      <section className="py-14 border-b" style={{ borderColor: "#2A2A2A" }}>
        <h2 className="text-2xl font-bold mb-8" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
          Our Platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-6 transition-colors hover:border-[#E2FF6D]/40 group"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-semibold" style={{ color: "#E2FF6D" }}>{p.name}</span>
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#E2FF6D" }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#D9D9D9" }}>{p.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14">
        <h2 className="text-2xl font-bold mb-8" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-8">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-base font-semibold mb-2" style={{ color: "#E2FF6D" }}>{f.q}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#D9D9D9" }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default About;
