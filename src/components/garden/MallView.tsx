import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, X, ExternalLink, Loader2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BrandDetailModal } from "./BrandDetailModal";

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
  description?: string | null;
  tags?: { slug: string; icon: string; name: string }[];
}

interface MallViewProps {
  userId?: string;
  availableNctr: number;
  totalNctr?: number;
}

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Fashion", value: "fashion" },
  { label: "Food & Drink", value: "food" },
  { label: "Health & Wellness", value: "health" },
  { label: "Sports", value: "sports" },
  { label: "Travel", value: "travel" },
  { label: "Tech", value: "tech" },
  { label: "Home", value: "home" },
  { label: "Beauty", value: "beauty" },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fashion: ["fashion", "clothing", "apparel", "shoes", "accessories", "jewelry", "watches"],
  food: ["food", "drink", "grocery", "restaurant", "meal", "snack", "beverage", "coffee", "wine"],
  health: ["health", "wellness", "fitness", "vitamin", "supplement", "pharmacy", "medical"],
  sports: ["sports", "outdoor", "athletic", "gym", "exercise", "camping", "fishing"],
  travel: ["travel", "hotel", "flight", "vacation", "luggage", "booking"],
  tech: ["tech", "electronics", "computer", "phone", "software", "gadget", "gaming"],
  home: ["home", "furniture", "decor", "kitchen", "garden", "appliance", "hardware"],
  beauty: ["beauty", "skincare", "makeup", "cosmetics", "fragrance", "hair", "personal care"],
};

const PAGE_SIZE = 40;

