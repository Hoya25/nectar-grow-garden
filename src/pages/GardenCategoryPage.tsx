import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { MallBrandCard } from "@/components/garden/MallBrandCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

type SortOption = "highest_nctr" | "a_z" | "newest";

const BRANDS_PER_PAGE = 20;

// Category keyword mappings for fuzzy matching
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  'fashion': ['fashion', 'apparel', 'clothing', 'shoes', 'accessories', 'jewelry', 'watches', 'handbag', 'dress', 'mens', 'womens'],
  'electronics': ['electronics', 'tech', 'technology', 'computers', 'gadgets', 'software', 'mobile', 'phone', 'laptop', 'audio', 'tv'],
  'home': ['home', 'garden', 'furniture', 'decor', 'household', 'kitchen', 'bedding', 'appliances', 'bath', 'storage', 'lighting'],
  'food-drink': ['food', 'drink', 'restaurant', 'grocery', 'beverage', 'dining', 'meal', 'coffee', 'alcohol', 'wine', 'snack', 'organic'],
  'travel': ['travel', 'hotel', 'flight', 'vacation', 'booking', 'airline', 'cruise', 'rental', 'resort', 'tourism', 'lodging'],
  'beauty': ['beauty', 'cosmetics', 'skincare', 'personal care', 'makeup', 'fragrance', 'hair', 'nail', 'spa', 'grooming'],
  'sports': ['sports', 'outdoors', 'fitness', 'athletic', 'outdoor', 'exercise', 'gym', 'camping', 'hiking', 'running', 'cycling'],
  'entertainment': ['entertainment', 'media', 'streaming', 'gaming', 'music', 'movies', 'books', 'games', 'tickets', 'concert'],
  'health': ['health', 'wellness', 'pharmacy', 'medical', 'vitamins', 'supplements', 'healthcare', 'nutrition', 'fitness'],
  'services': ['services', 'subscription', 'software', 'saas', 'insurance', 'financial', 'legal', 'education', 'online'],
  'gift-cards': ['gift card', 'gift cards', 'giftcard', 'gift', 'prepaid', 'egift'],
  'automotive': ['automotive', 'auto', 'car', 'vehicle', 'parts', 'tires', 'motor', 'truck', 'accessories'],
  'pets': ['pet', 'pets', 'animal', 'dog', 'cat', 'bird', 'fish', 'supplies'],
  'kids': ['kids', 'baby', 'children', 'toys', 'infant', 'toddler', 'maternity', 'nursery'],
  'office': ['office', 'business', 'supplies', 'stationery', 'printing', 'desk', 'workplace']
};

// Build OR filter string for category keywords
const buildCategoryFilter = (slug: string, categoryName: string): string => {
  const keywords = CATEGORY_MAPPINGS[slug] || [categoryName.toLowerCase()];
  // Build filter: category.ilike.%keyword1%,category.ilike.%keyword2%,...
  return keywords.map(k => `category.ilike.%${k}%`).join(',');
};

const GardenCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("highest_nctr");
  const [page, setPage] = useState(0);

  // Fetch category details
  useEffect(() => {
    const fetchCategory = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("brand_categories")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching category:", error);
        toast({
          title: "Category not found",
          description: "The category you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/garden");
        return;
      }

      setCategory(data);
    };

    fetchCategory();
  }, [slug, navigate]);

  // Build query based on sort option
  const getOrderBy = useCallback((sort: SortOption) => {
    switch (sort) {
      case "highest_nctr":
        return { column: "nctr_per_dollar", ascending: false };
      case "a_z":
        return { column: "name", ascending: true };
      case "newest":
        return { column: "created_at", ascending: false };
      default:
        return { column: "nctr_per_dollar", ascending: false };
    }
  }, []);

  // Fetch brands with fuzzy category matching
  const fetchBrands = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!category || !slug) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const { column, ascending } = getOrderBy(sortBy);
      const from = pageNum * BRANDS_PER_PAGE;
      const to = from + BRANDS_PER_PAGE - 1;

      // Get category keywords for matching
      const keywords = CATEGORY_MAPPINGS[slug] || [category.name.toLowerCase()];
      
      // Build OR filter for all keywords
      const orFilters = keywords.map(k => `category.ilike.%${k}%`).join(',');

      // Get total count with fuzzy matching
      const { count } = await supabase
        .from("brands")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .or(orFilters);

      setTotalCount(count || 0);

      // Get brands with fuzzy matching
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label")
        .eq("is_active", true)
        .or(orFilters)
        .order(column, { ascending })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setBrands(prev => [...prev, ...(data || [])]);
      } else {
        setBrands(data || []);
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast({
        title: "Error",
        description: "Failed to load brands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, slug, sortBy, getOrderBy]);

  // Initial fetch when category is loaded
  useEffect(() => {
    if (category) {
      setPage(0);
      fetchBrands(0, false);
    }
  }, [category, sortBy, fetchBrands]);

  // Handle sort change
  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setPage(0);
  };

  // Handle load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBrands(nextPage, true);
  };

  // Handle shop action
  const handleShop = useCallback(async (brandId: string, loyalizeId: string) => {
    if (!loyalizeId) {
      toast({
        title: "Coming Soon",
        description: "This brand will be shoppable soon!",
      });
      return;
    }

    try {
      // Generate unique tracking ID for this click
      const trackingId = `${user?.id?.substring(0, 8) || 'anon'}_${brandId.substring(0, 8)}_${Date.now()}`;
      
      // Get brand name for toast
      const { data: brandData } = await supabase
        .from("brands")
        .select("name")
        .eq("id", brandId)
        .single();

      // Call Edge Function for secure redirect with tracking
      const redirectUrl = `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${loyalizeId}&user=${user?.id || ''}&tracking=${trackingId}`;
      
      window.open(redirectUrl, '_blank');

      toast({
        title: `✓ Shopping at ${brandData?.name || 'brand'}`,
        description: "Your NCTR earnings will be tracked automatically",
      });
    } catch (error) {
      console.error("Error opening shop link:", error);
      toast({
        title: "Error",
        description: "Failed to open shopping link. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.id]);

  const hasMore = brands.length < totalCount;

  if (loading && !category) {
    return (
      <div className="garden-theme min-h-screen bg-[hsl(80,20%,98%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(142,71%,45%)]" />
      </div>
    );
  }

  return (
    <div className="garden-theme min-h-screen bg-[hsl(80,20%,98%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[hsl(220,13%,91%)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/garden")}
              className="p-2 rounded-lg hover:bg-[hsl(220,14%,96%)] transition-colors btn-press"
            >
              <ArrowLeft className="h-5 w-5 text-[hsl(0,0%,10%)]" />
            </button>
            
            <div className="flex items-center gap-3 flex-1">
              {category?.icon && (
                <span className="text-2xl">{category.icon}</span>
              )}
              <div>
                <h1 className="text-xl font-bold text-[hsl(0,0%,10%)]">{category?.name}</h1>
                <p className="text-sm text-[hsl(220,9%,46%)]">{totalCount} brands</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="sticky top-[73px] z-40 bg-white border-b border-[hsl(220,13%,91%)]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[hsl(220,9%,46%)]">Sort by</span>
            <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
              <SelectTrigger className="w-[160px] bg-white border-[hsl(220,13%,91%)] text-[hsl(0,0%,10%)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(220,13%,91%)]">
                <SelectItem value="highest_nctr" className="text-[hsl(0,0%,10%)]">Highest NCTR</SelectItem>
                <SelectItem value="a_z" className="text-[hsl(0,0%,10%)]">A-Z</SelectItem>
                <SelectItem value="newest" className="text-[hsl(0,0%,10%)]">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Brand Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(142,71%,45%)]" />
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[hsl(220,9%,46%)]">No brands found in this category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {brands.map((brand) => (
                <MallBrandCard
                  key={brand.id}
                  id={brand.id}
                  name={brand.name}
                  logo_url={brand.logo_url}
                  category={brand.category}
                  nctr_per_dollar={brand.nctr_per_dollar}
                  loyalize_id={brand.loyalize_id}
                  is_promoted={brand.is_promoted}
                  promotion_multiplier={brand.promotion_multiplier}
                  promotion_label={brand.promotion_label}
                  onShop={handleShop}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)] btn-press"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${brands.length} of ${totalCount})`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default GardenCategoryPage;
