import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureSectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  icon: string;
  gradient?: boolean;
}

const FeatureSection = ({ 
  title, 
  description, 
  buttonText, 
  buttonHref, 
  icon, 
  gradient = false 
}: FeatureSectionProps) => {
  return (
    <section className={`py-32 relative overflow-hidden ${gradient ? 'bg-gradient-to-br from-secondary/30 via-background to-muted/20' : 'bg-background'}`}>
      {/* Organic Background Elements */}
      {gradient && (
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-glow/8 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/6 rounded-full blur-3xl animate-float [animation-delay:2s]" />
        </div>
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* 3D-Inspired Feature Card */}
          <div className="relative group">
            {/* Floating Icon with Premium Effects */}
            <div className="flex justify-center mb-12">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-premium rounded-3xl shadow-large flex items-center justify-center group-hover:shadow-glow-intense transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 animate-scale-in">
                  <span className="text-5xl animate-pulse-glow">{icon}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-premium rounded-3xl opacity-30 blur-xl scale-75 group-hover:scale-100 transition-transform duration-700" />
              </div>
            </div>
            
            {/* Layered Content with Depth */}
            <div className="text-center space-y-8 animate-fade-in-up">
              <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                <span className="bg-gradient-premium bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
                  {title.split(' ').slice(0, 2).join(' ')}
                </span>
                {title.split(' ').length > 2 && (
                  <span className="block text-foreground mt-2">
                    {title.split(' ').slice(2).join(' ')}
                  </span>
                )}
              </h2>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                {description}
              </p>
              
              {/* Premium CTA with 3D Effects */}
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-depth hover:bg-gradient-premium text-white text-xl px-12 py-8 rounded-2xl shadow-large hover:shadow-glow-intense transition-all duration-500 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {buttonText}
                    <div className="w-2 h-2 bg-white rounded-full group-hover:w-8 transition-all duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-premium opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;