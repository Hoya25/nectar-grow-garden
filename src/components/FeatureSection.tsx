import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureSectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  icon: string;
  gradient?: boolean;
  bulletPoints?: string[];
}

const FeatureSection = ({ 
  title, 
  description, 
  buttonText, 
  buttonHref, 
  icon, 
  gradient = false,
  bulletPoints
}: FeatureSectionProps) => {
  return (
    <section className={`py-32 relative overflow-hidden ${gradient ? 'neon-section animate-neon-pulse' : 'neon-section-subtle'}`}>
      {/* Neon Background Elements */}
      {gradient && (
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float [animation-delay:2s]" />
        </div>
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* 3D-Inspired Feature Card */}
          <div className="relative group">
            {/* Floating Icon with Neon Effects */}
            {icon && (
              <div className="flex justify-center mb-12">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-premium rounded-3xl shadow-neon flex items-center justify-center group-hover:shadow-glow-intense transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 animate-scale-in neon-glow">
                    <span className="text-5xl section-text animate-pulse-glow">{icon}</span>
                  </div>
                  <div className="absolute inset-0 bg-primary/20 rounded-3xl opacity-30 blur-xl scale-75 group-hover:scale-100 transition-transform duration-700" />
                </div>
              </div>
            )}
            
            {/* Layered Content with Neon Typography */}
            <div className="text-center space-y-8 animate-fade-in-up">
              <h2 className="text-5xl md:text-6xl font-bold leading-tight section-heading">
                <span className="nctr-glow animate-nctr-glow">
                  {title.split(' ').slice(0, 2).join(' ')}
                </span>
                {title.split(' ').length > 2 && (
                  <span className="block section-text mt-2">
                    {title.split(' ').slice(2).join(' ')}
                  </span>
                )}
              </h2>
              
              
              <div className="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-medium section-text/90 space-y-6">
                <p>{description}</p>
                
                {bulletPoints && (
                  <ul className="space-y-4 text-left max-w-3xl mx-auto">
                    {bulletPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-primary text-2xl leading-none mt-1">•</span>
                        <span className="text-lg md:text-xl leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Premium CTA with Neon Effects */}
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary-glow text-primary-foreground text-xl px-12 py-8 rounded-2xl shadow-neon hover:shadow-glow-intense transition-all duration-500 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group neon-glow"
                  onClick={() => {
                    if (buttonHref) {
                      window.open(buttonHref, '_blank');
                    }
                  }}
                >
                  <span className="relative z-10 flex items-center gap-3 font-bold">
                    {buttonText}
                    <div className="w-2 h-2 bg-primary-foreground rounded-full group-hover:w-8 transition-all duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-primary-glow opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
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