import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ShoppingBag, TrendingUp, Store, ExternalLink, Coins, Lock, Clock, Wallet } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import nctrNLogo from "@/assets/nctr-n-yellow.png";

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
  lock_90_nctr: number;
  lock_360_nctr: number;
}

interface FeaturedBrand {
  id: string;
  name: string;
  logo_url: string | null;
  commission_rate: number;
  loyalize_id: string;
}

interface GardenHeroSectionProps {
  userName: string;
  portfolio: Portfolio | null;
  featuredBrands: FeaturedBrand[];
  totalBrands: number;
  thisMonthEarned: number;
  brandsShoppedCount: number;
  onShopClick: () => void;
  onBrandClick: (brand: FeaturedBrand) => void;
}

const formatNCTR = (amount: number): string => {
  // Format with commas, no decimal places
  return Math.floor(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatPercent = (rate: number): string => {
  // commission_rate could be stored as decimal (0.05) or percentage (5)
  const percent = rate > 1 ? rate : rate * 100;
  return `${percent.toFixed(0)}%`;
};

export const GardenHeroSection = ({
  userName,
  portfolio,
  featuredBrands,
  totalBrands,
  thisMonthEarned,
  brandsShoppedCount,
  onShopClick,
  onBrandClick,
}: GardenHeroSectionProps) => {
  const navigate = useNavigate();
  const { currentPrice, formatPrice, calculatePortfolioValue } = useNCTRPrice();
  
  const totalNCTR = (portfolio?.available_nctr || 0) + 
                    (portfolio?.lock_90_nctr || 0) + 
                    (portfolio?.lock_360_nctr || 0);
  
  const totalUSD = calculatePortfolioValue(totalNCTR);
  const firstName = userName?.split(' ')[0] || 'Member';

  const formatUSD = (nctrAmount: number) => {
    const usdValue = calculatePortfolioValue(nctrAmount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue);
  };

  return (
    <div className="mb-8">
      {/* Welcome + Balance Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 mb-6 border border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold section-heading mb-1">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground">Your crypto rewards are growing</p>
          </div>
          
          {/* Large Balance Display */}
          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-primary/30 shadow-lg">
            <img src={nctrNLogo} alt="NCTR" className="h-12 w-12" />
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">
                {formatNCTR(totalNCTR)} <span className="text-lg font-normal text-muted-foreground">NCTR</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ≈ {formatUSD(totalNCTR)} @ ${formatPrice(currentPrice)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Portfolio Breakdown Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Available */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Available</span>
                <InfoTooltip content="Spendable on Crescendo rewards anytime" size={12} />
              </div>
              <p className="text-lg md:text-xl font-bold text-emerald-600">
                {formatNCTR(portfolio?.available_nctr || 0)}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-1">NCTR</p>
              <p className="text-xs text-emerald-600/70 mt-1">{formatUSD(portfolio?.available_nctr || 0)}</p>
              <p className="text-[10px] text-emerald-600/60 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ready to spend
              </p>
            </CardContent>
          </Card>

          {/* 90LOCK */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">90LOCK</span>
                <InfoTooltip content="Committed for 90 days to earn bonus NCTR on Crescendo" size={12} />
              </div>
              <p className="text-lg md:text-xl font-bold text-blue-600">
                {formatNCTR(portfolio?.lock_90_nctr || 0)}
              </p>
              <p className="text-[10px] text-blue-600/80 mt-1">NCTR</p>
              <p className="text-xs text-blue-600/70 mt-1">{formatUSD(portfolio?.lock_90_nctr || 0)}</p>
              <p className="text-[10px] text-blue-600/60 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                90-day commitment
              </p>
            </CardContent>
          </Card>

          {/* 360LOCK */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">360LOCK</span>
                <InfoTooltip content="Committed for 360 days for maximum rewards + premium perks" size={12} />
              </div>
              <p className="text-lg md:text-xl font-bold text-purple-600">
                {formatNCTR(portfolio?.lock_360_nctr || 0)}
              </p>
              <p className="text-[10px] text-purple-600/80 mt-1">NCTR</p>
              <p className="text-xs text-purple-600/70 mt-1">{formatUSD(portfolio?.lock_360_nctr || 0)}</p>
              <p className="text-[10px] text-purple-600/60 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                360-day commitment
              </p>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Pending</span>
                <InfoTooltip content="From recent purchases, clears in 24-48 hours" size={12} />
              </div>
              <p className="text-lg md:text-xl font-bold text-gray-600">
                {formatNCTR(portfolio?.pending_nctr || 0)}
              </p>
              <p className="text-[10px] text-gray-600/80 mt-1">NCTR</p>
              <p className="text-xs text-gray-500 mt-1">{formatUSD(portfolio?.pending_nctr || 0)}</p>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                Processing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Primary CTA */}
        <Button 
          onClick={onShopClick}
          size="lg"
          className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Shop & Earn NCTR
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Earn crypto back at <span className="font-semibold text-primary">{totalBrands.toLocaleString()}</span> brands
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl md:text-2xl font-bold text-primary">{formatNCTR(portfolio?.total_earned || 0)}</p>
            <p className="text-xs text-muted-foreground">Lifetime Earned</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary/30 to-secondary/50 border-secondary/30">
          <CardContent className="p-4 text-center">
            <Coins className="w-5 h-5 mx-auto mb-1 text-secondary-foreground" />
            <p className="text-xl md:text-2xl font-bold text-secondary-foreground">{formatNCTR(thisMonthEarned)}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/30 to-accent/50 border-accent/30">
          <CardContent className="p-4 text-center">
            <Store className="w-5 h-5 mx-auto mb-1 text-accent-foreground" />
            <p className="text-xl md:text-2xl font-bold text-accent-foreground">{brandsShoppedCount}</p>
            <p className="text-xs text-muted-foreground">Brands Shopped</p>
          </CardContent>
        </Card>
      </div>

      {/* Featured Brands Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold section-heading flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            Top Earning Brands
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onShopClick}
            className="text-primary hover:text-primary/80"
          >
            View All {totalBrands.toLocaleString()} →
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {featuredBrands.slice(0, 6).map((brand) => (
            <Card 
              key={brand.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary bg-background"
              onClick={() => onBrandClick(brand)}
            >
              <CardContent className="p-3 text-center">
                <div className="w-full h-16 flex items-center justify-center mb-2 bg-muted/30 rounded-lg overflow-hidden">
                  {brand.logo_url ? (
                    <BrandLogo 
                      src={brand.logo_url} 
                      alt={brand.name}
                      size="md"
                      variant="auto"
                    />
                  ) : (
                    <Store className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs font-medium truncate mb-1" title={brand.name}>
                  {brand.name}
                </p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-sm font-bold text-primary">
                    Earn {formatPercent(brand.commission_rate)} back
                  </span>
                </div>
                <Button 
                  size="sm" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Shop Now <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
