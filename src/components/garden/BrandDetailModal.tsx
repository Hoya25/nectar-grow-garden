import { useState, useEffect } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BrandTag {
  slug: string;
  icon: string;
  name: string;
}

interface BrandDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string | null;
    nctr_per_dollar: number | null;
    loyalize_id: string | null;
    is_promoted?: boolean;
    promotion_multiplier?: number | null;
    promotion_label?: string | null;
    description?: string | null;
    website_url?: string | null;
    tags?: BrandTag[];
  };
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

export const BrandDetailModal = ({
  isOpen,
  onClose,
  brand,
  userId,
  onShop,
}: BrandDetailModalProps) => {
  const [spendAmount, setSpendAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [brandTags, setBrandTags] = useState<BrandTag[]>(brand.tags || []);
  const [description, setDescription] = useState(brand.description || "");
  const [showFullDescription, setShowFullDescription] = useState(false);

  const baseRate = brand.nctr_per_dollar || 0;
  const finalRate = brand.is_promoted && brand.promotion_multiplier 
    ? baseRate * brand.promotion_multiplier 
    : baseRate;

  const calculatedNctr = parseFloat(spendAmount || "0") * finalRate;

  useEffect(() => {
    const fetchBrandDetails = async () => {
      if (!isOpen) return;

      try {
        if (!brand.description) {
          const { data: brandData } = await supabase
            .from("brands")
            .select("description")
            .eq("id", brand.id)
            .single();
          
          if (brandData?.description) {
            setDescription(brandData.description);
          }
        }

        if (!brand.tags || brand.tags.length === 0) {
          const { data: assignments } = await supabase
            .from("brand_tag_assignments")
            .select(`
              tag_id,
              brand_tags (
                slug,
                icon,
                name
              )
            `)
            .eq("brand_id", brand.id);

          if (assignments) {
            const tags = assignments
              .filter(a => a.brand_tags)
              .map(a => ({
                slug: (a.brand_tags as any).slug,
                icon: (a.brand_tags as any).icon || TAG_ICONS[(a.brand_tags as any).slug] || '🏷️',
                name: (a.brand_tags as any).name,
              }));
            setBrandTags(tags);
          }
        }
      } catch (error) {
        console.error("Error fetching brand details:", error);
      }
    };

    fetchBrandDetails();
  }, [isOpen, brand.id, brand.description, brand.tags]);

  useEffect(() => {
    if (isOpen) {
      setSpendAmount("100");
      setShowFullDescription(false);
      setBrandTags(brand.tags || []);
      setDescription(brand.description || "");
    }
  }, [isOpen, brand.id]);

  const handleShop = async () => {
    if (!brand.loyalize_id) {
      toast({
        title: "Coming Soon",
        description: "This brand will be shoppable soon!",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate unique tracking ID for this click
      const trackingId = `${userId?.substring(0, 8) || 'anon'}_${brand.id.substring(0, 8)}_${Date.now()}`;
      
      // Increment click count
      if (userId) {
        const { data: currentBrand } = await supabase
          .from("brands")
          .select("click_count")
          .eq("id", brand.id)
          .single();
        
        await supabase.from("brands").update({
          click_count: (currentBrand?.click_count || 0) + 1
        }).eq("id", brand.id);
      }

      // Call Edge Function for secure redirect with tracking
      const redirectUrl = `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${brand.loyalize_id}&user=${userId || ''}&tracking=${trackingId}`;
      
      window.open(redirectUrl, '_blank');

      toast({
        title: `✓ Shopping at ${brand.name}`,
        description: "Your NCTR earnings will be tracked automatically",
      });

      onClose();
    } catch (error) {
      console.error("Error opening shop link:", error);
      toast({
        title: "Error",
        description: "Failed to open shopping link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const descriptionLines = description.split('\n').slice(0, 3).join('\n');
  const hasMoreDescription = description.length > 150;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
        <div 
          className="garden-theme w-full max-h-[85vh] md:max-h-[90vh] md:w-[500px] md:max-w-[90vw] overflow-hidden rounded-t-3xl md:rounded-2xl animate-in slide-in-from-bottom md:fade-in md:zoom-in-95 duration-300 bg-white shadow-xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-[hsl(220,14%,96%)] transition-colors btn-press"
          >
            <X className="h-5 w-5 text-[hsl(220,9%,46%)]" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[85vh] md:max-h-[80vh]">
            {/* Header */}
            <div className="p-6 pb-4 text-center border-b border-[hsl(220,13%,91%)]">
              <div className="flex justify-center mb-4">
                <BrandLogo
                  src={brand.logo_url || undefined}
                  alt={brand.name}
                  size="xl"
                  className="w-20 h-20"
                />
              </div>
              
              <h2 className="text-2xl font-bold text-[hsl(0,0%,10%)] mb-2">{brand.name}</h2>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                {brand.category && (
                  <Badge 
                    variant="secondary" 
                    className="bg-[hsl(220,14%,96%)] text-[hsl(220,9%,46%)] border-0"
                  >
                    {brand.category}
                  </Badge>
                )}
                
                {brandTags.map((tag) => (
                  <span 
                    key={tag.slug} 
                    className="text-lg" 
                    title={tag.name}
                  >
                    {TAG_ICONS[tag.slug] || tag.icon || '🏷️'}
                  </span>
                ))}
              </div>
            </div>

            {/* Earning Info */}
            <div className="p-6 border-b border-[hsl(220,13%,91%)]">
              <div className="text-center mb-4">
                {brand.is_promoted && brand.promotion_multiplier && brand.promotion_multiplier > 1 && (
                  <div className="mb-2">
                    <Badge className="bg-orange-500 text-white border-0 text-sm px-3 py-1">
                      🔥 BOOSTED
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2">
                  {brand.is_promoted && brand.promotion_multiplier && brand.promotion_multiplier > 1 && (
                    <span className="text-lg text-[hsl(220,9%,46%)] line-through">
                      {baseRate.toFixed(0)} NCTR
                    </span>
                  )}
                  <span className="text-[hsl(142,76%,36%)] text-3xl font-bold">
                    Earn {finalRate.toFixed(0)} NCTR/$1
                  </span>
                </div>
              </div>

              {/* Earnings Calculator */}
              <div className="bg-[hsl(142,76%,97%)] rounded-xl p-4 border border-[hsl(142,76%,90%)]">
                <label className="text-sm text-[hsl(220,9%,46%)] mb-2 block">
                  Earnings Calculator
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[hsl(0,0%,10%)]">Spend $</span>
                    <Input
                      type="number"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      className="w-24 bg-white border-[hsl(220,13%,91%)] text-[hsl(0,0%,10%)] text-center"
                      min="0"
                    />
                  </div>
                  <span className="text-[hsl(220,9%,46%)]">→</span>
                  <div className="flex-1 text-right">
                    <span className="text-[hsl(142,76%,36%)] text-xl font-bold">
                      {calculatedNctr.toLocaleString(undefined, { maximumFractionDigits: 0 })} NCTR
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="p-6 border-b border-[hsl(220,13%,91%)]">
              <h3 className="text-sm font-semibold text-[hsl(220,9%,46%)] uppercase tracking-wider mb-4">
                How It Works
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[hsl(142,71%,45%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-[hsl(0,0%,23%)] text-sm">
                    Click "Shop at {brand.name}" below
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[hsl(142,71%,45%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-[hsl(0,0%,23%)] text-sm">
                    Make your purchase on their site
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[hsl(142,71%,45%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-[hsl(0,0%,23%)] text-sm">
                    NCTR appears in your account within 24-48 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="p-6 border-b border-[hsl(220,13%,91%)]">
                <h3 className="text-sm font-semibold text-[hsl(220,9%,46%)] uppercase tracking-wider mb-3">
                  About {brand.name}
                </h3>
                <p className="text-[hsl(0,0%,23%)] text-sm leading-relaxed">
                  {showFullDescription ? description : descriptionLines}
                  {!showFullDescription && hasMoreDescription && '...'}
                </p>
                {hasMoreDescription && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-sm text-[hsl(142,71%,45%)] mt-2 hover:text-[hsl(142,71%,35%)] transition-colors"
                  >
                    {showFullDescription ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* CTA Button */}
            <div className="p-6">
              <Button
                onClick={handleShop}
                disabled={loading || !brand.loyalize_id}
                className="w-full h-14 text-lg font-bold bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)] btn-press rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    Shop at {brand.name}
                    <ExternalLink className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              
              {!brand.loyalize_id && (
                <p className="text-center text-sm text-[hsl(220,9%,46%)] mt-3">
                  Shopping coming soon for this brand
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BrandDetailModal;
