import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import { BrandSubmissionForm } from "@/components/BrandSubmissionForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
      <div className="text-center py-12 bg-white">
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
      
      {/* Partner With The Garden — DARK section */}
      <div className="py-16 px-4 bg-[#323232]">
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
