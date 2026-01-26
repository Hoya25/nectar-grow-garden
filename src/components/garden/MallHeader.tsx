import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MallSearch, MallSearchHandle } from "./MallSearch";
import { getTierForAmount, getTierEmoji, getTierName } from "@/lib/crescendo-tiers";
import nctrLogo from "@/assets/nctr-n-yellow.png";

interface MallHeaderProps {
  totalBrands: number;
  availableNctr: number;
  totalNctr?: number;
  onSearchSelect?: (brand: { id: string; loyalize_id: string | null }) => void;
  onSearchFocus?: () => void;
}

export const MallHeader = ({
  totalBrands,
  availableNctr,
  totalNctr,
  onSearchSelect,
}: MallHeaderProps) => {
  const searchRef = useRef<MallSearchHandle>(null);
  
  const nctrForTier = totalNctr ?? availableNctr;
  const currentTier = getTierForAmount(nctrForTier);
  const tierEmoji = getTierEmoji(currentTier);
  const tierName = getTierName(currentTier);

  return (
    <div className="garden-theme bg-white border-b border-[hsl(220,13%,91%)] pb-6 pt-4 px-4 shadow-sm">
      <div className="max-w-6xl mx-auto">
        {/* Top Row - Title and Balance */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[hsl(0,0%,10%)]">
            🌱 The Garden
          </h1>
          
          {/* NCTR Balance Badge with Tier */}
          <div className="flex items-center gap-2">
            <Badge 
              className="px-3 py-1.5 text-sm font-semibold border-0 bg-[hsl(142,71%,45%)] text-white"
            >
              <img src={nctrLogo} alt="NCTR" className="h-4 w-4 mr-1.5" />
              <span>
                {availableNctr.toLocaleString(undefined, { maximumFractionDigits: 0 })} NCTR
              </span>
              <span className="ml-2 text-base" title={`${tierName} Status`}>
                {tierEmoji}
              </span>
            </Badge>
          </div>
        </div>

        {/* Search Bar */}
        <MallSearch 
          ref={searchRef}
          totalBrands={totalBrands} 
          onSelect={onSearchSelect}
        />
      </div>
    </div>
  );
};

export default MallHeader;
