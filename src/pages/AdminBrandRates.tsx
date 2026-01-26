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
}

interface Stats {
  totalActive: number;
  featuredCount: number;
  promotedCount: number;
  avgNctrPerDollar: number;
}

const ITEMS_PER_PAGE = 50;

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
  const [filter, setFilter] = useState<"all" | "featured" | "promoted" | "high-commission">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"nctr-high" | "nctr-low" | "commission" | "name">("nctr-high");
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  
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
    }
  }, [user, isAdmin, authLoading, adminLoading]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url, category, commission_rate, nctr_per_dollar, featured, is_active, is_promoted, promotion_multiplier, promotion_label, promotion_ends_at")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setBrands(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(b => b.category).filter(Boolean) as string[])].sort();
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
      const { data, error } = await supabase
        .from("brands")
        .select("is_active, featured, is_promoted, nctr_per_dollar");

      if (error) throw error;

      const activeBrands = data?.filter(b => b.is_active) || [];
      const totalActive = activeBrands.length;
      const featuredCount = activeBrands.filter(b => b.featured).length;
      const promotedCount = activeBrands.filter(b => b.is_promoted).length;
      
      const nctrValues = activeBrands
        .map(b => b.nctr_per_dollar)
        .filter((v): v is number => v !== null && v > 0);
      const avgNctrPerDollar = nctrValues.length > 0 
        ? nctrValues.reduce((a, b) => a + b, 0) / nctrValues.length 
        : 0;

      setStats({ totalActive, featuredCount, promotedCount, avgNctrPerDollar });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
        result = result.filter(b => (b.commission_rate || 0) > 10);
        break;
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(b => b.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case "nctr-high":
        result.sort((a, b) => (b.nctr_per_dollar || 0) - (a.nctr_per_dollar || 0));
        break;
      case "nctr-low":
        result.sort((a, b) => (a.nctr_per_dollar || 0) - (b.nctr_per_dollar || 0));
        break;
      case "commission":
        result.sort((a, b) => (b.commission_rate || 0) - (a.commission_rate || 0));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [brands, searchQuery, filter, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredBrands.length / ITEMS_PER_PAGE);
  const paginatedBrands = filteredBrands.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleInlineEdit = async (brandId: string) => {
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
        .update({ nctr_per_dollar: value })
        .eq("id", brandId);

      if (error) throw error;

      setBrands(prev => prev.map(b => 
        b.id === brandId ? { ...b, nctr_per_dollar: value } : b
      ));

      await logActivity("updated_nctr_rate", "brand", brandId, { nctr_per_dollar: value });

      toast({
        title: "Rate Updated",
        description: `NCTR rate updated to ${value.toFixed(2)}`,
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

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setEditForm({
      nctr_per_dollar: brand.nctr_per_dollar || 0,
      featured: brand.featured,
      is_promoted: brand.is_promoted || false,
      promotion_multiplier: brand.promotion_multiplier || 1,
      promotion_label: brand.promotion_label || "",
      promotion_ends_at: brand.promotion_ends_at?.split("T")[0] || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBrand) return;
    setSaving(true);

    try {
      const updateData: Partial<Brand> = {
        nctr_per_dollar: editForm.nctr_per_dollar,
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
              <CardTitle className="text-sm font-medium">Avg NCTR/$1</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {stats.avgNctrPerDollar.toFixed(2)}
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
                      <TableHead className="w-[300px]">Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-muted-foreground">Commission %</TableHead>
                      <TableHead className="text-primary">NCTR/$1</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBrands.map((brand) => (
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
                          {brand.category || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {brand.commission_rate ? `${brand.commission_rate.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell>
                          {inlineEditId === brand.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => handleInlineEdit(brand.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleInlineEdit(brand.id);
                                if (e.key === "Escape") {
                                  setInlineEditId(null);
                                  setInlineEditValue("");
                                }
                              }}
                              className="w-24 h-8 text-primary font-semibold"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setInlineEditId(brand.id);
                                setInlineEditValue(String(brand.nctr_per_dollar || 0));
                              }}
                              className="text-primary font-semibold hover:underline cursor-pointer"
                            >
                              {brand.nctr_per_dollar?.toFixed(2) || "0.00"}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {brand.featured && (
                              <Badge variant="secondary" className="bg-accent/20 text-accent">
                                Featured
                              </Badge>
                            )}
                            {brand.is_promoted && (
                              <Badge variant="secondary" className="bg-primary/20 text-primary">
                                Promoted
                              </Badge>
                            )}
                            {!brand.featured && !brand.is_promoted && (
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
                    ))}
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
        <DialogContent className="sm:max-w-[500px]">
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
                  {editingBrand.commission_rate ? `${editingBrand.commission_rate.toFixed(1)}%` : "Not set"}
                </div>
              </div>

              {/* NCTR per Dollar */}
              <div className="space-y-2">
                <Label htmlFor="nctr_rate">NCTR per $1 Spent</Label>
                <Input
                  id="nctr_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.nctr_per_dollar}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    nctr_per_dollar: parseFloat(e.target.value) || 0 
                  }))}
                  className="text-primary font-semibold"
                />
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
                    {(editForm.nctr_per_dollar * 100 * (editForm.is_promoted ? editForm.promotion_multiplier : 1)).toFixed(2)} NCTR
                  </p>
                  {editForm.is_promoted && editForm.promotion_multiplier > 1 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ({editForm.promotion_multiplier}x promotion applied)
                    </p>
                  )}
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
