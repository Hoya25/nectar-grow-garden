import React from "react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-garden-new.jpg";
import nctrLogo from "@/assets/nctr-n-transparent.png";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
            {/* Logo */}
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <img 
                src={nctrLogo} 
                alt="NCTR Logo" 
                className="h-20 w-auto drop-shadow-2xl"
              />
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight animate-fade-in-up drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'}}>
              The Garden
            </h1>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in-up [animation-delay:0.1s] opacity-0 [animation-fill-mode:forwards] drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
              <span className="text-yellow-300 animate-gradient-shift bg-[length:200%_200%]">
                Coming Soon
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards] drop-shadow-xl font-semibold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.6)'}}>
              We're putting the finishing touches on something amazing. Your gateway to earning everyday rewards through our innovative ecosystem.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up [animation-delay:0.4s] opacity-0 [animation-fill-mode:forwards]">
              <Button 
                size="lg" 
                className="bg-white border-2 border-primary text-foreground hover:bg-section-highlight transition-all duration-500 hover:scale-105 text-lg px-8 py-6 shadow-large group relative overflow-hidden"
                onClick={() => window.open('https://www.nctr.live', '_blank')}
              >
                <span className="relative z-10">Visit NCTR.Live →</span>
                <div className="absolute inset-0 bg-section-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
            </div>

            {/* Coming Soon Details */}
            <div className="mt-12 animate-fade-in-up [animation-delay:0.6s] opacity-0 [animation-fill-mode:forwards]">
              <p className="text-lg text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>
                Thank you for your interest in The Garden. Stay tuned for the launch of everyday rewards for everyday people.
              </p>
            </div>
          </div>
        </div>
        
        {/* Enhanced Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-glow/3 rounded-full blur-lg animate-pulse-glow" />
      </section>
    </div>
  );
};

export default ComingSoon;