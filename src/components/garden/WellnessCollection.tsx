import { useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";

interface WellnessBrand {
  id: string;
  name: string;
  tagline: string;
  logo_url?: string;
  loyalize_id?: string;
  isFlagship?: boolean;
  nctr_per_dollar?: number;
}

interface WellnessCollectionProps {
  onShop?: (brandId: string, loyalizeId: string) => void;
  onBrandClick?: (brand: WellnessBrand) => void;
}

const WELLNESS_BRANDS: WellnessBrand[] = [
  {
    id: "637ae486-2ee7-4574-88cd-876771c59404",
    name: "Kroma Wellness",
    tagline: "Superfood nutrition & 5-Day Resets",
    isFlagship: true,
    nctr_per_dollar: 3,
  },
  {
    id: "3bad07be-4b6a-4181-a364-d5d1e155b25f",
    name: "CYMBIOTIKA",
    tagline: "Premium liquid supplements",
    logo_url: "https://api.loyalize.com/resources/stores/52637/logo",
    loyalize_id: "52637",
    nctr_per_dollar: 1.12,
  },
  {
    id: "placeholder-onda",
    name: "Onda Beauty",
    tagline: "Clean beauty, curated",
  },
  {
    id: "placeholder-remedy",
    name: "Remedy Place",
    tagline: "Social wellness club",
  },
  {
    id: "placeholder-nucifera",
    name: "Nucifera",
    tagline: "Plant-based skin nutrition",
  },
  {
    id: "b7050d5a-3b00-4054-89dd-0e1f063a1dcd",
    name: "Patagonia Provisions",
    tagline: "Outdoor gear, planet first",
    logo_url: "https://api.loyalize.com/resources/stores/1673/logo",
    loyalize_id: "1673",
    nctr_per_dollar: 1.12,
  },
  {
    id: "0a7e7262-a9e2-46a8-914b-2f9a4aa8e016",
    name: "REI",
    tagline: "Gear for getting outside",
    logo_url: "https://api.loyalize.com/resources/stores/45392/logo",
    loyalize_id: "45392",
    nctr_per_dollar: 0.7,
  },
];

export const WellnessCollection = ({ onShop, onBrandClick }: WellnessCollectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section className="mb-8 rounded-2xl p-6 md:p-8" style={{ background: "linear-gradient(135deg, #F5EDE3 0%, #FAFAF7 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl md:text-2xl font-bold text-[#3B2F25]">🌿 Wellness Collection</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full text-[#9B8570] hover:text-[#C4946A] hover:bg-[#EDE4D8] transition-colors hidden md:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full text-[#9B8570] hover:text-[#C4946A] hover:bg-[#EDE4D8] transition-colors hidden md:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-[#9B8570] mb-5">
        Nutrition, fitness, and healthy living — curated by INSPIRATION
      </p>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {WELLNESS_BRANDS.map((brand) => {
          const hasShop = !!brand.loyalize_id;
          return (
            <div
              key={brand.id}
              className={`snap-start flex-shrink-0 rounded-xl p-4 border transition-all cursor-pointer group hover:-translate-y-1 ${
                brand.isFlagship
                  ? "w-[230px] md:w-[260px] bg-white border-[#C4946A]/40 hover:border-[#C4946A] shadow-md"
                  : "w-[200px] md:w-[230px] bg-white/80 border-[#E8DFD3] hover:border-[#C4946A]/60 shadow-sm"
              }`}
              onClick={() => onBrandClick?.(brand)}
            >
              {/* Flagship badge */}
              {brand.isFlagship && (
                <div className="flex justify-center mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C4946A] text-white">
                    ✦ Flagship
                  </span>
                </div>
              )}

              {/* Logo */}
              <div className="flex justify-center mb-3 bg-[#F5EDE3]/60 rounded-lg p-3 aspect-square items-center">
                <BrandLogo
                  src={brand.logo_url}
                  alt={brand.name}
                  size="lg"
                  className="group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Name */}
              <h3 className="font-semibold text-[#3B2F25] text-center text-sm line-clamp-1 mb-1">
                {brand.name}
              </h3>

              {/* Tagline */}
              <p className="text-[11px] text-[#9B8570] text-center mb-2 line-clamp-2 min-h-[2rem]">
                {brand.tagline}
              </p>

              {/* Rate */}
              {brand.nctr_per_dollar && brand.nctr_per_dollar > 0 && (
                <p className={`text-xs text-center font-medium mb-2 ${brand.isFlagship ? "text-[#C4946A]" : "text-[#9B8570]"}`}>
                  Earn {brand.nctr_per_dollar % 1 === 0 ? brand.nctr_per_dollar.toFixed(0) : brand.nctr_per_dollar.toFixed(1)} NCTR/$1
                </p>
              )}

              {/* Button */}
              <Button
                size="sm"
                className={`w-full text-xs font-semibold ${
                  hasShop
                    ? brand.isFlagship
                      ? "bg-[#C4946A] text-white hover:bg-[#A97D5A]"
                      : "bg-[#3B2F25] text-white hover:bg-[#2A2019]"
                    : "bg-[#E8DFD3] text-[#9B8570] cursor-not-allowed"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasShop && onShop) onShop(brand.id, brand.loyalize_id!);
                }}
                disabled={!hasShop}
              >
                {hasShop ? (
                  <>
                    Shop Now
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  "Coming Soon"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-[#B8A898] text-center mt-3">
        The INSPIRATION wellness ecosystem — powered by NCTR Alliance
      </p>
    </section>
  );
};

export default WellnessCollection;
