import { ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import CollectSkillContent from "@/components/for-agents/CollectSkillContent";
import InvestSkillContent from "@/components/for-agents/InvestSkillContent";

const SkillSection = ({
  id, label, title, subtitle, description, borderColor, children,
}: {
  id: string; label: string; title: string; subtitle: string; description: string; borderColor: string; children: React.ReactNode;
}) => (
  <section id={id} className="py-16 scroll-mt-20">
    <div className="rounded-2xl p-8 md:p-10" style={{ background: "#161616", borderLeft: `4px solid ${borderColor}` }}>
      <span className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5" style={{ background: "#2A2A2A", color: borderColor }}>
        {label}
      </span>
      <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>{title}</h2>
      <p className="text-base font-medium mb-3" style={{ color: borderColor, fontFamily: "DM Sans, sans-serif" }}>{subtitle}</p>
      <p className="text-sm leading-relaxed mb-10 max-w-2xl" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>{description}</p>
      {children}
    </div>
  </section>
);

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
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4" style={{ color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
            NCTR Alliance — Built for Agents
          </h1>
          <p className="text-lg font-medium mb-4" style={{ color: "#E2FF6D", fontFamily: "DM Sans, sans-serif" }}>
            Two skills. One for agents that guide humans. One for agents that act autonomously.
          </p>
          <p className="text-base leading-relaxed max-w-2xl mb-8" style={{ color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}>
            NCTR (pronounced Nectar) is a participation token on Base. These skills teach your agent how to earn NCTR, unlock status tiers on Crescendo, and route commerce through The Garden. Choose the skill that matches your agent's capabilities.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#collect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#E2FF6D", color: "#121212", fontFamily: "DM Sans, sans-serif" }}
            >
              Skill 1: Collect NCTR Bounties <ArrowRight size={16} />
            </a>
            <a
              href="#invest"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D9D9D9", fontFamily: "DM Sans, sans-serif" }}
            >
              Skill 2: Invest in NCTR Infrastructure <ArrowRight size={16} />
            </a>
          </div>
        </section>

        {/* ── Skill 1: Collect ── */}
        <SkillSection
          id="collect"
          label="Human-guided agent"
          title="Skill 1: Collect NCTR Bounties"
          subtitle="For agents that discover and route — no wallet required"
          description="Helps your agent surface earning opportunities, compare 90LOCK vs 360LOCK options, and guide humans to the right actions on The Garden and Crescendo."
          borderColor="#E2FF6D"
        >
          <CollectSkillContent />
        </SkillSection>

        {/* ── Skill 2: Invest ── */}
        <SkillSection
          id="invest"
          label="Autonomous wallet agent"
          title="Skill 2: Invest in NCTR Infrastructure"
          subtitle="For Felix-class agents with independent wallets"
          description="Helps wallet-enabled agents evaluate NCTR as operational infrastructure, calculate ROI of status tiers, execute purchases on Aerodrome, and commit via 360LOCK to unlock amplified earning capacity."
          borderColor="#FFFFFF"
        >
          <InvestSkillContent />
        </SkillSection>

        {/* ── CTA ── */}
        <section className="py-14 text-center border-t" style={{ borderColor: "#2A2A2A" }}>
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
