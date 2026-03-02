import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import { FeaturedBrandShowcase } from "@/components/FeaturedBrandShowcase";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import { BrandSubmissionForm } from "@/components/BrandSubmissionForm";
import SEOHead from "@/components/SEOHead";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Garden by NCTR Alliance",
    "url": "https://thegarden.nctr.live",
    "description": "Commerce gateway with 6,000+ brand partners. Earn NCTR through everyday shopping. Live and Earn.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://thegarden.nctr.live/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "offers": {
      "@type": "AggregateOffer",
      "description": "6,000+ brand partners across major retail categories",
      "offerCount": 6000,
      "category": ["Shopping", "Sports & Outdoor", "Entertainment", "Home & Services", "Health & Wellness"]
    },
    "memberOf": {
      "@type": "LoyaltyProgram",
      "name": "Crescendo by NCTR Alliance",
      "url": "https://crescendo.nctr.live",
      "description": "Tiered participation economy. Earn NCTR on every transaction. Commit via 360LOCK. Progress through Bronze, Silver, Gold, Platinum, Diamond tiers with increasing earning multipliers."
    }
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="The Garden | Shop 6,800+ Brands, Earn NCTR"
        description="Turn everyday purchases into real rewards. Shop 6,800+ brands and earn NCTR with every purchase."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
      <Header />
      <Hero />
      
      {/* Shop. Earn. Unlock. — DARK section, lime highlights */}
      <FeatureSection
        title="Shop. Earn. Unlock."
        subtitle="Turn Your Everyday Purchases into Real Rewards"
        description="Step into The Garden and start earning NCTR simply by shopping with 6,000+ brands you already love. Every purchase builds your position in the community."
        bulletPoints={[
          "Shop with brands you love through The Garden and earn NCTR on every purchase",
          "Invite friends — both earn 500 NCTR when they join"
        ]}
        buttonText="Enter The Garden →"
        buttonHref="/garden"
        icon=""
        darkSection={true}
      />
      
      {/* Bridge text — light */}
      <div className="text-center py-8 bg-white">
        <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed text-[#5A5A58]">
          Safe, simple, and free to start. Earn rewards regardless of how much time or money you have.
        </p>
      </div>
      
      {/* How We're Democratizing Crypto Section */}
      <FeatureSection
        title="Rewards Without the Gatekeeping"
        description="Most rewards programs only benefit people who spend the most. The Garden rewards everyone who participates. No complex setup. No buy-in required. Just your everyday activity earning you real value."
        buttonText="Learn More →"
        buttonHref="https://substack.com/home/post/p-166993122"
        icon=""
        darkSection={false}
      />
      
      {/* Commit. Level Up. — DARK section */}
      <FeatureSection
        title="Commit. Level Up. Unlock More."
        description="Commit your earned NCTR with 360LOCK to build your Crescendo status. Higher status unlocks exclusive rewards, bigger earning opportunities, and access that keeps growing with your commitment."
        buttonText="Learn More About NCTR →"
        buttonHref="https://substack.com/home/post/p-166993122"
        icon=""
        darkSection={true}
      />
      
      {/* Grow The Community — LIGHT section */}
      <FeatureSection
        title="Grow The Community"
        description="The Garden grows with its members. Every invite strengthens the community, attracts more brand partners, and creates more earning opportunities for everyone. Your participation builds something real."
        buttonText="Invite a Friend →"
        buttonHref="/auth"
        icon=""
        darkSection={false}
      />
      
      {/* Divider */}
      <div className="bg-white"><div className="container mx-auto max-w-4xl"><div className="h-px bg-[#D9D9D9]" /></div></div>

      {/* Featured Brand — Kroma Wellness */}
      <FeaturedBrandShowcase />

      {/* Partner With The Garden — DARK section */}
      <div className="py-12 md:py-20 px-4 bg-[#323232]">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#E2FF6D]">
            Partner With The Garden
          </h2>
          <p className="text-lg text-[#D9D9D9] mb-8 leading-relaxed">
            Our community is built on loyalty. Partners join The Garden to connect with engaged, committed members who actively support brands they believe in.
          </p>
          <BrandSubmissionForm>
            <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-[#E2FF6D] text-[#323232] rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105">
              Explore Partnership Opportunities →
            </button>
          </BrandSubmissionForm>
        </div>
      </div>
      
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
