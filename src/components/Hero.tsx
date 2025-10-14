import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-garden-new.jpg";
import nctrLogo from "@/assets/nctr-n-transparent.png";
import nctrOverlay from "@/assets/nctr-n-overlay.png";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Premium Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/20 to-background/30" />
        <div className="absolute inset-0 bg-gradient-glow opacity-2" />
      </div>
      
      {/* Content with Premium Animations */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-3xl font-semibold text-white mb-4 animate-fade-in-up drop-shadow-xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)'}}>
            Live and Earn.
          </p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up [animation-delay:0.1s] opacity-0 [animation-fill-mode:forwards] drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'}}>
            Everyday Crypto for{" "}
            <span className="text-yellow-300 animate-gradient-shift bg-[length:200%_200%] drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
              Everyday People
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards] drop-shadow-xl font-semibold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.6)'}}>
            Unlock Rewards by Simply Being Yourself: Turn Your Next Purchase or Friend Invite into Crypto Wins – Safe, Simple, Barrier-Free
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up [animation-delay:0.4s] opacity-0 [animation-fill-mode:forwards]">
            <Button 
              size="lg" 
              className="bg-white border-2 border-primary text-foreground hover:bg-section-highlight transition-all duration-500 hover:scale-105 text-lg px-8 py-6 shadow-large group relative overflow-hidden"
              onClick={() => navigate('/garden')}
            >
              <span className="relative z-10">Enter The Garden →</span>
              <div className="absolute inset-0 bg-section-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-glow/3 rounded-full blur-lg animate-pulse-glow" />
    </section>
  );
};

export default Hero;