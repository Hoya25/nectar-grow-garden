import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureSectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  icon: string;
  gradient?: boolean;
  bulletPoints?: string[];
  titleColor?: string;
  simple?: boolean;
  subtitle?: string;
  darkSection?: boolean;
}

const FeatureSection = ({ 
  title, 
  description, 
  buttonText, 
  buttonHref, 
  icon, 
  gradient = false,
  bulletPoints,
  titleColor,
  simple = false,
  subtitle,
  darkSection = false,
}: FeatureSectionProps) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (buttonHref) {
      if (buttonHref.startsWith('http://') || buttonHref.startsWith('https://')) {
        window.open(buttonHref, '_blank');
      } else {
        navigate(buttonHref);
      }
    }
  };

  // Dark section: charcoal bg, white/lime text, lime highlights
  if (darkSection) {
    return (
      <section className="py-12 md:py-20 relative overflow-hidden bg-[#323232]">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="relative group">
              {icon && (
                <div className="flex justify-center mb-12">
                  <div className="w-24 h-24 bg-[#5A5A58] rounded-3xl flex items-center justify-center shadow-lg">
                    <span className="text-5xl">{icon}</span>
                  </div>
                </div>
              )}
              
              <div className="text-center space-y-8 animate-fade-in-up">
                <h2 className="text-5xl md:text-6xl font-bold leading-tight">
                  <span className={titleColor || "text-[#E2FF6D]"}>
                    {title.split(' ').slice(0, 2).join(' ')}
                  </span>
                  {title.split(' ').length > 2 && (
                    <span className="block text-white mt-2">
                      {title.split(' ').slice(2).join(' ')}
                    </span>
                  )}
                </h2>
                
                {subtitle && (
                  <h3 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">
                    {subtitle}
                  </h3>
                )}
                
                <div className="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-medium text-[#D9D9D9] space-y-6">
                  <p>{description}</p>
                  
                  {bulletPoints && (
                    <ul className="space-y-4 text-left max-w-3xl mx-auto">
                      {bulletPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-[#E2FF6D] text-2xl leading-none mt-1">•</span>
                          <span className="text-lg md:text-xl leading-relaxed text-white">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="pt-4">
                  <Button 
                    size="lg" 
                    className="bg-[#E2FF6D] hover:bg-[#E2FF6D]/90 text-[#323232] text-xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 font-bold"
                    onClick={handleClick}
                  >
                    <span className="flex items-center gap-3">
                      {buttonText}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Light section: white bg, charcoal text, mid-grey body, NO lime
  return (
    <section className="py-12 md:py-20 relative overflow-hidden bg-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="relative group">
            {icon && (
              <div className="flex justify-center mb-12">
                <div className="w-24 h-24 bg-[#F5F5F5] rounded-3xl border border-[#D9D9D9] flex items-center justify-center shadow-soft">
                  <span className="text-5xl">{icon}</span>
                </div>
              </div>
            )}
            
            <div className="text-center space-y-8 animate-fade-in-up">
              <h2 className="text-5xl md:text-6xl font-bold leading-tight text-[#323232]">
                {title}
              </h2>
              
              {subtitle && (
                <h3 className="text-2xl md:text-3xl font-semibold text-[#323232]/90 mb-6">
                  {subtitle}
                </h3>
              )}
              
              <div className="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-medium text-[#5A5A58] space-y-6">
                <p>{description}</p>
                
                {bulletPoints && (
                  <ul className="space-y-4 text-left max-w-3xl mx-auto">
                    {bulletPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-[#323232] text-2xl leading-none mt-1">•</span>
                        <span className="text-lg md:text-xl leading-relaxed text-[#5A5A58]">{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="bg-[#323232] hover:bg-[#323232]/90 text-white text-xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 font-bold"
                  onClick={handleClick}
                >
                  <span className="flex items-center gap-3">
                    {buttonText}
                  </span>
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
