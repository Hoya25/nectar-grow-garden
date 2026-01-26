import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MallSearch, MallSearchHandle } from "./MallSearch";
import { getTierForAmount, getTierEmoji, getTierName } from "@/lib/crescendo-tiers";
import nctrLogo from "@/assets/nctr-n-yellow.png";

interface MallHeaderProps {
  totalBrands: number;
  availableNctr: number;
  totalNctr?: number; // Total NCTR for tier calculation
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
  
  // Calculate tier based on total NCTR or available NCTR
  const nctrForTier = totalNctr ?? availableNctr;
  const currentTier = getTierForAmount(nctrForTier);
  const tierEmoji = getTierEmoji(currentTier);
  const tierName = getTierName(currentTier);

  return (
    <div className="garden-theme garden-bg border-b pb-6 pt-4 px-4" style={{ borderColor: 'hsl(var(--garden-border))' }}>
      <div className="max-w-6xl mx-auto">
        {/* Top Row - Title and Balance */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold garden-text">
            🌱 The Garden
          </h1>
          
          {/* NCTR Balance Badge with Tier */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="px-3 py-1.5 text-sm font-semibold border-0"
              style={{ 
                backgroundColor: 'hsl(var(--garden-accent) / 0.15)',
                borderColor: 'hsl(var(--garden-accent) / 0.3)'
              }}
            >
              <img src={nctrLogo} alt="NCTR" className="h-4 w-4 mr-1.5" />
              <span className="nctr-rate">
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
