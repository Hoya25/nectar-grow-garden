import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      
      {/* Earn Crypto Every Day Section */}
      <FeatureSection
        title="Earn Crypto"
        description="In The Garden you'll find opportunities to earn NCTR (nectar), the next generation rewards Alliance Token, by doing the simple things you do every day. Like shopping. Buy the things you need and want, and get NCTR in return."
        buttonText="Enter The Garden →"
        icon=""
      />
      
      {/* How We're Democratizing Crypto Section */}
      <FeatureSection
        title="How We're Democratizing Crypto"
        description="We're breaking down the barriers that have kept crypto out of reach. No complex wallets, no technical knowledge required, no upfront investment. Just simple activities that earn you real crypto rewards."
        buttonText="Learn More →"
        icon=""
        gradient={true}
      />
      
      {/* Harvest NCTR Section */}
      <FeatureSection
        title="Harvest NCTR"
        description="Stack NCTR in your portfolio to open new opportunities across the crypto universe–like experiences, new product releases from our partners and amplified earning opportunities."
        buttonText="Learn More About NCTR →"
        icon=""
        gradient={true}
      />
      
      {/* Grow The Community Section */}
      <FeatureSection
        title="Grow The Community"
        description="The Garden is built to grow. The more we grow the community together, the more NCTR we collect together. And the more NCTR we have, the more partners we attract with incredible benefits for members."
        buttonText="Invite a Friend →"
        icon=""
      />
      
      {/* Partner With The Garden Section */}
      <FeatureSection
        title="Partner With The Garden"
        description="The Garden is built on Base so that we can unlock as many opportunities as possible for our members. Our community is built on loyalty so that our partners can attract and reward their biggest fans."
        buttonText="Explore Partnership Opportunities →"
        icon=""
        gradient={true}
      />
      
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
