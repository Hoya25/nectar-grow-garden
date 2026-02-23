import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const quickStartSteps = [
  {
    step: "1",
    title: "Sign Up Free",
    description: "Create your account in seconds — no payment or buy-in required.",
    icon: "✨",
  },
  {
    step: "2",
    title: "Shop Through The Garden",
    description: "Browse 6,000+ brands and shop the ones you already love. Every purchase earns you NCTR.",
    icon: "🛍️",
  },
  {
    step: "3",
    title: "Commit & Level Up",
    description: "Use 360LOCK to commit your NCTR and build your Crescendo status — Bronze through Diamond.",
    icon: "📈",
  },
  {
    step: "4",
    title: "Invite & Grow",
    description: "Invite friends and both earn 500 NCTR. A bigger community means better rewards for everyone.",
    icon: "🤝",
  },
];

const earningTips = [
  {
    title: "Shop brands you already use",
    description: "No need to change habits — just route your purchases through The Garden to start earning.",
    icon: "💡",
  },
  {
    title: "Check in daily",
    description: "Build a daily check-in streak for bonus NCTR. Consistency compounds your rewards.",
    icon: "🔥",
  },
  {
    title: "Commit with 360LOCK",
    description: "Longer commitments unlock higher Crescendo tiers with better earning multipliers and exclusive access.",
    icon: "🔒",
  },
  {
    title: "Invite friends",
    description: "Both you and your friend earn 500 NCTR when they join. More members means more brand partnerships.",
    icon: "👥",
  },
  {
    title: "Complete Learn & Earn modules",
    description: "Watch short videos and pass quizzes to earn NCTR while learning about the ecosystem.",
    icon: "🎓",
  },
  {
    title: "Look for promoted brands",
    description: "Some brands offer boosted NCTR rates during special campaigns — shop those first for maximum rewards.",
    icon: "⭐",
  },
];

const generalFaqs = [
  {
    question: "What is The Garden?",
    answer: "The Garden is a shopping rewards platform where you earn NCTR by purchasing from 6,000+ brands. Your NCTR builds your Crescendo membership status, unlocking better rewards and exclusive opportunities. No buy-in required — just shop and earn.",
    icon: "🌱",
  },
  {
    question: "What is NCTR?",
    answer: "NCTR is what you earn by shopping and participating in The Garden. Think of NCTR like loyalty points — except they are real digital assets you own and control. Commit them with 360LOCK to build your Crescendo status and unlock better rewards. Your NCTR stays yours — it is never spent when committed, just set aside for a period.",
    icon: "🌾",
  },
  {
    question: "How does The Garden work?",
    answer: "Sign up free. Shop through The Garden with brands you already love. Every purchase earns you NCTR. Commit your NCTR with 360LOCK to level up your Crescendo status (Bronze through Diamond). Higher status unlocks better rewards and bigger earning opportunities. Invite friends and both earn 500 NCTR.",
    icon: "⚡",
  },
  {
    question: "Is The Garden free to join?",
    answer: "Yes — completely free. There is no buy-in, subscription, or hidden cost. You earn NCTR simply by shopping through The Garden with brands you already use.",
    icon: "🆓",
  },
  {
    question: "How do I earn NCTR?",
    answer: "You earn NCTR every time you shop through The Garden. Additional ways include daily check-ins, referrals (500 NCTR for both you and your friend), Learn & Earn modules, and participating in community activities.",
    icon: "💰",
  },
];

const crescendoFaqs = [
  {
    question: "What is Crescendo?",
    answer: "Crescendo is The Garden's membership status system. As you commit more NCTR with 360LOCK, you rise through tiers — Bronze, Silver, Gold, Platinum, and Diamond. Each tier unlocks better earning rates, exclusive rewards, and premium access.",
    icon: "🎵",
  },
  {
    question: "What is 360LOCK?",
    answer: "360LOCK is how you commit your earned NCTR to build your Crescendo status. You set aside your NCTR for a period (90 or 360 days). Your NCTR is never spent — it stays yours and is simply committed for the duration. Longer commitments unlock higher tiers.",
    icon: "🔐",
  },
  {
    question: "What are the Crescendo tiers?",
    answer: "There are five tiers: Bronze, Silver, Gold, Platinum, and Diamond. Each requires more committed NCTR and unlocks progressively better rewards, higher earning multipliers, and exclusive opportunities. Everyone starts earning from day one — no tier needed to begin.",
    icon: "🏆",
  },
  {
    question: "Can I lose my Crescendo status?",
    answer: "Your status is maintained as long as your NCTR remains committed through 360LOCK. When your commitment period ends, you can recommit to maintain or upgrade your status.",
    icon: "🛡️",
  },
];

