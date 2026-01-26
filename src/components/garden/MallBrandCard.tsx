import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
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
        className="flex-shrink-0 w-[180px] md:w-[200px] bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-green-500 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Tag badges */}
        <div className="flex gap-1 mb-2 h-5 overflow-hidden">
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

        {/* Logo */}
        <div className="flex justify-center mb-3 bg-gray-50 rounded-lg p-2">
          <BrandLogo
            src={logo_url || undefined}
            alt={name}
            size="lg"
            className="group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Brand Name */}
        <h3 className="font-semibold text-gray-900 text-center text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
          {name}
        </h3>

        {/* Category */}
        {category && (
          <p className="text-xs text-gray-500 text-center mb-3 truncate">
            {category}
          </p>
        )}

        {/* NCTR Rate */}
        <div className="text-center mb-3">
          {is_promoted && promotion_multiplier && promotion_multiplier > 1 && (
            <span className="text-xs text-gray-400 line-through mr-1">
              {baseRate % 1 === 0 ? baseRate.toFixed(0) : baseRate.toFixed(1)}
            </span>
          )}
          <span className="text-green-600 font-bold text-lg">
            {finalRate % 1 === 0 ? finalRate.toFixed(0) : finalRate.toFixed(1)} NCTR
          </span>
          <span className="text-green-600 font-semibold text-sm opacity-80">/$1</span>
        </div>

        {/* Shop Button */}
        <Button 
          size="sm" 
          className="w-full btn-press bg-green-500 text-white hover:bg-green-600 font-semibold" 
          onClick={handleShopClick}
          disabled={!loyalize_id}
        >
          Shop Now
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
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
