import nctrLogo from "@/assets/nctr-logo.png";
import NCTRTicker from "@/components/NCTRTicker";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { settings } = useSiteSettings();
  return (
    <footer className="relative bg-gradient-to-br from-foreground via-primary-deep to-foreground text-background py-24 overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary-glow/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-float [animation-delay:2s]" />
        <div className="absolute inset-0 bg-gradient-glow opacity-20" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Premium Logo Section */}
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="flex items-center justify-center space-x-4 mb-8 group">
              <span className="text-4xl font-bold text-primary">The Garden</span>
              <img 
                src={nctrLogo} 
                alt="NCTR" 
                className="h-20 w-auto opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
            </div>
            
            {/* Premium Description */}
            <p className="text-xl text-background/90 leading-relaxed mb-12 max-w-4xl mx-auto font-medium">
              The Garden is an innovation from{" "}
              <span className="text-primary font-bold">
                Project Butterfly
              </span>
              . A blockchain initiative creating an ecosystem to harness our buying power 
              and influence to make a positive impact on our lives and the world.
            </p>
            
            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">              
              <div className="group">
                <div className="bg-background/10 backdrop-blur-md rounded-2xl p-8 shadow-large hover:shadow-glow-intense transition-all duration-500 hover:scale-105 border border-background/20">
                  <div className="text-3xl font-bold text-primary mb-2">{settings.site_stats?.brand_partners || "5K+"}</div>
                  <div className="text-background/80 font-medium">Brand Partners</div>
                </div>
              </div>
              
              <div className="group">
                <div className="bg-background/10 backdrop-blur-md rounded-2xl p-8 shadow-large hover:shadow-glow-intense transition-all duration-500 hover:scale-105 border border-background/20">
                  <NCTRTicker 
                    initialTotal={settings.nctr_distribution_rate?.current_total || 2500000}
                    tokensPerSecond={settings.nctr_distribution_rate?.tokens_per_second || 50}
                  />
                  <div className="text-background/80 font-medium">NCTR Distributed</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Premium Footer Bottom */}
          <div className="border-t border-background/20 pt-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-background/70 text-lg">
                © 2024 The Garden. All rights reserved.
              </p>
              
              <div className="flex items-center gap-6">
                <button className="text-background/70 hover:text-background hover:scale-110 transition-all duration-300">
                  Privacy Policy
                </button>
                <button className="text-background/70 hover:text-background hover:scale-110 transition-all duration-300">
                  Terms of Service  
                </button>
                <button className="text-background/70 hover:text-background hover:scale-110 transition-all duration-300">
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;