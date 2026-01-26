import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ExternalLink } from "lucide-react";

interface BrandTag {
  slug: string;
  icon: string;
  name: string;
}

interface MallBrandCardProps {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  nctr_per_dollar: number | null;
  loyalize_id: string | null;
  tags?: BrandTag[];
  is_promoted?: boolean;
  promotion_multiplier?: number | null;
  promotion_label?: string | null;
  onShop?: (brandId: string, loyalizeId: string) => void;
}

const TAG_ICONS: Record<string, string> = {
  'made-in-usa': '🇺🇸',
  'small-business': '🏪',
  'sustainable': '🌿',
  'buyr-recommended': '✅',
  'woman-owned': '👩‍💼',
  'black-owned': '✊🏿',
  'veteran-owned': '🎖️',
};

export const MallBrandCard = ({
  id,
  name,
  logo_url,
  category,
  nctr_per_dollar,
  loyalize_id,
  tags = [],
  is_promoted,
  promotion_multiplier,
  promotion_label,
  onShop,
}: MallBrandCardProps) => {
  const baseRate = nctr_per_dollar || 0;
  const finalRate = is_promoted && promotion_multiplier 
    ? baseRate * promotion_multiplier 
    : baseRate;

  const handleShop = () => {
    if (loyalize_id && onShop) {
      onShop(id, loyalize_id);
    }
  };

  return (
    <div className="flex-shrink-0 w-[180px] md:w-[200px] bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-200 group">
      {/* Tag badges */}
      <div className="flex gap-1 mb-2 h-5 overflow-hidden">
        {tags.slice(0, 3).map((tag) => (
          <span key={tag.slug} className="text-xs" title={tag.name}>
            {TAG_ICONS[tag.slug] || tag.icon || '🏷️'}
          </span>
        ))}
        {is_promoted && (
          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
            🔥 {promotion_multiplier}X
          </Badge>
        )}
      </div>

      {/* Logo */}
      <div className="flex justify-center mb-3">
        <BrandLogo
          src={logo_url || undefined}
          alt={name}
          size="lg"
          className="group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Brand Name */}
      <h3 className="font-semibold text-foreground text-center text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
        {name}
      </h3>

      {/* Category */}
      {category && (
        <p className="text-xs text-muted-foreground text-center mb-3 truncate">
          {category}
        </p>
      )}

      {/* NCTR Rate */}
      <div className="text-center mb-3">
        {is_promoted && promotion_multiplier && promotion_multiplier > 1 && (
          <span className="text-xs text-muted-foreground line-through mr-1">
            {baseRate.toFixed(0)}
          </span>
        )}
        <span className="text-primary font-bold text-lg">
          Earn {finalRate.toFixed(0)} NCTR
        </span>
        <span className="text-primary text-sm">/$1</span>
      </div>

      {/* Shop Button */}
      <Button 
        size="sm" 
        className="w-full" 
        onClick={handleShop}
        disabled={!loyalize_id}
      >
        Shop Now
        <ExternalLink className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
};

export default MallBrandCard;
