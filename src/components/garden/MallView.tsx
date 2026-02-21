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
import { WellnessCollection } from "./WellnessCollection";
import { InspirationPartnersSection } from "./InspirationPartnersSection";

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
  display_order?: number | null;
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
  const [inspirationBrandIds, setInspirationBrandIds] = useState<Set<string>>(new Set());
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
            .limit(7000),
          supabase
            .from("brands")
            .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label, description, featured, display_order")
            .eq("is_active", true)
            .eq("featured", true)
            .order("display_order", { ascending: true })
            .order("name")
            .limit(10),
        ]);

        setTotalBrands(countRes.count || 0);
        setAllBrands(brandsRes.data || []);
        setFeaturedBrands(featuredRes.data || []);

        // Fetch inspiration tag brand IDs
        const { data: tagData } = await supabase.from("brand_tags").select("id").eq("slug", "inspiration").single();
        if (tagData) {
          const { data: assignments } = await supabase.from("brand_tag_assignments").select("brand_id").eq("tag_id", tagData.id);
          if (assignments) {
            setInspirationBrandIds(new Set(assignments.map(a => a.brand_id).filter(Boolean) as string[]));
          }
        }
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

    return filtered;
  }, [allBrands, activeCategory]);

  // Live Supabase search results
  const [searchResults, setSearchResults] = useState<Brand[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const term = `%${searchQuery.trim()}%`;
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, logo_url, category, nctr_per_dollar, loyalize_id, is_promoted, promotion_multiplier, promotion_label, description, featured, display_order")
          .eq("is_active", true)
          .or(`name.ilike.${term},category.ilike.${term},description.ilike.${term}`)
          .order("display_order", { ascending: true })
          .order("name")
          .limit(100);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayBrands = searchQuery.trim().length >= 2 ? searchResults : filteredBrands;

  const paginatedBrands = useMemo(
    () => displayBrands.slice(0, page * PAGE_SIZE),
    [displayBrands, page]
  );

  const hasMore = paginatedBrands.length < displayBrands.length;

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
        title: "🛒 Happy Shopping!",
        description: "Your NCTR will be credited within 48 hours. More NCTR = higher Crescendo status = better rewards.",
        duration: 6000,
        className: "garden-shop-toast",
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
  const noResults = isSearching && displayBrands.length === 0;

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

      {/* Hero CTA Section */}
      <div style={{ padding: 'clamp(2rem,4vw,3rem) 0 clamp(1.5rem,3vw,2.5rem)' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px,4.5vw,52px)',
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 'clamp(1.5rem,3vw,2.5rem)',
        }}>
          Live Your Life.<br />
          <span style={{ color: 'var(--color-accent)', filter: 'drop-shadow(0 0 18px rgba(226,255,109,0.35))' }}>
            Earn NCTR.
          </span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          maxWidth: '860px',
          margin: '0 auto',
        }}>

          {/* Card 1 — Shop & Earn */}
          <div style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: 'clamp(1.5rem,3vw,2rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '0.75rem',
            overflow: 'hidden',
            transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = 'rgba(226,255,109,0.22)';
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.35)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'none';
          }}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%',
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(226,255,109,0.4), transparent)',
            }} />

            {/* Icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(226,255,109,0.08)',
              border: '1px solid rgba(226,255,109,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12" 
                  stroke="rgba(226,255,109,0.85)" strokeWidth="1.6" 
                  strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="20" r="1" fill="rgba(226,255,109,0.85)"/>
                <circle cx="17" cy="20" r="1" fill="rgba(226,255,109,0.85)"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px,2.5vw,26px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}>Shop &amp; Earn</h3>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'rgba(217,217,217,0.55)',
              margin: 0,
              maxWidth: '280px',
            }}>
              Shop 6,000+ brands and earn NCTR on every purchase — fueling your Crescendo status
            </p>

            <button
              onClick={() => {
                searchInputRef.current?.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                marginTop: '0.5rem',
                height: '40px', padding: '0 24px',
                background: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)',
                fontFamily: 'var(--font-body)',
                fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              Browse Brands →
            </button>
          </div>

          {/* Card 2 — Level Up */}
          <div style={{
            position: 'relative',
            background: 'rgba(226,255,109,0.03)',
            border: '1px solid rgba(226,255,109,0.1)',
            borderRadius: '16px',
            padding: 'clamp(1.5rem,3vw,2rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '0.75rem',
            overflow: 'hidden',
            transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = 'rgba(226,255,109,0.3)';
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.35), 0 0 40px rgba(226,255,109,0.06)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = 'rgba(226,255,109,0.1)';
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'none';
          }}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%',
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(226,255,109,0.55), transparent)',
            }} />

            {/* Icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(226,255,109,0.1)',
              border: '1px solid rgba(226,255,109,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 3l2.5 5 5.5.8-4 3.9.9 5.5L11 15.5 6.1 18.2l.9-5.5L3 8.8l5.5-.8L11 3z" 
                  stroke="rgba(226,255,109,0.9)" strokeWidth="1.6" 
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px,2.5vw,26px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}>Level Up Your Status</h3>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'rgba(217,217,217,0.55)',
              margin: 0,
              maxWidth: '280px',
            }}>
              Commit your NCTR in Crescendo for 360 days to activate your status tier and unlock rewards
            </p>

            <button
              onClick={() => navigate('/garden?tab=dashboard')}
              style={{
                marginTop: '0.5rem',
                height: '40px', padding: '0 24px',
                background: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)',
                fontFamily: 'var(--font-body)',
                fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              View My Status →
            </button>
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
              {featuredBrands.map((brand) => {
                const isFlagship = brand.featured && brand.display_order === 1;
                return (
                  <div
                    key={brand.id}
                    className={`snap-start flex-shrink-0 rounded-xl p-5 border hover:-translate-y-1 transition-all cursor-pointer group ${
                      isFlagship
                        ? "w-[240px] md:w-[280px] bg-[#F5EDE3] border-[#C4946A]/40 hover:border-[#C4946A] shadow-lg"
                        : "w-[220px] md:w-[260px] bg-[hsl(var(--mall-card))] border-[hsl(var(--mall-border))] hover:border-[hsl(var(--mall-accent))]"
                    }`}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    {/* Flagship Badge */}
                    {isFlagship && (
                      <div className="flex justify-center mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C4946A] text-white">
                          ✦ Inspiration Flagship
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-center mb-4 rounded-lg p-3 ${
                      isFlagship ? "bg-[#EDE4D8]" : "bg-[hsl(0,0%,28%)]"
                    }`}>
                      <BrandLogo
                        src={brand.logo_url || undefined}
                        alt={brand.name}
                        size="lg"
                        className="group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h3 className={`font-semibold text-center text-sm line-clamp-2 mb-2 min-h-[2.5rem] ${
                      isFlagship ? "text-[#3B2F25]" : "text-[hsl(var(--mall-text))]"
                    }`}>
                      {brand.name}
                    </h3>
                    <p className={`text-xs text-center font-medium mb-3 ${
                      isFlagship ? "text-[#C4946A]" : "text-[hsl(var(--mall-accent))]"
                    }`}>
                      {isFlagship ? "Earn 3 NCTR per $1 spent" : "Earn NCTR on every purchase"}
                    </p>
                    <Button
                      size="sm"
                      className={`w-full font-semibold ${
                        isFlagship
                          ? "bg-[#C4946A] text-white hover:bg-[#A97D5A]"
                          : "bg-[hsl(var(--mall-accent))] text-[hsl(0,0%,20%)] hover:bg-[hsl(75,100%,65%)]"
                      }`}
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
                );
              })}
            </div>
          </section>
        )}

        {/* INSPIRATION Partners */}
        {!isSearching && (
          <InspirationPartnersSection
            onShop={handleShop}
            onBrandClick={(brand) => setSelectedBrand({
              id: brand.id,
              name: brand.name,
              logo_url: brand.logo_url || null,
              category: brand.category,
              nctr_per_dollar: brand.nctr_per_dollar || null,
              loyalize_id: brand.loyalize_id || null,
              description: brand.description,
            })}
          />
        )}

        {/* Wellness Collection */}
        {!isSearching && (
          <WellnessCollection
            onShop={handleShop}
            onBrandClick={(brand) => setSelectedBrand({
              id: brand.id,
              name: brand.name,
              logo_url: brand.logo_url || null,
              category: "Health & Wellness",
              nctr_per_dollar: brand.nctr_per_dollar || null,
              loyalize_id: brand.loyalize_id || null,
              description: brand.tagline,
            })}
          />
        )}

        {/* Section Header */}
        {!isSearching && allBrands.length > 0 && (
          <h2 className="text-xl font-bold text-[hsl(var(--mall-text))] mb-4">
            🛍️ All Brands
          </h2>
        )}

        {/* Results Count */}
        {isSearching && displayBrands.length > 0 && (
          <p className="text-sm text-[hsl(var(--mall-text-muted))] mb-4">
            {searchQuery.trim().length >= 2 && searchLoading ? "Searching..." : `${displayBrands.length} brand${displayBrands.length !== 1 ? "s" : ""} found`}
          </p>
        )}

        {/* Brand Grid */}
        {paginatedBrands.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {paginatedBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-[hsl(var(--mall-card))] rounded-xl p-4 border border-[hsl(var(--mall-border))] hover:border-[hsl(var(--mall-accent))] hover:-translate-y-0.5 transition-all cursor-pointer group relative"
                  onClick={() => setSelectedBrand(brand)}
                >
                  {/* INSPIRATION badge */}
                  {inspirationBrandIds.has(brand.id) && (
                    <span className="absolute bottom-14 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold z-10" style={{ background: "#E2FF6D", color: "#323232" }}>
                      ✨ INSPIRATION
                    </span>
                  )}
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
