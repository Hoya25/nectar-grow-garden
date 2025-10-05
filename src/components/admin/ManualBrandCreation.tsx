import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { Plus, Loader2, ExternalLink } from 'lucide-react';
import { z } from 'zod';

interface ManualBrandCreationProps {
  onBrandCreated: () => void;
}

const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(200, "Name must be less than 200 characters"),
  description: z.string().trim().max(2000, "Description must be less than 2000 characters").optional(),
  category: z.string().trim().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  website_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters"),
  logo_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters").optional(),
  commission_rate: z.number().min(0, "Commission rate must be positive").max(1, "Commission rate must be less than 100%"),
  nctr_per_dollar: z.number().min(0, "NCTR per dollar must be positive").max(10000, "Value exceeds maximum"),
  is_active: z.boolean(),
  featured: z.boolean()
});

export default function ManualBrandCreation({ onBrandCreated }: ManualBrandCreationProps) {
  const { logActivity } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    website_url: '',
    logo_url: '',
    commission_rate: 0.05,
    nctr_per_dollar: 100,
    is_active: true,
    featured: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    try {
      brandSchema.parse(formData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const firstError = validationError.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      await logActivity('created', 'brand', data.id, {
        brand_name: formData.name,
        source: 'manual'
      });

      toast({
        title: "Brand Created",
        description: `${formData.name} has been added successfully.`,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: '',
        website_url: '',
        logo_url: '',
        commission_rate: 0.05,
        nctr_per_dollar: 100,
        is_active: true,
        featured: false
      });

      onBrandCreated();
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Brand Manually
        </CardTitle>
        <CardDescription>
          Add brands that are not available in Loyalize or Impact affiliate networks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rad.Live"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Software, Entertainment"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the brand and what they offer"
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL *</Label>
              <div className="relative">
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
                {formData.website_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7"
                    onClick={() => window.open(formData.website_url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commission_rate">Commission Rate (decimal) *</Label>
              <Input
                id="commission_rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                placeholder="0.05 = 5%"
                required
              />
              <p className="text-xs text-muted-foreground">
                Current: {(formData.commission_rate * 100).toFixed(2)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nctr_per_dollar">NCTR per $1 Spent *</Label>
              <Input
                id="nctr_per_dollar"
                type="number"
                step="0.01"
                min="0"
                value={formData.nctr_per_dollar}
                onChange={(e) => setFormData({ ...formData, nctr_per_dollar: parseFloat(e.target.value) || 0 })}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured
                </Label>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="bg-gradient-hero hover:opacity-90">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Brand
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
