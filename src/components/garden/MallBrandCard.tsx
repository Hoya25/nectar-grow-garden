import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { BrandDetailModal } from "./BrandDetailModal";

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
  description?: string | null;
  userId?: string;
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
  'woman-founded': '👩‍💼',
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
  description,
  userId,
  onShop,
}: MallBrandCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const baseRate = nctr_per_dollar || 0;
  const finalRate = is_promoted && promotion_multiplier 
    ? baseRate * promotion_multiplier 
    : baseRate;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsModalOpen(true);
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loyalize_id && onShop) {
      onShop(id, loyalize_id);
    }
  };

  return (
    <>
      <div 
        className="flex-shrink-0 w-[180px] md:w-[200px] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:border-green-500 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer flex flex-col"
        onClick={handleCardClick}
        style={{ maxHeight: "260px" }}
      >
        {/* Tag badges — absolute top-left */}
        {(tags.length > 0 || is_promoted) && (
          <div className="flex gap-1 px-3 pt-2 h-5 overflow-hidden">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag.slug} className="text-xs" title={tag.name}>
                {TAG_ICONS[tag.slug] || tag.icon || '🏷️'}
              </span>
            ))}
            {is_promoted && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-500 text-white border-0">
                🔥 {promotion_multiplier}X
              </Badge>
            )}
          </div>
        )}

        {/* Logo area — seamless white top, no inner container */}
        <div className="flex items-center justify-center bg-white px-4" style={{ minHeight: "100px", maxHeight: "100px" }}>
          {logo_url && !imgError ? (
            <img
              src={logo_url}
              alt={name}
              className="object-contain group-hover:scale-105 transition-transform"
              style={{ maxHeight: "60px", maxWidth: "80%" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-[#555] font-semibold text-sm text-center leading-tight px-2">
              {name}
            </span>
          )}
        </div>

        {/* Info area */}
        <div className="px-3 pb-3 pt-1 flex flex-col flex-1 justify-between">
          {/* Brand Name */}
          <h3 className="font-bold text-gray-900 text-center text-sm line-clamp-2 mb-0.5 min-h-[2rem]">
            {name}
          </h3>

          {/* Category + Earn Rate inline */}
          <div className="flex items-center justify-center gap-1.5 text-xs mb-1.5">
            {category && (
              <span className="text-gray-400 truncate max-w-[60px]">{category}</span>
            )}
            {category && nctr_per_dollar && nctr_per_dollar > 0 && (
              <span className="text-gray-300">·</span>
            )}
            <span className="text-emerald-600 font-medium">
              {nctr_per_dollar && nctr_per_dollar > 0
                ? `${nctr_per_dollar % 1 === 0 ? nctr_per_dollar.toFixed(0) : nctr_per_dollar.toFixed(1)} NCTR/$1`
                : 'Earn NCTR'}
            </span>
          </div>

          {/* Promoted rate callout */}
          {is_promoted && promotion_multiplier && promotion_multiplier > 1 && (
            <div className="text-center mb-1">
              <span className="text-xs text-gray-400 line-through mr-1">
                {baseRate % 1 === 0 ? baseRate.toFixed(0) : baseRate.toFixed(1)}
              </span>
              <span className="text-green-600 font-bold text-sm">
                {finalRate % 1 === 0 ? finalRate.toFixed(0) : finalRate.toFixed(1)} NCTR/$1
              </span>
            </div>
          )}

          {/* Shop Button */}
          <Button 
            size="sm" 
            className="w-full btn-press bg-green-500 text-white hover:bg-green-600 font-semibold text-xs h-8" 
            onClick={handleShopClick}
            disabled={!loyalize_id}
          >
            Shop Now
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Brand Detail Modal */}
      <BrandDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        brand={{
          id,
          name,
          logo_url,
          category,
          nctr_per_dollar,
          loyalize_id,
          is_promoted,
          promotion_multiplier,
          promotion_label,
          description,
          tags,
        }}
        userId={userId}
        onShop={onShop}
      />
    </>
  );
};

export default MallBrandCard;
