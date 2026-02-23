import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";

const KROMA_LOGO = "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-logo.webp";

const FEATURED_PRODUCTS = [
  { name: "5-Day Reset Kit", tagline: "The flagship wellness reset" },
  { name: "Beauty Matcha", tagline: "Daily superfood ritual" },
  { name: "24K Bone Broth", tagline: "Gut health, golden" },
];

export const FeaturedBrandShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 px-4 bg-[hsl(var(--charcoal))]">
      <div className="container mx-auto max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-semibold border-0 bg-[hsl(var(--nctr-lime))] text-[hsl(var(--charcoal))]">
            ✨ Featured Brand
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Our Flagship INSPIRATION Partner
          </h2>
          <p className="text-[hsl(var(--mid-grey))] text-lg max-w-2xl mx-auto">
            Curated wellness brands powering the INSPIRATION Impact Engine
          </p>
        </div>

        {/* Kroma card */}
        <div
          className="rounded-2xl p-8 md:p-10 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
          style={{ background: "linear-gradient(135deg, #F5EDE3 0%, #FAFAF7 100%)" }}
          onClick={() => navigate("/brands/kroma-wellness")}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Logo + info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={KROMA_LOGO}
                  alt="Kroma Wellness logo"
                  className="h-16 w-16 rounded-xl object-contain bg-white p-1 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold" style={{ color: "#3D2E1F" }}>
                      Kroma Wellness
                    </h3>
                    <Badge className="border-0 text-xs font-semibold bg-[hsl(var(--nctr-lime))] text-[hsl(var(--charcoal))]">
                      🌿 INSPIRATION
                    </Badge>
                  </div>
                  <p className="text-sm italic" style={{ color: "#8B7355" }}>
                    "Food is medicine"
                  </p>
                </div>
              </div>

              <p className="text-base leading-relaxed mb-6" style={{ color: "#6B5B4A" }}>
                Kroma Wellness makes clean, superfood-powered nutrition accessible — from their iconic 5-Day Reset to everyday essentials like Beauty Matcha and 24K Bone Broth.
              </p>

              {/* Mini product pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {FEATURED_PRODUCTS.map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background: "#E8F5E2", color: "#2D6A2E" }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {p.name}
                  </span>
                ))}
              </div>

              <Button
                size="lg"
                className="rounded-full px-8 font-semibold border-0 shadow-md hover:shadow-lg transition-shadow"
                style={{ background: "#C4946A", color: "#FFFFFF" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/brands/kroma-wellness");
                }}
              >
                Explore Kroma <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Product image */}
            <div className="flex-shrink-0 hidden md:block">
              <img
                src="https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-reset-kit.webp"
                alt="Kroma 5-Day Reset Kit"
                className="w-64 h-64 object-contain rounded-xl"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
