import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-garden-new.jpg";
import nctrLogo from "@/assets/nctr-n-transparent.png";
import nctrOverlay from "@/assets/nctr-n-overlay.png";

const Hero = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Premium Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/50 to-background/80" />
        <div className="absolute inset-0 bg-gradient-glow opacity-15" />
      </div>
      
      {/* Content with Premium Animations */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight animate-fade-in-up">
            Crypto for{" "}
            <span className="bg-gradient-premium bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
              All of Us
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards]">
            Build your crypto portfolio with limited risk and financial barriers
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up [animation-delay:0.4s] opacity-0 [animation-fill-mode:forwards]">
            <Button 
              size="lg" 
              className="bg-white border-2 border-primary text-foreground hover:bg-section-highlight transition-all duration-500 hover:scale-105 text-lg px-8 py-6 shadow-large group relative overflow-hidden"
            >
              <span className="relative z-10">Enter The Garden →</span>
              <div className="absolute inset-0 bg-section-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-glow/8 rounded-full blur-2xl animate-pulse-glow" />
    </section>
  );
};

export default Hero;