export const MallView = ({ userId, availableNctr, totalNctr }: MallViewProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [totalBrands, setTotalBrands] = useState(0);
  const [page, setPage] = useState(1);
  const [suggestionName, setSuggestionName] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  // Welcome back toast
  useEffect(() => {
    const lastClickTime = sessionStorage.getItem('garden_last_click_time');
    if (lastClickTime) {
      const timeSinceClick = Date.now() - Number(lastClickTime);
      if (timeSinceClick < 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem('garden_last_click_time');
        toast({
          title: "👋 Welcome Back!",
          description: "If you completed a purchase, your NCTR earnings will show up within 24-48 hours.",
          duration: 8000,
        });
      }
    }
  }, []);

  // Fetch all brands
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [countRes, brandsRes, featuredRes] = await Promise.all([
          supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label, description, featured")
            .eq("is_active", true)
            .order("name")
            .limit(2000),
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label, description, featured")
            .eq("is_active", true)
            .eq("featured", true)
            .order("name")
            .limit(10),
        ]);

        setTotalBrands(countRes.count || 0);
        setAllBrands(brandsRes.data || []);
        setFeaturedBrands(featuredRes.data || []);
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter brands by search + category
  const filteredBrands = useMemo(() => {
    let filtered = allBrands;

    // Category filter
    if (activeCategory !== "all") {
      const keywords = CATEGORY_KEYWORDS[activeCategory] || [];
      filtered = filtered.filter((b) => {
        const cat = (b.category || "").toLowerCase();
        return keywords.some((kw) => cat.includes(kw));
      });
    }

    // Search filter (name + category)
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.category || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allBrands, activeCategory, searchQuery]);

  const paginatedBrands = useMemo(
    () => filteredBrands.slice(0, page * PAGE_SIZE),
    [filteredBrands, page]
  );

  const hasMore = paginatedBrands.length < filteredBrands.length;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategory]);

  // Shop handler
  const handleShop = useCallback(async (brandId: string, loyalizeId: string) => {
    if (!loyalizeId) {
      toast({ title: "Coming Soon", description: "This brand will be shoppable soon!" });
      return;
    }
    try {
      const trackingId = `${userId?.substring(0, 8) || 'anon'}_${brandId.substring(0, 8)}_${Date.now()}`;
      if (userId) {
        await supabase.from("shopping_clicks").insert({
          user_id: userId, brand_id: brandId, loyalize_id: loyalizeId, converted: false, nctr_earned: 0,
        });
      }
      const redirectUrl = `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${loyalizeId}&user=${userId || ''}&tracking=${trackingId}`;
      sessionStorage.setItem('garden_last_click_time', Date.now().toString());
      window.open(redirectUrl, '_blank');
      toast({
        title: "🛒 Shopping Trip Started!",
        description: "Complete your purchase and you'll automatically earn NCTR. Earnings appear within 24-48 hours.",
        duration: 7000,
      });
    } catch (error) {
      console.error("Error opening shop link:", error);
      toast({ title: "Error", description: "Failed to open shopping link.", variant: "destructive" });
    }
  }, [userId]);

  // Suggestion submit
  const handleSuggestion = async () => {
    if (!suggestionName.trim()) return;
    setSubmittingSuggestion(true);
    try {
      toast({ title: "✅ Thanks!", description: `We'll look into adding "${suggestionName}" to The Garden.` });
      setSuggestionName("");
    } catch {
      toast({ title: "Error", description: "Failed to submit suggestion.", variant: "destructive" });
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const scrollFeatured = (dir: "left" | "right") => {
    featuredScrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="garden-mall-dark min-h-screen bg-[hsl(var(--mall-bg))] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mall-accent))]" />
      </div>
    );
  }

  const isSearching = searchQuery.trim().length >= 2 || activeCategory !== "all";
  const noResults = isSearching && filteredBrands.length === 0;

  return (
    <div className="garden-mall-dark min-h-screen bg-[hsl(var(--mall-bg))] pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-[hsl(0,0%,16%)] border-b border-[hsl(var(--mall-border))] pt-4 pb-6 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--mall-text))] mb-5">
            🌱 The Garden
          </h1>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--mall-text-muted))]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${totalBrands.toLocaleString()}+ brands...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 h-12 text-base rounded-full bg-[hsl(var(--mall-input-bg))] text-[hsl(var(--mall-text))] border border-[hsl(var(--mall-border))] focus:border-[hsl(var(--mall-accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mall-accent))]/30 placeholder:text-[hsl(var(--mall-text-muted))] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--mall-text-muted))] hover:text-[hsl(var(--mall-text))]"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.value
                    ? "bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)]"
                    : "bg-[hsl(var(--mall-input-bg))] text-[hsl(var(--mall-text-muted))] hover:text-[hsl(var(--mall-text))] hover:bg-[hsl(0,0%,30%)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Featured Brands Row */}
        {!isSearching && featuredBrands.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[hsl(var(--mall-text))]">⭐ Featured Brands</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollFeatured("left")}
                  className="p-1.5 rounded-full text-[hsl(var(--mall-text-muted))] hover:text-[hsl(var(--mall-accent))] hover:bg-[hsl(0,0%,25%)] transition-colors hidden md:block"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scrollFeatured("right")}
                  className="p-1.5 rounded-full text-[hsl(var(--mall-text-muted))] hover:text-[hsl(var(--mall-accent))] hover:bg-[hsl(0,0%,25%)] transition-colors hidden md:block"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div
              ref={featuredScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {featuredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="snap-start flex-shrink-0 w-[220px] md:w-[260px] bg-[hsl(var(--mall-card))] rounded-xl p-5 border border-[hsl(var(--mall-border))] hover:border-[hsl(var(--mall-accent))] hover:-translate-y-1 transition-all cursor-pointer group"
                  onClick={() => setSelectedBrand(brand)}
                >
                  <div className="flex justify-center mb-4 bg-[hsl(0,0%,28%)] rounded-lg p-3">
                    <BrandLogo
                      src={brand.logo_url || undefined}
                      alt={brand.name}
                      size="lg"
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-[hsl(var(--mall-text))] text-center text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                    {brand.name}
                  </h3>
                  <p className="text-xs text-center font-medium text-[hsl(var(--mall-accent))] mb-3">
                    Earn NCTR on every purchase
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)] hover:bg-[hsl(75,100%,65%)] font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (brand.loyalize_id) handleShop(brand.id, brand.loyalize_id);
                    }}
                    disabled={!brand.loyalize_id}
                  >
                    Shop Now
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section Header */}
        {!isSearching && allBrands.length > 0 && (
          <h2 className="text-xl font-bold text-[hsl(var(--mall-text))] mb-4">
            🛍️ All Brands
          </h2>
        )}

        {/* Results Count */}
        {isSearching && filteredBrands.length > 0 && (
          <p className="text-sm text-[hsl(var(--mall-text-muted))] mb-4">
            {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Brand Grid */}
        {paginatedBrands.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {paginatedBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-[hsl(var(--mall-card))] rounded-xl p-4 border border-[hsl(var(--mall-border))] hover:border-[hsl(var(--mall-accent))] hover:-translate-y-0.5 transition-all cursor-pointer group"
                  onClick={() => setSelectedBrand(brand)}
                >
                  {/* Logo */}
                  <div className="flex justify-center mb-3 bg-[hsl(0,0%,28%)] rounded-lg p-2 aspect-square items-center">
                    <BrandLogo
                      src={brand.logo_url || undefined}
                      alt={brand.name}
                      size="lg"
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Brand Name */}
                  <h3 className="font-semibold text-[hsl(var(--mall-text))] text-center text-sm line-clamp-2 mb-1.5 min-h-[2.5rem]">
                    {brand.name}
                  </h3>

                  {/* Earn label */}
                  <p className="text-[11px] text-center font-medium text-[hsl(var(--mall-accent))] mb-3">
                    Earn NCTR on every purchase
                  </p>

                  {/* Shop Button */}
                  <Button
                    size="sm"
                    className="w-full bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)] hover:bg-[hsl(75,100%,65%)] font-semibold text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (brand.loyalize_id) handleShop(brand.id, brand.loyalize_id);
                    }}
                    disabled={!brand.loyalize_id}
                  >
                    Shop Now
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  className="border-[hsl(var(--mall-accent))] text-[hsl(var(--mall-accent))] bg-transparent hover:bg-[hsl(var(--mall-accent))]/10"
                >
                  Load More Brands
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State with Suggestion */}
        {noResults && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-lg text-[hsl(var(--mall-text-muted))] mb-2">
              No brands found for "{searchQuery || activeCategory}"
            </p>
            <p className="text-sm text-[hsl(var(--mall-text-muted))] mb-6">
              Don't see your brand? Suggest it →
            </p>
            <div className="flex gap-2 w-full max-w-md">
              <input
                type="text"
                placeholder="Brand name..."
                value={suggestionName}
                onChange={(e) => setSuggestionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSuggestion()}
                className="flex-1 h-11 px-4 rounded-lg bg-[hsl(var(--mall-input-bg))] text-[hsl(var(--mall-text))] border border-[hsl(var(--mall-border))] focus:border-[hsl(var(--mall-accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mall-accent))]/30 placeholder:text-[hsl(var(--mall-text-muted))]"
              />
              <Button
                onClick={handleSuggestion}
                disabled={!suggestionName.trim() || submittingSuggestion}
                className="bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)] hover:bg-[hsl(75,100%,65%)] font-semibold"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Non-searching suggestion form */}
        {!isSearching && allBrands.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-lg text-[hsl(var(--mall-text-muted))]">No brands available yet.</p>
          </div>
        )}
      </div>

      {/* Brand Detail Modal */}
      {selectedBrand && (
        <BrandDetailModal
          isOpen={!!selectedBrand}
          onClose={() => setSelectedBrand(null)}
          brand={selectedBrand}
          userId={userId}
          onShop={handleShop}
        />
      )}
    </div>
  );
};

export default MallView;
