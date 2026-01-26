import { Badge } from "@/components/ui/badge";
import { MallSearch } from "./MallSearch";
import nctrLogo from "@/assets/nctr-n-yellow.png";

interface MallHeaderProps {
  totalBrands: number;
  availableNctr: number;
  onSearchSelect?: (brand: { id: string; loyalize_id: string | null }) => void;
}

export const MallHeader = ({
  totalBrands,
  availableNctr,
  onSearchSelect,
}: MallHeaderProps) => {
  return (
    <div className="bg-gradient-to-b from-card to-background border-b border-border pb-6 pt-4 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Top Row - Title and Balance */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            🌱 The Garden
          </h1>
          
          {/* NCTR Balance Badge */}
          <Badge 
            variant="outline" 
            className="px-3 py-1.5 text-sm font-semibold border-primary/30 bg-primary/10"
          >
            <img src={nctrLogo} alt="NCTR" className="h-4 w-4 mr-1.5" />
            <span className="text-primary">
              {availableNctr.toLocaleString(undefined, { maximumFractionDigits: 0 })} NCTR
            </span>
          </Badge>
        </div>

        {/* Search Bar */}
        <MallSearch 
          totalBrands={totalBrands} 
          onSelect={onSearchSelect}
        />
      </div>
    </div>
  );
};

export default MallHeader;
