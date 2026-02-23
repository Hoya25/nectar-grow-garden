import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InspirationBrand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  nctr_per_dollar: number | null;
  loyalize_id: string | null;
  description: string | null;
  featured?: boolean;
  display_order?: number | null;
}

interface InspirationPartnersSectionProps {
  onShop: (brandId: string, loyalizeId: string) => void;
  onBrandClick: (brand: InspirationBrand) => void;
}

export const InspirationPartnersSection = ({ onShop, onBrandClick }: InspirationPartnersSectionProps) => {
  const [brands, setBrands] = useState<InspirationBrand[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data: tagData } = await supabase
        .from("brand_tags")
        .select("id")
        .eq("slug", "inspiration")
        .single();

      if (!tagData) return;

      const { data: assignments } = await supabase
        .from("brand_tag_assignments")
        .select("brand_id")
        .eq("tag_id", tagData.id);

      if (!assignments?.length) return;

      const brandIds = assignments.map((a) => a.brand_id).filter(Boolean) as string[];

      const { data: brandsData } = await supabase
        .from("brands")
        .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, description, featured, display_order")
        .in("id", brandIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name");

      setBrands(brandsData || []);
    };
    fetch();
  }, []);

  if (brands.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  const handleInspirationShop = (brandId: string, loyalizeId: string) => {
    toast({
      title: "🌿 INSPIRATION Rewards",
      description: "This purchase earns INSPIRATION rewards — shop to build your wellness status on Crescendo.",
      duration: 5000,
    });
    onShop(brandId, loyalizeId);
  };

  return (
    <section
      className="mb-8 -mx-4 px-4 py-6 rounded-2xl"
      style={{ background: "linear-gradient(180deg, rgba(245,237,227,0.12) 0%, rgba(250,250,247,0.04) 100%)" }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-1">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "3px", height: "22px", background: "#C4946A", borderRadius: "999px" }} />
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(18px,2.2vw,24px)",
              fontWeight: 900,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: "#fff",
              margin: 0,
            }}
          >
            🌿 INSPIRATION — Wellness Brands
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full text-[hsl(var(--mall-text-muted))] hover:text-[#C4946A] hover:bg-[hsl(0,0%,25%)] transition-colors hidden md:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full text-[hsl(var(--mall-text-muted))] hover:text-[#C4946A] hover:bg-[hsl(0,0%,25%)] transition-colors hidden md:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-[hsl(var(--mall-text-muted))] mb-5">
        Shop these brands. Earn INSPIRATION. Unlock wellness rewards on Crescendo.
      </p>

      {/* Brand carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {brands.map((brand) => {
          const isFlagship = brand.featured && brand.display_order === 1;
          return (
            <div
              key={brand.id}
              className={`snap-start flex-shrink-0 rounded-xl p-5 border hover:-translate-y-1 transition-all cursor-pointer group relative ${
                isFlagship
                  ? "w-[260px] md:w-[300px] bg-[#F5EDE3] border-[#C4946A]/40 hover:border-[#C4946A] shadow-lg"
                  : "w-[220px] md:w-[260px] bg-[hsl(var(--mall-card))] border-[hsl(var(--mall-border))] hover:border-[#C4946A]/60"
              }`}
              onClick={() => {
                if (isFlagship) {
                  navigate("/brands/kroma-wellness");
                } else {
                  onBrandClick(brand);
                }
              }}
            >
              {/* Flagship badge */}
              {isFlagship && (
                <div className="flex justify-center mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C4946A] text-white">
                    ✦ Flagship Partner
                  </span>
                </div>
              )}

              {/* Logo */}
              <div
                className={`flex justify-center mb-4 rounded-lg p-3 ${
                  isFlagship ? "bg-[#EDE4D8]" : "bg-[hsl(0,0%,28%)]"
                }`}
              >
                <BrandLogo
                  src={brand.logo_url || undefined}
                  alt={brand.name}
                  size="lg"
                  className="group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Name */}
              <h3
                className={`font-semibold text-center text-sm line-clamp-2 mb-2 min-h-[2.5rem] ${
                  isFlagship ? "text-[#3B2F25]" : "text-[hsl(var(--mall-text))]"
                }`}
              >
                {brand.name}
              </h3>

              {/* Earn rate */}
              <p
                className={`text-xs text-center font-medium mb-3 ${
                  isFlagship ? "text-[#C4946A]" : "text-[hsl(var(--mall-accent))]"
                }`}
              >
                Earn NCTR on every purchase
              </p>

              {/* INSPIRATION badge — warm pill */}
              <div className="flex justify-center mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "#F5EDE3", color: "#C4946A" }}
                >
                  <Sparkles className="w-3 h-3" />
                  🌿 INSPIRATION
                </span>
              </div>

              {/* Shop button */}
              <Button
                size="sm"
                className={`w-full font-semibold ${
                  isFlagship
                    ? "bg-[#C4946A] text-white hover:bg-[#A97D5A]"
                    : "bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)] hover:bg-[hsl(75,100%,65%)]"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (brand.loyalize_id) handleInspirationShop(brand.id, brand.loyalize_id);
                }}
                disabled={!brand.loyalize_id}
              >
                Shop Now
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
