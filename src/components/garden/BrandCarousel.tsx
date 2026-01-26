import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MallBrandCard } from "./MallBrandCard";
import { Link } from "react-router-dom";

interface BrandTag {
  slug: string;
  icon: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  nctr_per_dollar: number | null;
  loyalize_id: string | null;
  is_promoted?: boolean;
  promotion_multiplier?: number | null;
  promotion_label?: string | null;
  tags?: BrandTag[];
}

interface BrandCarouselProps {
  title: string;
  subtitle?: string;
  brands: Brand[];
  emptyMessage?: string;
  seeAllLink?: string;
  onShop?: (brandId: string, loyalizeId: string) => void;
}

export const BrandCarousel = ({
  title,
  subtitle,
  brands,
  emptyMessage = "Coming soon! We're curating this collection.",
  seeAllLink,
  onShop,
}: BrandCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 220;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {brands.length > 4 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden md:flex"
                onClick={() => scroll("left")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden md:flex"
                onClick={() => scroll("right")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {seeAllLink && brands.length > 0 && (
            <Link
              to={seeAllLink}
              className="text-sm text-primary hover:underline"
            >
              See All →
            </Link>
          )}
        </div>
      </div>

      {/* Carousel */}
      {brands.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {brands.map((brand) => (
            <div key={brand.id} className="snap-start">
              <MallBrandCard
                {...brand}
                onShop={onShop}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/30 border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
};

export default BrandCarousel;
