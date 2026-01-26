import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MallSearch, MallSearchHandle } from "./MallSearch";
import nctrLogo from "@/assets/nctr-n-yellow.png";

interface MallHeaderProps {
  totalBrands: number;
  availableNctr: number;
  onSearchSelect?: (brand: { id: string; loyalize_id: string | null }) => void;
  onSearchFocus?: () => void;
}

export const MallHeader = ({
  totalBrands,
  availableNctr,
  onSearchSelect,
}: MallHeaderProps) => {
  const searchRef = useRef<MallSearchHandle>(null);

  return (
    <div className="garden-theme garden-bg border-b pb-6 pt-4 px-4" style={{ borderColor: 'hsl(var(--garden-border))' }}>
      <div className="max-w-6xl mx-auto">
        {/* Top Row - Title and Balance */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold garden-text">
            🌱 The Garden
          </h1>
          
          {/* NCTR Balance Badge */}
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
          </Badge>
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
