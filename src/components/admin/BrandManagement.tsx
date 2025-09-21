import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Building2, 
  Edit, 
  Trash2, 
  Search, 
  ExternalLink,
  Star,
  Loader2
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
  category: string;
  loyalize_id: string;
  commission_rate: number;
  nctr_per_dollar: number;
  is_active: boolean;
  featured: boolean;
  created_at: string;
}

interface BrandManagementProps {
  onStatsUpdate: () => void;
}

const BrandManagement = ({ onStatsUpdate }: BrandManagementProps) => {
  const { logActivity } = useAdmin();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    category: '',
    loyalize_id: '',
    commission_rate: 0.05,
    nctr_per_dollar: 0.01,
    is_active: true,
    featured: false
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      website_url: '',
      category: '',
      loyalize_id: '',
      commission_rate: 0.05,
      nctr_per_dollar: 0.01,
      is_active: true,
      featured: false
    });
    setEditingBrand(null);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      website_url: brand.website_url || '',
      category: brand.category || '',
      loyalize_id: brand.loyalize_id || '',
      commission_rate: brand.commission_rate,
      nctr_per_dollar: brand.nctr_per_dollar,
      is_active: brand.is_active,
      featured: brand.featured
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingBrand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update(formData)
          .eq('id', editingBrand.id);

        if (error) throw error;

        await logActivity('updated', 'brand', editingBrand.id, { 
          brand_name: formData.name,
          changes: formData 
        });

        toast({
          title: "Brand Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new brand
        const { data, error } = await supabase
          .from('brands')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;

        await logActivity('created', 'brand', data.id, { 
          brand_name: formData.name 
        });

        toast({
          title: "Brand Created",
          description: `${formData.name} has been added successfully.`,
        });
      }

      fetchBrands();
      onStatsUpdate();
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Error",
        description: "Failed to save brand.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete ${brand.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brand.id);

      if (error) throw error;

      await logActivity('deleted', 'brand', brand.id, { 
        brand_name: brand.name 
      });

      toast({
        title: "Brand Deleted",
        description: `${brand.name} has been deleted.`,
      });

      fetchBrands();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand.",
        variant: "destructive",
      });
    }
  };

  const toggleBrandStatus = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: !brand.is_active })
        .eq('id', brand.id);

      if (error) throw error;

      await logActivity(
        brand.is_active ? 'deactivated' : 'activated', 
        'brand', 
        brand.id, 
        { brand_name: brand.name }
      );

      toast({
        title: `Brand ${brand.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${brand.name} has been ${brand.is_active ? 'deactivated' : 'activated'}.`,
      });

      fetchBrands();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling brand status:', error);
      toast({
        title: "Error",
        description: "Failed to update brand status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Brand Management</h3>
          <p className="text-muted-foreground">Manage brand partnerships and commission rates</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-gradient-hero hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingBrand ? 'Edit Brand' : 'Add New Brand'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Brand Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="e.g., Fashion, Electronics"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brand description for users..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loyalize_id">Loyalize ID</Label>
                    <Input
                      id="loyalize_id"
                      value={formData.loyalize_id}
                      onChange={(e) => setFormData({...formData, loyalize_id: e.target.value})}
                      placeholder="Brand ID from Loyalize"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nctr_per_dollar">NCTR per $1</Label>
                    <Input
                      id="nctr_per_dollar"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.nctr_per_dollar}
                      onChange={(e) => setFormData({...formData, nctr_per_dollar: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-gradient-hero hover:opacity-90"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingBrand ? 'Update Brand' : 'Create Brand'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Brands Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No brands match your search.' : 'No brands added yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{brand.name}</CardTitle>
                      {brand.featured && <Star className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {brand.category && (
                        <Badge variant="outline">{brand.category}</Badge>
                      )}
                    </div>
                  </div>
                  {brand.logo_url && (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {brand.description || 'No description available.'}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Commission:</span>
                    <p className="font-medium">{(brand.commission_rate * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NCTR Rate:</span>
                    <p className="font-medium">{brand.nctr_per_dollar} per $1</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(brand)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleBrandStatus(brand)}
                  >
                    {brand.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(brand)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {brand.website_url && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(brand.website_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandManagement;