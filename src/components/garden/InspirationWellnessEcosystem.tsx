import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface WellnessBrand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  nctr_per_dollar: number | null;
  loyalize_id: string | null;
  description: string | null;
  featured?: boolean;
  display_order?: number | null;
  website_url?: string | null;
}

interface InspirationWellnessEcosystemProps {
  onShop: (brandId: string, loyalizeId: string) => void;
  onBrandClick: (brand: WellnessBrand) => void;
}

const KROMA_LOGO = "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-logo.webp";
const KROMA_HERO = "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-reset-kit.webp";

export const InspirationWellnessEcosystem = ({ onShop, onBrandClick }: InspirationWellnessEcosystemProps) => {
  const [brands, setBrands] = useState<WellnessBrand[]>([]);
  const [kromaBrand, setKromaBrand] = useState<WellnessBrand | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrands = async () => {
      // Get INSPIRATION-tagged brand IDs
      const { data: tagData } = await supabase
        .from("brand_tags")
        .select("id")
        .eq("slug", "inspiration")
        .single();

      let taggedBrandIds: string[] = [];
      if (tagData) {
        const { data: assignments } = await supabase
          .from("brand_tag_assignments")
          .select("brand_id")
          .eq("tag_id", tagData.id);
        taggedBrandIds = (assignments || []).map((a) => a.brand_id).filter(Boolean) as string[];
      }

      // Also get wellness-category brands
      const { data: wellnessBrands } = await supabase
        .from("brands")
        .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, description, featured, display_order, website_url")
        .eq("is_active", true)
        .or("category.ilike.%wellness%,category.ilike.%health%");

      // Get tagged brands that may not match the category filter
      let taggedBrands: typeof wellnessBrands = [];
      if (taggedBrandIds.length > 0) {
        const { data } = await supabase
          .from("brands")
          .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, description, featured, display_order, website_url")
          .in("id", taggedBrandIds)
          .eq("is_active", true);
        taggedBrands = data || [];
      }

      // Merge and deduplicate
      const allBrands = [...(wellnessBrands || []), ...(taggedBrands || [])];
      const uniqueMap = new Map(allBrands.map((b) => [b.id, b]));
      const brandsData = Array.from(uniqueMap.values()).sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name));

      if (!brandsData.length) return;

      // Separate Kroma (flagship) from others
      const kroma = brandsData.find((b) => b.name.toLowerCase().includes("kroma"));
      const others = brandsData.filter((b) => b.id !== kroma?.id);

      setKromaBrand(kroma || null);
      setBrands(others);
    };
    fetchBrands();
  }, []);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  const handleShopClick = (brandId: string, loyalizeId: string) => {
    onShop(brandId, loyalizeId);
  };

  if (!kromaBrand && brands.length === 0) return null;

  return (
    <section
      className="mb-8 -mx-4 px-4 py-8 rounded-2xl"
      style={{ background: "linear-gradient(180deg, #F5EDE3 0%, #FDFAF6 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-[3px] h-[22px] rounded-full" style={{ background: "#C4946A" }} />
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(18px, 2.2vw, 24px)",
                fontWeight: 900,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                color: "#3B2F25",
                margin: 0,
              }}
            >
              🌿 INSPIRATION — Wellness Ecosystem
            </h2>
          </div>
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
        <p className="text-sm text-[#9B8570] mb-6">
          Shop these brands. Earn INSPIRATION. Unlock wellness rewards on Crescendo.
        </p>

        {/* Brand Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Kroma Flagship Card */}
          {kromaBrand && (
            <div
              className="snap-start flex-shrink-0 w-[300px] md:w-[340px] rounded-xl p-5 border border-[#C4946A]/30 bg-white shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              onClick={() => navigate("/brands/kroma-wellness")}
            >
              {/* Flagship badge */}
              <div className="flex justify-center mb-3">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "#E2FF6D", color: "#323232" }}
                >
                  ✦ Flagship Partner
                </span>
              </div>

              {/* Logo */}
              <div className="flex justify-center mb-3">
                <img
                  src={KROMA_LOGO}
                  alt="Kroma Wellness"
                  className="h-10 object-contain group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Hero product image */}
              <div className="flex justify-center mb-4 bg-[#F5EDE3]/60 rounded-lg p-3">
                <img
                  src={KROMA_HERO}
                  alt="Kroma 5-Day Reset Kit"
                  className="h-36 object-contain group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Name */}
              <h3 className="font-bold text-[#3B2F25] text-center text-base mb-1">
                Kroma Wellness
              </h3>

              {/* Subtitle */}
              <p className="text-xs text-[#9B8570] text-center mb-2">
                Superfood nutrition & 5-Day Resets
              </p>

              {/* Earn rate */}
              <p className="text-sm text-center font-semibold text-emerald-600 mb-2">
                Earn 3 NCTR/$1
              </p>

              {/* INSPIRATION badge */}
              <div className="flex justify-center mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "#F5EDE3", color: "#C4946A" }}
                >
                  🌿 INSPIRATION
                </span>
              </div>

              {/* Shop button */}
              <Button
                size="sm"
                className="w-full font-semibold text-xs"
                style={{ background: "#E2FF6D", color: "#323232" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (kromaBrand.loyalize_id) handleShopClick(kromaBrand.id, kromaBrand.loyalize_id);
                }}
                disabled={!kromaBrand.loyalize_id}
              >
                Shop Now
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Other Wellness Brand Cards */}
          {brands.map((brand) => {
            const hasShop = !!brand.loyalize_id;
            const isComingSoon = !hasShop;

            return (
              <div
                key={brand.id}
                className={`snap-start flex-shrink-0 w-[200px] md:w-[230px] rounded-xl p-4 border bg-white transition-all cursor-pointer group ${
                  isComingSoon
                    ? "opacity-60 border-[#E8DFD3]"
                    : "border-[#E8DFD3] hover:border-[#C4946A]/60 hover:-translate-y-1 shadow-sm"
                }`}
                onClick={() => !isComingSoon && onBrandClick(brand)}
              >
                {/* Logo or brand name */}
                <div className="flex justify-center mb-3 bg-[#F5EDE3]/60 rounded-lg p-3 aspect-square items-center">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="max-h-16 max-w-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        // Hide broken image, show name fallback
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const fallback = document.createElement("span");
                          fallback.className = "text-sm font-semibold text-[#9B8570] text-center leading-tight";
                          fallback.textContent = brand.name;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#9B8570] text-center leading-tight px-2">
                      {brand.name}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-[#3B2F25] text-center text-sm line-clamp-1 mb-1">
                  {brand.name}
                </h3>

                {/* Description */}
                {brand.description && (
                  <p className="text-[11px] text-[#9B8570] text-center mb-2 line-clamp-2 min-h-[2rem]">
                    {brand.description}
                  </p>
                )}

                {/* Earn rate */}
                {hasShop && brand.nctr_per_dollar && brand.nctr_per_dollar > 0 && (
                  <p className="text-xs text-center font-medium text-emerald-600 mb-2">
                    Earn {brand.nctr_per_dollar % 1 === 0 ? brand.nctr_per_dollar.toFixed(0) : brand.nctr_per_dollar.toFixed(1)} NCTR/$1
                  </p>
                )}

                {/* INSPIRATION badge */}
                <div className="flex justify-center mb-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: "#F5EDE3", color: "#C4946A" }}
                  >
                    🌿 INSPIRATION
                  </span>
                </div>

                {/* Button */}
                {isComingSoon ? (
                  <div className="text-center">
                    <span className="text-[11px] font-medium text-[#9B8570] uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs font-semibold bg-[#3B2F25] text-white hover:bg-[#2A2019]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShopClick(brand.id, brand.loyalize_id!);
                    }}
                  >
                    Shop Now
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Crescendo Banner — compact */}
        <a
          href="https://crescendo.nctr.live/rewards"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 rounded-xl px-5 py-3.5 transition-all hover:shadow-lg"
          style={{ background: "#323232" }}
        >
          <p className="text-sm font-medium text-white text-center sm:text-left">
            Earning INSPIRATION? Unlock premium wellness rewards on Crescendo
          </p>
          <span
            className="flex-shrink-0 px-5 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: "#E2FF6D", color: "#323232" }}
          >
            Explore Rewards →
          </span>
        </a>
      </div>
    </section>
  );
};

export default InspirationWellnessEcosystem;
