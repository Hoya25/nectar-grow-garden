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
    <section className={`py-24 ${gradient ? 'bg-gradient-card' : 'bg-background'}`}>
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto shadow-medium border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-glow">
              <span className="text-4xl">{icon}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {title}
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
            
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 transition-all duration-300 hover:scale-105"
            >
              {buttonText}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FeatureSection;