const nctrFaqs = [
  {
    question: "What is the official NCTR contract address?",
    answer: "The official NCTR contract address is: 0x973104fAa7F2B11787557e85953ECA6B4e262328. This is the ONLY official contract. Always verify before any transactions. Do not confuse with any other assets that may share the same name.",
    icon: "⚠️",
  },
  {
    question: "How do I track my NCTR?",
    answer: "Your NCTR balance, committed amounts, and earning history are all visible in your Garden profile. You can see available NCTR, committed NCTR, pending earnings, and your complete transaction history.",
    icon: "📊",
  },
  {
    question: "Can I withdraw my NCTR?",
    answer: "Yes. Available (uncommitted) NCTR can be withdrawn to your connected address. Committed NCTR remains locked until the end of your 360LOCK period, at which point it becomes available again.",
    icon: "💸",
  },
];

const FAQSection = ({
  title,
  faqs,
}: {
  title: string;
  faqs: { question: string; answer: string; icon: string }[];
}) => (
  <div className="mb-12">
    <h2 className="text-3xl md:text-4xl font-bold text-[#323232] mb-8">{title}</h2>
    <Accordion type="single" collapsible className="space-y-4">
      {faqs.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`${title}-${index}`}
          className="border-0 bg-transparent"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-[#D9D9D9] overflow-hidden">
            <AccordionTrigger className="px-6 py-5 text-left hover:bg-[#F5F5F5]/50 transition-all duration-300 hover:no-underline">
              <div className="flex items-center gap-4 w-full">
                <div className="w-10 h-10 bg-[#F5F5F5] border border-[#D9D9D9] rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg">{faq.icon}</span>
                </div>
                <span className="text-lg font-semibold text-[#323232] flex-1 text-left">
                  {faq.question}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-5 text-[#5A5A58] leading-relaxed text-base">
              <div className="pl-14">{faq.answer}</div>
            </AccordionContent>
          </div>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ...generalFaqs,
    ...crescendoFaqs,
    ...nctrFaqs,
  ].map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const FAQPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="FAQ | The Garden — Quick Start, Earning Tips & More"
        description="Everything you need to know about The Garden, NCTR rewards, Crescendo status, and how to earn. Quick-start guides and earning tips included."
        canonicalPath="/faq"
        jsonLd={jsonLd}
      />
      <Header />

      {/* Hero */}
      <section className="py-12 md:py-20 bg-[#323232] text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            How Can We <span className="text-[#E2FF6D]">Help?</span>
          </h1>
          <p className="text-lg md:text-xl text-[#D9D9D9] max-w-2xl mx-auto">
            Quick answers, getting-started guides, and earning tips — everything you need to make the most of The Garden.
          </p>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="py-12 md:py-20 bg-[#F5F5F5]">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-[#323232] mb-4">
                Quick Start Guide
              </h2>
              <p className="text-lg text-[#5A5A58]">
                Get started in under 2 minutes — here's how.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickStartSteps.map((step) => (
                <div
                  key={step.step}
                  className="bg-white rounded-2xl p-6 border border-[#D9D9D9] shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#323232] rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-[#E2FF6D]">
                        {step.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#323232] mb-1">
                        {step.title}
                      </h3>
                      <p className="text-[#5A5A58] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button
                size="lg"
                className="bg-[#323232] hover:bg-[#323232]/90 text-white text-lg px-10 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 font-bold"
                onClick={() => navigate("/auth")}
              >
                Get Started Free →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Earning Tips */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-[#323232] mb-4">
                Earning Tips
              </h2>
              <p className="text-lg text-[#5A5A58]">
                Maximize your NCTR with these simple strategies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {earningTips.map((tip, index) => (
                <div
                  key={index}
                  className="bg-[#F5F5F5] rounded-2xl p-6 border border-[#D9D9D9] hover:border-[#323232]/20 transition-all duration-300"
                >
                  <div className="text-3xl mb-4">{tip.icon}</div>
                  <h3 className="text-lg font-bold text-[#323232] mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-[#5A5A58] leading-relaxed text-sm">
                    {tip.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="h-px bg-[#D9D9D9]" />
        </div>
      </div>

      {/* FAQ Sections */}
      <section className="py-12 md:py-20 bg-[#F5F5F5]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-[#323232] mb-4">
                Frequently Asked Questions
              </h2>
              <div className="w-24 h-1 bg-[#323232] mx-auto rounded-full" />
            </div>

            <FAQSection title="Getting Started" faqs={generalFaqs} />
            <FAQSection title="Crescendo & Status" faqs={crescendoFaqs} />
            <FAQSection title="NCTR Details" faqs={nctrFaqs} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 bg-[#323232] text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#E2FF6D] mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-[#D9D9D9] mb-8 max-w-xl mx-auto">
            Join The Garden for free and turn everyday purchases into real rewards.
          </p>
          <Button
            size="lg"
            className="bg-[#E2FF6D] hover:bg-[#E2FF6D]/90 text-[#323232] text-lg px-10 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 font-bold"
            onClick={() => navigate("/auth")}
          >
            Enter The Garden →
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQPage;
