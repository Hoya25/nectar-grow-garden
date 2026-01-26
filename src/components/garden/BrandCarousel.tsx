import { useRef, useEffect, useState } from "react";
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
  userId?: string;
  onShop?: (brandId: string, loyalizeId: string) => void;
}

export const BrandCarousel = ({
  title,
  subtitle,
  brands,
  emptyMessage = "Coming soon! We're curating this collection.",
  seeAllLink,
  userId,
  onShop,
}: BrandCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

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
    <section 
      ref={sectionRef}
      className={`garden-theme mb-8 garden-fade-in ${isVisible ? 'visible' : ''}`}
    >
      {/* Header with bottom border */}
      {title && (
        <div className="flex items-center justify-between border-b border-[hsl(220,13%,91%)] pb-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[hsl(0,0%,10%)]">{title}</h2>
            {subtitle && (
              <p className="text-sm text-[hsl(220,9%,46%)] mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {brands.length > 4 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden md:flex text-[hsl(220,9%,46%)] hover:text-[hsl(142,71%,45%)] hover:bg-[hsl(142,76%,97%)] btn-press"
                  onClick={() => scroll("left")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden md:flex text-[hsl(220,9%,46%)] hover:text-[hsl(142,71%,45%)] hover:bg-[hsl(142,76%,97%)] btn-press"
                  onClick={() => scroll("right")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {seeAllLink && brands.length > 0 && (
              <Link
                to={seeAllLink}
                className="text-sm font-medium text-[hsl(142,71%,45%)] hover:text-[hsl(142,71%,35%)] transition-colors"
              >
                See All →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Carousel */}
      {brands.length > 0 ? (
        <div
          ref={scrollRef}
          className="garden-carousel flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {brands.map((brand, index) => (
            <div 
              key={brand.id} 
              className="snap-start"
              style={{ 
                animationDelay: `${index * 50}ms`,
                opacity: isVisible ? 1 : 0,
                transition: `opacity 0.3s ease ${index * 50}ms`
              }}
            >
              <MallBrandCard
                {...brand}
                userId={userId}
                onShop={onShop}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(220,14%,96%)] rounded-lg p-8 text-center border-dashed border-2 border-[hsl(220,13%,91%)]">
          <p className="text-[hsl(220,9%,46%)]">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
};

export default BrandCarousel;
