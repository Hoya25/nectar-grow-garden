import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft,
  Search,
  Building2,
  Star,
  Sparkles,
  TrendingUp,
  Pencil,
  Loader2,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  commission_rate: number | null;
  nctr_per_dollar: number | null;
  featured: boolean;
  is_active: boolean;
  is_promoted: boolean | null;
  promotion_multiplier: number | null;
  promotion_label: string | null;
  promotion_ends_at: string | null;
  use_custom_rate: boolean | null;
}

interface Stats {
  totalActive: number;
  featuredCount: number;
  promotedCount: number;
  avgNctrPerDollar: number;
}

interface RateSettings {
  floor_rate: number;
  multiplier: number;
  max_rate: number;
}

const ITEMS_PER_PAGE = 50;
const DEFAULT_FLOOR_RATE = 2;
const DEFAULT_MULTIPLIER = 1000;
const DEFAULT_MAX_RATE = 500;

const AdminBrandRates = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading, logActivity } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalActive: 0,
    featuredCount: 0,
    promotedCount: 0,
    avgNctrPerDollar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "promoted" | "high-commission" | "custom-rate">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"nctr-high" | "nctr-low" | "commission" | "name">("nctr-high");
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Hybrid rate settings
  const [rateSettings, setRateSettings] = useState<RateSettings>({ 
    floor_rate: DEFAULT_FLOOR_RATE, 
    multiplier: DEFAULT_MULTIPLIER, 
    max_rate: DEFAULT_MAX_RATE 
  });
  const [editFloorRate, setEditFloorRate] = useState<string>(String(DEFAULT_FLOOR_RATE));
  const [editMultiplier, setEditMultiplier] = useState<string>(String(DEFAULT_MULTIPLIER));
  const [editMaxRate, setEditMaxRate] = useState<string>(String(DEFAULT_MAX_RATE));
  const [savingRate, setSavingRate] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({
    nctr_per_dollar: 0,
    featured: false,
    is_promoted: false,
    promotion_multiplier: 1,
    promotion_label: "",
    promotion_ends_at: "",
    use_custom_rate: false,
  });
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!adminLoading && !isAdmin) {
      navigate("/garden");
      return;
    }
    if (isAdmin) {
      fetchBrands();
      fetchStats();
      fetchRateSettings();
    }
  }, [user, isAdmin, authLoading, adminLoading]);

  const fetchRateSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "nctr_default_rate")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching rate settings:", error);
        return;
      }

      if (data?.value) {
        const value = data.value as unknown as RateSettings;
        const settings = {
          floor_rate: value.floor_rate || DEFAULT_FLOOR_RATE,
          multiplier: value.multiplier || DEFAULT_MULTIPLIER,
          max_rate: value.max_rate || DEFAULT_MAX_RATE,
        };
        setRateSettings(settings);
        setEditFloorRate(String(settings.floor_rate));
        setEditMultiplier(String(settings.multiplier));
        setEditMaxRate(String(settings.max_rate));
      }
    } catch (error) {
      console.error("Error fetching rate settings:", error);
    }
  };

  const saveRateSettings = async () => {
    const floorRate = parseFloat(editFloorRate);
    const multiplier = parseFloat(editMultiplier);
    const maxRate = parseFloat(editMaxRate);

    if (isNaN(floorRate) || floorRate < 0) {
      toast({
        title: "Invalid Value",
        description: "Floor rate must be a non-negative number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(multiplier) || multiplier <= 0) {
      toast({
        title: "Invalid Value",
        description: "Multiplier must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(maxRate) || maxRate <= 0) {
      toast({
        title: "Invalid Value",
        description: "Max rate must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setSavingRate(true);
    try {
      const newSettings = { floor_rate: floorRate, multiplier, max_rate: maxRate };
      
      // Check if setting exists first
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "nctr_default_rate")
        .single();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from("app_settings")
          .update({
            value: JSON.parse(JSON.stringify(newSettings)),
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("key", "nctr_default_rate");
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("app_settings")
          .insert([{
            key: "nctr_default_rate",
            value: JSON.parse(JSON.stringify(newSettings)),
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          }]);
        error = result.error;
      }

      if (error) throw error;

      setRateSettings(newSettings);
      await logActivity("updated_nctr_rate_settings", "app_settings", "nctr_default_rate", newSettings);

      toast({
        title: "Rate Settings Saved",
        description: `Hybrid formula: MAX(${floorRate}, commission × ${multiplier}), capped at ${maxRate}`,
      });
    } catch (error) {
      console.error("Error saving rate settings:", error);
      toast({
        title: "Error",
        description: "Failed to save rate settings",
        variant: "destructive",
      });
    } finally {
      setSavingRate(false);
    }
  };

  const fetchBrands = async () => {
    try {
      // Fetch all brands using pagination to overcome the 1000 row limit
      const PAGE_SIZE = 1000;
      let allBrands: Brand[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, logo_url, category, commission_rate, nctr_per_dollar, featured, is_active, is_promoted, promotion_multiplier, promotion_label, promotion_ends_at, use_custom_rate")
          .eq("is_active", true)
          .order("name")
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allBrands = [...allBrands, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      setBrands(allBrands);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(allBrands.map(b => b.category).filter(Boolean) as string[])].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast({
        title: "Error",
        description: "Failed to load brands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Use aggregate queries to get accurate counts without row limits
      const [activeResult, featuredResult, promotedResult] = await Promise.all([
        supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true).eq("featured", true),
        supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_promoted", true),
      ]);

      // Get sample for average calculation
      const { data: sampleData } = await supabase
        .from("brands")
        .select("nctr_per_dollar")
        .eq("is_active", true)
        .not("nctr_per_dollar", "is", null)
        .gt("nctr_per_dollar", 0)
        .limit(1000);
      
      let avgNctrPerDollar = 0;
      if (sampleData && sampleData.length > 0) {
        const values = sampleData.map(b => b.nctr_per_dollar).filter((v): v is number => v !== null);
        avgNctrPerDollar = values.reduce((a, b) => a + b, 0) / values.length;
      }

      setStats({
        totalActive: activeResult.count || 0,
        featuredCount: featuredResult.count || 0,
        promotedCount: promotedResult.count || 0,
        avgNctrPerDollar,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Calculate the hybrid rate from commission using formula: MAX(floor, commission × multiplier), capped at max
  const getCalculatedRate = (brand: Brand) => {
    const commissionRate = brand.commission_rate || 0;
    const calculated = commissionRate * rateSettings.multiplier;
    const floored = Math.max(rateSettings.floor_rate, calculated);
    return Math.min(floored, rateSettings.max_rate);
  };

  // Get the base rate for a brand (calculated or custom)
  const getBaseRate = (brand: Brand) => {
    return brand.use_custom_rate 
      ? (brand.nctr_per_dollar || 0)
      : getCalculatedRate(brand);
  };

  // Calculate final NCTR rate for a brand (with promotion multiplier)
  const getFinalRate = (brand: Brand) => {
    const baseRate = getBaseRate(brand);
    const promoMultiplier = brand.is_promoted ? (brand.promotion_multiplier || 1) : 1;
    return baseRate * promoMultiplier;
  };

  // Filter and sort brands
  const filteredBrands = useMemo(() => {
    let result = [...brands];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (filter) {
      case "featured":
        result = result.filter(b => b.featured);
        break;
      case "promoted":
        result = result.filter(b => b.is_promoted);
        break;
      case "high-commission":
        // Commission rates are stored as decimals - consider > 10% as high
        result = result.filter(b => {
          const rate = b.commission_rate || 0;
          const pct = rate * 100;
          return pct > 10;
        });
        break;
      case "custom-rate":
        result = result.filter(b => b.use_custom_rate);
        break;
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(b => b.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case "nctr-high":
        result.sort((a, b) => getFinalRate(b) - getFinalRate(a));
        break;
      case "nctr-low":
        result.sort((a, b) => getFinalRate(a) - getFinalRate(b));
        break;
      case "commission":
        result.sort((a, b) => (b.commission_rate || 0) - (a.commission_rate || 0));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [brands, searchQuery, filter, categoryFilter, sortBy, rateSettings]);

  // Pagination
  const totalPages = Math.ceil(filteredBrands.length / ITEMS_PER_PAGE);
  const paginatedBrands = filteredBrands.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleInlineCustomRateEdit = async (brandId: string) => {
    const value = parseFloat(inlineEditValue);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid NCTR rate",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("brands")
        .update({ nctr_per_dollar: value, use_custom_rate: true })
        .eq("id", brandId);

      if (error) throw error;

      setBrands(prev => prev.map(b => 
        b.id === brandId ? { ...b, nctr_per_dollar: value, use_custom_rate: true } : b
      ));

      await logActivity("updated_nctr_rate", "brand", brandId, { nctr_per_dollar: value, use_custom_rate: true });

      toast({
        title: "Rate Updated",
        description: `Custom NCTR rate set to ${value.toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error updating rate:", error);
      toast({
        title: "Error",
        description: "Failed to update rate",
        variant: "destructive",
      });
    } finally {
      setInlineEditId(null);
      setInlineEditValue("");
    }
  };

  const handleToggleCustomRate = async (brand: Brand, useCustom: boolean) => {
    try {
      const updateData: Partial<Brand> = { use_custom_rate: useCustom };
      
      // If switching to custom rate and no nctr_per_dollar is set, default to calculated rate
      if (useCustom && !brand.nctr_per_dollar) {
        updateData.nctr_per_dollar = getCalculatedRate(brand);
      }

      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", brand.id);

      if (error) throw error;

      setBrands(prev => prev.map(b => 
        b.id === brand.id ? { ...b, ...updateData } : b
      ));

      await logActivity("toggled_custom_rate", "brand", brand.id, { use_custom_rate: useCustom });

      toast({
        title: useCustom ? "Custom Rate Enabled" : "Using Calculated Rate",
        description: useCustom 
          ? `${brand.name} now uses a custom rate` 
          : `${brand.name} now uses the calculated rate`,
      });
    } catch (error) {
      console.error("Error toggling custom rate:", error);
      toast({
        title: "Error",
        description: "Failed to update rate setting",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    const calculatedRate = getCalculatedRate(brand);
    setEditForm({
      nctr_per_dollar: brand.use_custom_rate ? (brand.nctr_per_dollar || calculatedRate) : calculatedRate,
      featured: brand.featured,
      is_promoted: brand.is_promoted || false,
      promotion_multiplier: brand.promotion_multiplier || 1,
      promotion_label: brand.promotion_label || "",
      promotion_ends_at: brand.promotion_ends_at?.split("T")[0] || "",
      use_custom_rate: brand.use_custom_rate || false,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBrand) return;
    setSaving(true);

    try {
      const updateData: Partial<Brand> = {
        use_custom_rate: editForm.use_custom_rate,
        nctr_per_dollar: editForm.use_custom_rate ? editForm.nctr_per_dollar : editingBrand.nctr_per_dollar,
        featured: editForm.featured,
        is_promoted: editForm.is_promoted,
        promotion_multiplier: editForm.is_promoted ? editForm.promotion_multiplier : null,
        promotion_label: editForm.is_promoted ? editForm.promotion_label : null,
        promotion_ends_at: editForm.is_promoted && editForm.promotion_ends_at 
          ? new Date(editForm.promotion_ends_at).toISOString() 
          : null,
      };

      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", editingBrand.id);

      if (error) throw error;

      setBrands(prev => prev.map(b => 
        b.id === editingBrand.id ? { ...b, ...updateData } : b
      ));

      await logActivity("updated_brand_settings", "brand", editingBrand.id, updateData);

      toast({
        title: "Brand Updated",
        description: `${editingBrand.name} settings saved successfully`,
      });

      setEditModalOpen(false);
      fetchStats();
    } catch (error) {
      console.error("Error saving brand:", error);
      toast({
        title: "Error",
        description: "Failed to save brand settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate preview rate in edit modal
  const getEditPreviewRate = () => {
    const calculatedRate = editingBrand ? getCalculatedRate(editingBrand) : 0;
    const baseRate = editForm.use_custom_rate 
      ? editForm.nctr_per_dollar 
      : calculatedRate;
    const promoMultiplier = editForm.is_promoted ? editForm.promotion_multiplier : 1;
    return baseRate * promoMultiplier;
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Brand NCTR Rate Management</h1>
              <p className="text-sm text-muted-foreground">Control what members earn per dollar spent</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hybrid NCTR Rate Settings Card */}
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              💰 NCTR Rate Settings (Hybrid)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Row */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="floor_rate">Floor Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="floor_rate"
                    type="number"
                    step="1"
                    min="0"
                    value={editFloorRate}
                    onChange={(e) => setEditFloorRate(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">NCTR/$1</span>
                </div>
                <p className="text-xs text-muted-foreground">Minimum any brand gives</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiplier">Multiplier</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="100"
                  min="1"
                  value={editMultiplier}
                  onChange={(e) => setEditMultiplier(e.target.value)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">commission × this = rate</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_rate">Max Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="max_rate"
                    type="number"
                    step="10"
                    min="1"
                    value={editMaxRate}
                    onChange={(e) => setEditMaxRate(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">NCTR/$1</span>
                </div>
                <p className="text-xs text-muted-foreground">Cap for bad data</p>
              </div>
            </div>

            {/* Formula and Examples */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Formula:</p>
                <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
                  User rate = MAX(floor, commission × multiplier), capped at max
                </div>
                <Button 
                  onClick={saveRateSettings} 
                  disabled={savingRate}
                  className="w-full"
                >
                  {savingRate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Settings
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Examples with current settings:</p>
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
                  {[0.02, 0.05, 0.10].map((comm) => {
                    const floor = parseFloat(editFloorRate) || 0;
                    const mult = parseFloat(editMultiplier) || 0;
                    const max = parseFloat(editMaxRate) || 500;
                    const calculated = comm * mult;
                    const result = Math.min(Math.max(floor, calculated), max);
                    return (
                      <div key={comm} className="flex justify-between">
                        <span className="text-muted-foreground">{(comm * 100).toFixed(0)}% commission →</span>
                        <span className="font-medium">
                          max({floor}, {calculated.toFixed(0)}) = <span className="text-primary">{result.toFixed(0)}</span> NCTR/$1
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Brands</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalActive.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured Brands</CardTitle>
              <Star className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {stats.featuredCount}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Promoted</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.promotedCount}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Floor Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {rateSettings.floor_rate}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "all", label: "All" },
                  { value: "featured", label: "Featured" },
                  { value: "promoted", label: "Promoted" },
                  { value: "high-commission", label: "High Commission" },
                  { value: "custom-rate", label: "Custom Rate" },
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={filter === item.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilter(item.value as typeof filter);
                      setCurrentPage(1);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              {/* Category Dropdown */}
              <Select 
                value={categoryFilter} 
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Dropdown */}
              <Select 
                value={sortBy} 
                onValueChange={(v) => setSortBy(v as typeof sortBy)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nctr-high">Highest NCTR</SelectItem>
                  <SelectItem value="nctr-low">Lowest NCTR</SelectItem>
                  <SelectItem value="commission">Highest Commission</SelectItem>
                  <SelectItem value="name">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              Showing {paginatedBrands.length} of {filteredBrands.length} brands
            </div>
          </CardContent>
        </Card>

        {/* Brands Table */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Brand</TableHead>
                      <TableHead className="text-muted-foreground">Commission %</TableHead>
                      <TableHead className="text-muted-foreground">Calculated</TableHead>
                      <TableHead>Custom</TableHead>
                      <TableHead className="text-primary">User Sees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBrands.map((brand) => {
                      const calculatedRate = getCalculatedRate(brand);
                      const finalRate = getFinalRate(brand);
                      
                      return (
                        <TableRow key={brand.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <BrandLogo
                                src={brand.logo_url || undefined}
                                alt={brand.name}
                                size="md"
                              />
                              <span className="font-medium">{brand.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {brand.commission_rate != null
                              ? `${(brand.commission_rate * 100).toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {calculatedRate.toFixed(0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={brand.use_custom_rate || false}
                                onCheckedChange={(checked) => handleToggleCustomRate(brand, checked)}
                              />
                              {brand.use_custom_rate && (
                                inlineEditId === brand.id ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inlineEditValue}
                                    onChange={(e) => setInlineEditValue(e.target.value)}
                                    onBlur={() => handleInlineCustomRateEdit(brand.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleInlineCustomRateEdit(brand.id);
                                      if (e.key === "Escape") {
                                        setInlineEditId(null);
                                        setInlineEditValue("");
                                      }
                                    }}
                                    className="w-20 h-7 text-sm"
                                    autoFocus
                                  />
                                ) : (
                                  <button
                                    onClick={() => {
                                      setInlineEditId(brand.id);
                                      setInlineEditValue(String(brand.nctr_per_dollar ?? calculatedRate));
                                    }}
                                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                                  >
                                    {(brand.nctr_per_dollar ?? 0).toFixed(2)}
                                  </button>
                                )
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-primary font-bold text-lg">
                              {finalRate.toFixed(2)}
                            </span>
                            {brand.is_promoted && brand.promotion_multiplier && brand.promotion_multiplier > 1 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({brand.promotion_multiplier}x)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {brand.use_custom_rate && (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                              {brand.featured && (
                                <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                                  Featured
                                </Badge>
                              )}
                              {brand.is_promoted && (
                                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                                  Promoted
                                </Badge>
                              )}
                              {!brand.featured && !brand.is_promoted && !brand.use_custom_rate && (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(brand)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingBrand && (
                <>
                  <BrandLogo
                    src={editingBrand.logo_url || undefined}
                    alt={editingBrand.name}
                    size="md"
                  />
                  <span>Edit {editingBrand.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {editingBrand && (
            <div className="space-y-6 py-4">
              {/* Commission (read-only) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Commission Rate (from Loyalize)</Label>
                <div className="text-lg font-medium text-muted-foreground">
                  {editingBrand.commission_rate != null 
                    ? `${(editingBrand.commission_rate * 100).toFixed(1)}%` 
                    : "Not set"}
                </div>
              </div>

              {/* Rate Settings Section */}
              <div className="space-y-4 p-4 border rounded-lg border-border bg-muted/30">
                <h4 className="font-medium text-foreground">Rate Settings</h4>
                
                {/* Commission Rate (read-only) */}
                <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
                  <span className="text-sm text-muted-foreground">Commission Rate:</span>
                  <span className="font-medium text-muted-foreground">
                    {editingBrand?.commission_rate != null
                      ? `${(editingBrand.commission_rate * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>

                {/* Calculated Rate (read-only) */}
                <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
                  <span className="text-sm text-muted-foreground">Calculated Rate:</span>
                  <span className="font-medium text-muted-foreground">
                    {editingBrand ? getCalculatedRate(editingBrand).toFixed(0) : 0} NCTR/$1
                  </span>
                </div>
                
                {/* Use Custom Rate Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Use Custom Rate</Label>
                    <p className="text-sm text-muted-foreground">Override the calculated rate</p>
                  </div>
                  <Switch
                    checked={editForm.use_custom_rate}
                    onCheckedChange={(checked) => {
                      const calculatedRate = editingBrand ? getCalculatedRate(editingBrand) : 0;
                      setEditForm(prev => ({ 
                        ...prev, 
                        use_custom_rate: checked,
                        nctr_per_dollar: checked ? prev.nctr_per_dollar : calculatedRate,
                      }));
                    }}
                  />
                </div>

                {!editForm.use_custom_rate ? (
                  <div className="space-y-2 p-3 bg-background rounded border border-border">
                    <p className="text-sm text-muted-foreground">This brand uses the calculated rate:</p>
                    <p className="text-lg font-semibold text-foreground">
                      <span className="text-primary">{editingBrand ? getCalculatedRate(editingBrand).toFixed(0) : 0}</span> NCTR/$1
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="custom_nctr_rate">Custom Rate</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="custom_nctr_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.nctr_per_dollar}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          nctr_per_dollar: parseFloat(e.target.value) || 0 
                        }))}
                        className="text-primary font-semibold w-32"
                      />
                      <span className="text-sm text-muted-foreground">NCTR/$1</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This brand has a custom rate override
                    </p>
                  </div>
                )}
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Featured Brand</Label>
                  <p className="text-sm text-muted-foreground">Show in featured sections</p>
                </div>
                <Switch
                  checked={editForm.featured}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, featured: checked }))}
                />
              </div>

              {/* Promotion Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Promotion</Label>
                  <p className="text-sm text-muted-foreground">Highlight as promoted</p>
                </div>
                <Switch
                  checked={editForm.is_promoted}
                  onCheckedChange={(checked) => setEditForm(prev => ({ 
                    ...prev, 
                    is_promoted: checked,
                    promotion_multiplier: checked ? prev.promotion_multiplier : 1,
                  }))}
                />
              </div>

              {/* Promotion Settings */}
              {editForm.is_promoted && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                  <div className="space-y-2">
                    <Label>Promotion Multiplier</Label>
                    <Select
                      value={String(editForm.promotion_multiplier)}
                      onValueChange={(v) => setEditForm(prev => ({ 
                        ...prev, 
                        promotion_multiplier: parseFloat(v) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="2.5">2.5x</SelectItem>
                        <SelectItem value="3">3x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promo_label">Promotion Label</Label>
                    <Input
                      id="promo_label"
                      placeholder="e.g., Summer Sale Bonus"
                      value={editForm.promotion_label}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        promotion_label: e.target.value 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promo_end">Promotion Ends</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="promo_end"
                        type="date"
                        value={editForm.promotion_ends_at}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          promotion_ends_at: e.target.value 
                        }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Calculation */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview: Member earns on $100 purchase</p>
                  <p className="text-2xl font-bold text-primary">
                    {(getEditPreviewRate() * 100).toFixed(2)} NCTR
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Final rate: {getEditPreviewRate().toFixed(2)} NCTR/$1
                    {editForm.is_promoted && editForm.promotion_multiplier > 1 && (
                      <span className="ml-1">({editForm.promotion_multiplier}x promotion applied)</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBrandRates;
