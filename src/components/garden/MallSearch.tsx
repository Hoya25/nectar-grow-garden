import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Search, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  name: string;
  logo_url: string | null;
  nctr_per_dollar: number | null;
  loyalize_id: string | null;
}

interface MallSearchProps {
  totalBrands: number;
  onSelect?: (brand: SearchResult) => void;
}

export interface MallSearchHandle {
  focus: () => void;
}

const RECENT_SEARCHES_KEY = "garden_recent_searches";
const MAX_RECENT = 5;

export const MallSearch = forwardRef<MallSearchHandle, MallSearchProps>(
  ({ totalBrands, onSelect }, ref) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        setShowDropdown(true);
      }
    }));

    // Load recent searches from localStorage
    useEffect(() => {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse recent searches", e);
        }
      }
    }, []);

    // Save recent search
    const saveRecentSearch = (searchTerm: string) => {
      const updated = [
        searchTerm,
        ...recentSearches.filter((s) => s.toLowerCase() !== searchTerm.toLowerCase()),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    // Search brands
    const searchBrands = useCallback(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, logo_url, nctr_per_dollar, loyalize_id")
          .eq("is_active", true)
          .ilike("name", `%${searchQuery}%`)
          .order("name")
          .limit(10);

        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, []);

    // Debounced search
    useEffect(() => {
      const timer = setTimeout(() => {
        if (query.length >= 2) {
          searchBrands(query);
        } else {
          setResults([]);
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [query, searchBrands]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setShowDropdown(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (brand: SearchResult) => {
      saveRecentSearch(brand.name);
      setQuery("");
      setShowDropdown(false);
      onSelect?.(brand);
    };

    const handleRecentClick = (term: string) => {
      setQuery(term);
      searchBrands(term);
    };

    const clearRecent = () => {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    return (
      <div className="garden-theme relative w-full max-w-2xl mx-auto">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 garden-text-muted" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={`Search ${totalBrands.toLocaleString()} brands...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="pl-12 pr-10 h-12 text-lg rounded-full garden-card garden-text border-2 focus:border-[hsl(75,100%,50%)]"
            style={{ 
              borderColor: 'hsl(var(--garden-border))',
              backgroundColor: 'hsl(var(--garden-card))'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 garden-text-muted hover:garden-text"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (query.length >= 2 || recentSearches.length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 garden-card rounded-xl shadow-lg z-50 overflow-hidden max-h-[400px] overflow-y-auto"
          >
            {/* Loading */}
            {loading && (
              <div className="p-4 text-center garden-text-muted">
                Searching...
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => handleSelect(brand)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--garden-accent)/0.1)] transition-colors text-left btn-press"
                  >
                    <BrandLogo
                      src={brand.logo_url || undefined}
                      alt={brand.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium garden-text truncate">
                        {brand.name}
                      </p>
                    </div>
                    <span className="nctr-rate text-sm shrink-0">
                      {(brand.nctr_per_dollar || 0).toFixed(0)} NCTR/$1
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="p-4 text-center garden-text-muted">
                No brands found for "{query}"
              </div>
            )}

            {/* Recent searches */}
            {!query && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs font-medium garden-text-muted uppercase">
                    Recent Searches
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-xs garden-text-muted hover:garden-text"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(term)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[hsl(var(--garden-accent)/0.1)] transition-colors text-left btn-press"
                  >
                    <Clock className="h-4 w-4 garden-text-muted" />
                    <span className="garden-text">{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

MallSearch.displayName = "MallSearch";

export default MallSearch;
