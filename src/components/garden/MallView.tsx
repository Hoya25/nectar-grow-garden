import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MallHeader } from "./MallHeader";
import { BrandCarousel } from "./BrandCarousel";
import { DepartmentGrid } from "./DepartmentGrid";
import { MobileBottomNav } from "./MobileBottomNav";
import { MallSearchHandle } from "./MallSearch";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

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
  is_big_brand?: boolean;
  featured?: boolean;
  tags?: { slug: string; icon: string; name: string }[];
}

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  brand_count?: number;
}

interface MallViewProps {
  userId?: string;
  availableNctr: number;
  totalNctr?: number;
}

export const MallView = ({ userId, availableNctr, totalNctr }: MallViewProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalBrands, setTotalBrands] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showBigBrands, setShowBigBrands] = useState(false);
  const searchRef = useRef<MallSearchHandle>(null);

  // Tag-based sections
  const [madeInUsaBrands, setMadeInUsaBrands] = useState<Brand[]>([]);
  const [smallBusinessBrands, setSmallBusinessBrands] = useState<Brand[]>([]);
  const [buyrRecommendedBrands, setBuyrRecommendedBrands] = useState<Brand[]>([]);
  const [sustainableBrands, setSustainableBrands] = useState<Brand[]>([]);
  
  // Other sections
  const [promotedBrands, setPromotedBrands] = useState<Brand[]>([]);
  const [highestEarningBrands, setHighestEarningBrands] = useState<Brand[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [bigBrands, setBigBrands] = useState<Brand[]>([]);

  // Fetch brands by tag
  const fetchBrandsByTag = useCallback(async (tagSlug: string): Promise<Brand[]> => {
    try {
      // First get tag id
      const { data: tagData } = await supabase
        .from("brand_tags")
        .select("id")
        .eq("slug", tagSlug)
        .eq("is_active", true)
        .single();

      if (!tagData) return [];

      // Get brand assignments for this tag
      const { data: assignments } = await supabase
        .from("brand_tag_assignments")
        .select("brand_id")
        .eq("tag_id", tagData.id);

      if (!assignments || assignments.length === 0) return [];

      const brandIds = assignments.map((a) => a.brand_id).filter(Boolean);

      // Get brand details
      const { data: brands } = await supabase
        .from("brands")
        .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label")
        .eq("is_active", true)
        .in("id", brandIds)
        .order("nctr_per_dollar", { ascending: false })
        .limit(20);

      return brands || [];
    } catch (error) {
      console.error(`Error fetching brands for tag ${tagSlug}:`, error);
      return [];
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Parallel fetch all sections
        const [
          totalCount,
          deptData,
          madeInUsa,
          smallBusiness,
          buyrRec,
          sustainable,
          promoted,
          highEarning,
          featured,
          bigBrandsData,
        ] = await Promise.all([
          // Total brand count
          supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true),
          
          // Departments with counts
          supabase.from("brand_categories").select("*").eq("is_active", true).order("display_order"),
          
          // Tag-based sections
          fetchBrandsByTag("made-in-usa"),
          fetchBrandsByTag("small-business"),
          fetchBrandsByTag("buyr-recommended"),
          fetchBrandsByTag("sustainable"),
          
          // Promoted brands
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label")
            .eq("is_active", true)
            .eq("is_promoted", true)
            .order("promotion_multiplier", { ascending: false })
            .limit(20),
          
          // Highest earning (exclude big brands)
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, is_big_brand")
            .eq("is_active", true)
            .neq("is_big_brand", true)
            .not("nctr_per_dollar", "is", null)
            .gt("nctr_per_dollar", 0)
            .order("nctr_per_dollar", { ascending: false })
            .limit(10),
          
          // Featured brands
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, featured")
            .eq("is_active", true)
            .eq("featured", true)
            .order("name")
            .limit(20),
          
          // Big brands
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, is_big_brand")
            .eq("is_active", true)
            .eq("is_big_brand", true)
            .order("name")
            .limit(30),
        ]);

        setTotalBrands(totalCount.count || 0);
        setDepartments(deptData.data || []);
        setMadeInUsaBrands(madeInUsa);
        setSmallBusinessBrands(smallBusiness);
        setBuyrRecommendedBrands(buyrRec);
        setSustainableBrands(sustainable);
        setPromotedBrands(promoted.data || []);
        setHighestEarningBrands(highEarning.data || []);
        setFeaturedBrands(featured.data || []);
        setBigBrands(bigBrandsData.data || []);
      } catch (error) {
        console.error("Error fetching mall data:", error);
        toast({
          title: "Error",
          description: "Failed to load shopping experience",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [fetchBrandsByTag]);

  // Handle shop action - redirect to Loyalize
  const handleShop = useCallback(async (brandId: string, loyalizeId: string) => {
    if (!loyalizeId) {
      toast({
        title: "Coming Soon",
        description: "This brand will be shoppable soon!",
      });
      return;
    }

    try {
      // Build affiliate URL
      const baseUrl = "https://www.loyalize.com/tracking/redirect";
      const params = new URLSearchParams({
        merchant_id: loyalizeId,
        ...(userId && { sub_id: userId }),
      });

      window.open(`${baseUrl}?${params.toString()}`, "_blank");
    } catch (error) {
      console.error("Error opening shop link:", error);
      toast({
        title: "Error",
        description: "Failed to open shopping link",
        variant: "destructive",
      });
    }
  }, [userId]);

  // Handle search selection
  const handleSearchSelect = useCallback((brand: { id: string; loyalize_id: string | null }) => {
    if (brand.loyalize_id) {
      handleShop(brand.id, brand.loyalize_id);
    }
  }, [handleShop]);

  // Mobile nav handlers
  const handleSearchClick = useCallback(() => {
    // Scroll to top and focus search
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      searchRef.current?.focus();
    }, 300);
  }, []);

  const handleTagsClick = useCallback(() => {
    // Scroll to departments section
    const deptSection = document.querySelector('[data-section="departments"]');
    deptSection?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="garden-theme min-h-screen bg-[hsl(80,20%,98%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(142,71%,45%)]" />
      </div>
    );
  }

  return (
    <div className="garden-theme min-h-screen bg-[hsl(80,20%,98%)] pb-20 md:pb-0">
      {/* Header with Search */}
      <MallHeader
        totalBrands={totalBrands}
        availableNctr={availableNctr}
        totalNctr={totalNctr}
        onSearchSelect={handleSearchSelect}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Values-Based Sections */}
        <BrandCarousel
          title="🇺🇸 Made in America"
          subtitle="Support American workers and manufacturers"
          brands={madeInUsaBrands}
          seeAllLink="/garden/tag/made-in-usa"
          userId={userId}
          onShop={handleShop}
        />

        <BrandCarousel
          title="🏪 Small & Independent"
          subtitle="Privately owned businesses that put people first"
          brands={smallBusinessBrands}
          seeAllLink="/garden/tag/small-business"
          userId={userId}
          onShop={handleShop}
        />

        <BrandCarousel
          title="✅ Buy'r Recommended"
          subtitle="Vetted by the Buy'r community"
          brands={buyrRecommendedBrands}
          seeAllLink="/garden/tag/buyr-recommended"
          userId={userId}
          onShop={handleShop}
        />

        <BrandCarousel
          title="🌿 Sustainable"
          subtitle="Eco-friendly brands"
          brands={sustainableBrands}
          seeAllLink="/garden/tag/sustainable"
          userId={userId}
          onShop={handleShop}
        />

        {/* Promotions */}
        {promotedBrands.length > 0 && (
          <BrandCarousel
            title="🔥 Boosted Earnings"
            subtitle="Limited time promotions"
            brands={promotedBrands}
            userId={userId}
            onShop={handleShop}
          />
        )}

        {/* Departments */}
        {departments.length > 0 && (
          <div data-section="departments">
            <DepartmentGrid departments={departments} />
          </div>
        )}

        {/* Highest Earning */}
        {highestEarningBrands.length > 0 && (
          <BrandCarousel
            title="💎 Highest Earning"
            subtitle="Top NCTR rates"
            brands={highestEarningBrands}
            userId={userId}
            onShop={handleShop}
          />
        )}

        {/* Featured */}
        {featuredBrands.length > 0 && (
          <BrandCarousel
            title="⭐ Featured Brands"
            subtitle="Hand-picked by The Garden"
            brands={featuredBrands}
            userId={userId}
            onShop={handleShop}
          />
        )}

        {/* Big Brands - Collapsible */}
        {bigBrands.length > 0 && (
          <section className="garden-theme mb-8 garden-fade-in visible">
            <button
              onClick={() => setShowBigBrands(!showBigBrands)}
              className="flex items-center justify-between w-full text-left group btn-press border-b border-[hsl(220,13%,91%)] pb-3 mb-4"
            >
              <div>
                <h2 className="text-xl font-bold text-[hsl(0,0%,10%)]">🏢 Major Retailers</h2>
                <p className="text-sm text-[hsl(220,9%,46%)] mt-1">National brands</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[hsl(220,9%,46%)]">
                  {bigBrands.length} brands
                </span>
                {showBigBrands ? (
                  <ChevronUp className="h-5 w-5 text-[hsl(220,9%,46%)]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-[hsl(220,9%,46%)]" />
                )}
              </div>
            </button>

            {showBigBrands && (
              <BrandCarousel
                title=""
                brands={bigBrands}
                userId={userId}
                onShop={handleShop}
              />
            )}

            {!showBigBrands && (
              <div className="flex gap-2 overflow-x-auto pb-2 garden-carousel">
                {bigBrands.slice(0, 6).map((brand) => (
                  <div
                    key={brand.id}
                    className="flex-shrink-0 bg-white rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer border border-[hsl(220,13%,91%)] hover:border-[hsl(142,71%,45%)] hover:bg-[hsl(142,76%,97%)] transition-all btn-press"
                    onClick={() => handleShop(brand.id, brand.loyalize_id || "")}
                  >
                    <span className="text-sm text-[hsl(0,0%,10%)]">{brand.name}</span>
                  </div>
                ))}
                <button
                  onClick={() => setShowBigBrands(true)}
                  className="flex-shrink-0 text-sm font-medium text-[hsl(142,71%,45%)] hover:text-[hsl(142,71%,35%)] transition-colors px-3 py-2 btn-press"
                >
                  See All →
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onSearchClick={handleSearchClick}
        onTagsClick={handleTagsClick}
      />
    </div>
  );
};

export default MallView;
