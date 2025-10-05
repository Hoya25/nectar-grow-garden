import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import BrandSearchInterface from './BrandSearchInterface';
import ImpactBrandSearch from './ImpactBrandSearch';
import {
  Plus, 
  Gift, 
  Edit, 
  Trash2, 
  Search,
  Users,
  ShoppingBag,
  Star,
  Loader2,
  ExternalLink,
  Video,
  Upload,
  X,
  Image,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
  ChevronsUpDown,
  Check
} from 'lucide-react';

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  nctr_reward: number;
  reward_per_dollar: number;
  partner_name: string;
  partner_logo_url: string;
  affiliate_link: string;
  video_url?: string;
  video_title?: string;
  video_description?: string;
  is_active: boolean;
  created_at: string;
  display_order: number;
  brand_id?: string | null;
  // New reward structure fields
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
  reward_structure?: any;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  category?: string;
  website_url?: string;
  commission_rate?: number;
  nctr_per_dollar?: number;
  is_active: boolean;
  featured?: boolean;
}

interface OpportunityManagementProps {
  onStatsUpdate: () => void;
}

// Security: Comprehensive input validation schema
const opportunitySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(2000, "Description must be less than 2000 characters").optional(),
  opportunity_type: z.string().min(1, "Type is required"),
  nctr_reward: z.number().min(0, "Reward must be positive").max(1000000, "Reward exceeds maximum").finite(),
  reward_per_dollar: z.number().min(0, "Rate must be positive").max(1000, "Rate exceeds maximum").finite().optional(),
  partner_name: z.string().trim().max(100, "Partner name must be less than 100 characters").optional(),
  partner_logo_url: z.string().trim().max(500, "Logo URL must be less than 500 characters").optional(),
  affiliate_link: z.string().trim().max(500, "Affiliate link must be less than 500 characters")
    .refine((url) => {
      if (!url) return true; // Optional field
      // Allow only http://, https://, or placeholder URLs
      return url.startsWith('http://') || url.startsWith('https://') || url.includes('{{');
    }, "Invalid URL format. Must use http:// or https://").optional(),
  video_url: z.string().trim().max(500, "Video URL must be less than 500 characters")
    .refine((url) => {
      if (!url) return true; // Optional field
      return url.startsWith('http://') || url.startsWith('https://');
    }, "Invalid URL format. Must use http:// or https://").optional(),
  video_title: z.string().trim().max(200, "Video title must be less than 200 characters").optional(),
  video_description: z.string().trim().max(1000, "Video description must be less than 1000 characters").optional(),
  display_order: z.number().int().min(0, "Display order must be positive").max(999, "Display order exceeds maximum"),
  brand_id: z.string().uuid().nullable().optional(),
  available_nctr_reward: z.number().min(0).max(1000000).finite().optional(),
  lock_90_nctr_reward: z.number().min(0).max(1000000).finite().optional(),
  lock_360_nctr_reward: z.number().min(0).max(1000000).finite().optional(),
  reward_distribution_type: z.string().optional(),
  is_active: z.boolean()
});

const OpportunityManagement = ({ onStatsUpdate }: OpportunityManagementProps) => {
  const { logActivity } = useAdmin();
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<EarningOpportunity | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    opportunity_type: 'shopping',
    nctr_reward: 0,
    reward_per_dollar: 100, // Default 100 NCTR per $1 spent
    partner_name: '',
    partner_logo_url: '',
    affiliate_link: '',
    video_url: '',
    video_title: '',
    video_description: '',
    is_active: true,
    display_order: 0,
    brand_id: null, // Link to brands table for tracking
    // New reward structure fields
    available_nctr_reward: 0,
    lock_90_nctr_reward: 0,
    lock_360_nctr_reward: 0,
    reward_distribution_type: 'legacy'
  });

  useEffect(() => {
    fetchOpportunities();
    fetchBrands();
  }, []);

  // Debug logging for brands loading
  useEffect(() => {
    console.log(`=== BRAND LOADING DEBUG ===`);
    console.log(`Total brands loaded: ${brands.length}`);
    
    if (brands.length > 0) {
      // Test search for Uber brands
      const uberBrands = brands.filter(b => b.name.toLowerCase().includes('uber'));
      console.log(`Uber brands found: ${uberBrands.length}`);
      console.log('Uber brand names:', uberBrands.map(b => b.name));
      
      // Log first few brands for verification
      console.log('First 5 brands:', brands.slice(0, 5).map(b => ({ name: b.name, id: b.id })));
    }
    console.log(`=== END DEBUG ===`);
  }, [brands]);

  const fetchOpportunities = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from('earning_opportunities')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOpportunities(data || []);
      console.log('📊 Opportunities refreshed:', data?.length || 0, 'items');
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load opportunities.",
        variant: "destructive",
      });
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands...');
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url, description, category, website_url, commission_rate, nctr_per_dollar, is_active, featured')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} brands successfully`);
      
      // Log some Uber brands for debugging
      const uberBrands = data?.filter(b => b.name.toLowerCase().includes('uber')) || [];
      console.log('Uber brands in fetched data:', uberBrands.map(b => ({ name: b.name, id: b.id })));
      
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]); // Ensure we set empty array on error
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opp.partner_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (opp.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || opp.opportunity_type === filterType;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    // Sort by display_order first, then by created_at as fallback
    if (a.display_order !== b.display_order) {
      return (a.display_order || 0) - (b.display_order || 0);
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const resetForm = () => {
    // Get next display order
    const maxOrder = Math.max(...opportunities.map(o => o.display_order || 0), 0);
    
    setFormData({
      title: '',
      description: '',
      opportunity_type: 'shopping',
      nctr_reward: 0,
      reward_per_dollar: 100,
      partner_name: '',
      partner_logo_url: '',
      affiliate_link: '',
      video_url: '',
      video_title: '',
      video_description: '',
      is_active: true,
      display_order: maxOrder + 1,
      brand_id: null,
      // New reward structure fields
      available_nctr_reward: 0,
      lock_90_nctr_reward: 0,
      lock_360_nctr_reward: 0,
      reward_distribution_type: 'legacy'
    });
    setEditingOpportunity(null);
    setSelectedBrand(null);
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleEdit = (opportunity: EarningOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description || '',
      opportunity_type: opportunity.opportunity_type,
      nctr_reward: opportunity.nctr_reward || 0,
      reward_per_dollar: opportunity.reward_per_dollar || 0,
      partner_name: opportunity.partner_name || '',
      partner_logo_url: opportunity.partner_logo_url || '',
      affiliate_link: opportunity.affiliate_link || '',
      video_url: opportunity.video_url || '',
      video_title: opportunity.video_title || '',
      video_description: opportunity.video_description || '',
      is_active: opportunity.is_active,
      display_order: opportunity.display_order || 0,
      brand_id: opportunity.brand_id || null,
      // New reward structure fields
      available_nctr_reward: opportunity.available_nctr_reward || 0,
      lock_90_nctr_reward: opportunity.lock_90_nctr_reward || 0,
      lock_360_nctr_reward: opportunity.lock_360_nctr_reward || 0,
      reward_distribution_type: opportunity.reward_distribution_type || 'legacy'
    });
    
    // Set logo preview for existing logo
    if (opportunity.partner_logo_url) {
      setLogoPreview(opportunity.partner_logo_url);
    }
    
    // Set selected brand if available
    if (opportunity.partner_name) {
      const brand = brands.find(b => b.name === opportunity.partner_name);
      setSelectedBrand(brand || null);
    }
    
    setModalOpen(true);
  };

  const fetchBrandDetails = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching brand details:', error);
      return null;
    }
  };

  const generateUserTrackingLink = (baseUrl: string, brandName: string, brandId?: string, loyalizeId?: string) => {
    if (!baseUrl) return '';
    
    // If this is a Loyalize brand (has loyalizeId), generate proper Loyalize tracking link
    if (loyalizeId && /^\d+$/.test(loyalizeId)) {
      // Generate Loyalize redirect URL matching the working NOBull format
      // Uses "store" parameter (not "store_id") and plain {{}} placeholders
      return `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${loyalizeId}&user={{USER_ID}}&tracking={{TRACKING_ID}}`;
    }
    
    // For non-Loyalize brands, create a parameterized link with user tracking
    const url = new URL(baseUrl);
    url.searchParams.set('ref', 'nctr_platform');
    url.searchParams.set('source', brandName.toLowerCase().replace(/\s+/g, '_'));
    url.searchParams.set('user_id', '{{USER_ID}}'); // Placeholder for actual user ID
    url.searchParams.set('tracking_id', '{{TRACKING_ID}}'); // Placeholder for tracking ID
    
    return url.toString();
  };

  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, SVG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      
      // Clear any existing URL
      setFormData(prev => ({ ...prev, partner_logo_url: '' }));
    }
  };

  const uploadLogoFile = async () => {
    if (!logoFile) return null;

    try {
      setUploadingLogo(true);
      
      // Create a unique filename
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `brand-logos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, logoFile);

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData(prev => ({ ...prev, partner_logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted! Starting handleSubmit...');
    console.log('📝 Form data keys:', Object.keys(formData));
    console.log('✏️ Editing opportunity ID:', editingOpportunity?.id);
    console.log('🖼️ Logo file present:', !!logoFile);
    console.log('🆕 Creating new:', !editingOpportunity);
    
    // Security: Validate all inputs before submission
    try {
      opportunitySchema.parse(formData);
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
      console.log('🔧 Starting processing...');
      let logoUrl = formData.partner_logo_url;
      
      // Upload logo file if selected
      if (logoFile) {
        console.log('📸 Uploading logo file...');
        const uploadedUrl = await uploadLogoFile();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          console.log('✅ Logo uploaded:', logoUrl);
        } else {
          console.log('❌ Logo upload failed - stopping submission');
          return;
        }
      } else {
        console.log('🔗 Using existing logo URL:', logoUrl);
      }

      const submitData = {
        ...formData,
        partner_logo_url: logoUrl
      };
      console.log('📦 Final submit data:', submitData);
      console.log('🎯 About to process database operation...');

      if (editingOpportunity) {
        console.log('🔄 Updating opportunity:', editingOpportunity.id);
        console.log('📦 Submit data:', JSON.stringify(submitData, null, 2));
        console.log('🔗 Brand ID being saved:', submitData.brand_id);
        
        try {
          console.log('🏁 About to update opportunity with brand_id:', submitData.brand_id);
          console.log('🏁 Full submit data:', JSON.stringify(submitData, null, 2));
          
          // Use the new admin function that bypasses the complex security check
          const { data, error } = await supabase.rpc('update_opportunity_admin', {
            opportunity_id: editingOpportunity.id,
            opportunity_data: submitData
          });

          console.log('💾 Admin RPC response:', { data, error });

          if (error) {
            console.error('❌ Update error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Database error: ${error.message || 'Unknown error'}`);
          }

          if (!data || data.length === 0) {
            console.error('❌ No data returned from RPC');
            throw new Error('Update failed - no data returned. Check admin permissions.');
          }

          console.log('✅ Update successful!');
          console.log('✅ Returned brand_id:', data[0]?.brand_id);
          
          // Verify the update by fetching the record
          const { data: verifyData, error: verifyError } = await supabase
            .from('earning_opportunities')
            .select('id, brand_id, partner_name')
            .eq('id', editingOpportunity.id)
            .single();
          
          console.log('🔍 Verification query result:', { verifyData, verifyError });
          console.log('✅ VERIFICATION - brand_id in database:', verifyData?.brand_id);
          console.log('✅ VERIFICATION - Expected brand_id:', submitData.brand_id);
          
        } catch (dbError: any) {
          console.error('💥 Database update failed:', dbError);
          console.error('💥 Full error:', JSON.stringify(dbError, null, 2));
          throw new Error(`Failed to update opportunity: ${dbError.message || 'Unknown error'}. Check console for details.`);
        }

        try {
          await logActivity('updated', 'opportunity', editingOpportunity.id, { 
            title: submitData.title,
            changes: submitData 
          });
          console.log('📊 Activity logged successfully');
        } catch (logError) {
          console.error('⚠️ Activity logging failed (non-critical):', logError);
          // Don't throw - logging failure shouldn't stop the update
        }

        toast({
          title: "Opportunity Updated",
          description: `${submitData.title} has been updated successfully.`,
        });
      } else {
        console.log('➕ Creating new opportunity...');
        
        let data;
        try {
          const result = await supabase
            .from('earning_opportunities')
            .insert(submitData)
            .select()
            .single();

          if (result.error) {
            console.error('❌ Create error:', result.error);
            throw result.error;
          }
          data = result.data;
          console.log('✅ Create successful:', data);
        } catch (dbError) {
          console.error('💥 Database create failed:', dbError);
          throw dbError;
        }

        try {
          await logActivity('created', 'opportunity', data.id, { 
            title: submitData.title 
          });
          console.log('📊 Activity logged successfully');
        } catch (logError) {
          console.error('⚠️ Activity logging failed (non-critical):', logError);
          // Don't throw - logging failure shouldn't stop the creation
        }

        toast({
          title: "Opportunity Created",
          description: `${submitData.title} has been created successfully.`,
        });
      }

      console.log('🔄 Refreshing opportunities list...');
      await fetchOpportunities(true); // Skip loading state management
      onStatsUpdate();
      setModalOpen(false);
      resetForm();
      console.log('✅ Form submission complete!');
    } catch (error) {
      console.error('💥 Error saving opportunity:', error);
      console.error('💥 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: `Failed to save opportunity: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finally block - setting loading to false');
      setLoading(false);
    }
  };

  const handleDelete = async (opportunity: EarningOpportunity) => {
    if (!confirm(`Are you sure you want to delete "${opportunity.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting opportunity:', opportunity.id);
      
      const { data, error } = await supabase.rpc('delete_opportunity_secure', {
        opportunity_id: opportunity.id
      });

      console.log('📊 Delete result:', { data, error });

      if (error) {
        console.error('❌ Delete failed:', error);
        throw error;
      }

      await logActivity('deleted', 'opportunity', opportunity.id, { 
        title: opportunity.title 
      });

      toast({
        title: "Opportunity Deleted",
        description: `${opportunity.title} has been deleted.`,
      });

      fetchOpportunities();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: `Failed to delete opportunity: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const toggleOpportunityStatus = async (opportunity: EarningOpportunity) => {
    try {
      console.log('🔄 Toggling opportunity status:', {
        id: opportunity.id,
        title: opportunity.title,
        currentStatus: opportunity.is_active,
        newStatus: !opportunity.is_active
      });

      const { data, error } = await supabase.rpc('toggle_opportunity_status_secure', {
        opportunity_id: opportunity.id
      });

      console.log('📊 Toggle result:', { data, error });

      if (error) {
        console.error('❌ Toggle failed:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned from toggle function');
        throw new Error('Failed to update opportunity status');
      }

      console.log('✅ Successfully toggled opportunity status');

      await logActivity(
        opportunity.is_active ? 'deactivated' : 'activated', 
        'opportunity', 
        opportunity.id, 
        { title: opportunity.title }
      );

      toast({
        title: `Opportunity ${opportunity.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${opportunity.title} has been ${opportunity.is_active ? 'deactivated' : 'activated'}.`,
      });

      fetchOpportunities();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling opportunity status:', error);
      toast({
        title: "Error",
        description: `Failed to update opportunity status: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const moveOpportunityUp = async (opportunity: EarningOpportunity) => {
    if (opportunity.display_order <= 1) return; // Already at top

    try {
      // Find the opportunity above this one
      const aboveOpportunity = opportunities.find(o => 
        o.display_order === (opportunity.display_order - 1)
      );

      if (!aboveOpportunity) return;

      // Swap display orders
      const { error: error1 } = await supabase
        .from('earning_opportunities')
        .update({ display_order: opportunity.display_order })
        .eq('id', aboveOpportunity.id);

      const { error: error2 } = await supabase
        .from('earning_opportunities')
        .update({ display_order: opportunity.display_order - 1 })
        .eq('id', opportunity.id);

      if (error1 || error2) throw error1 || error2;

      await logActivity('reordered', 'opportunity', opportunity.id, { 
        title: opportunity.title,
        action: 'moved_up',
        new_order: opportunity.display_order - 1
      });

      toast({
        title: "Order Updated",
        description: `${opportunity.title} moved up in display order.`,
      });

      fetchOpportunities();
    } catch (error) {
      console.error('Error moving opportunity up:', error);
      toast({
        title: "Error",
        description: "Failed to reorder opportunity.",
        variant: "destructive",
      });
    }
  };

  const moveOpportunityDown = async (opportunity: EarningOpportunity) => {
    const maxOrder = Math.max(...opportunities.map(o => o.display_order || 0));
    if (opportunity.display_order >= maxOrder) return; // Already at bottom

    try {
      // Find the opportunity below this one
      const belowOpportunity = opportunities.find(o => 
        o.display_order === (opportunity.display_order + 1)
      );

      if (!belowOpportunity) return;

      // Swap display orders
      const { error: error1 } = await supabase
        .from('earning_opportunities')
        .update({ display_order: opportunity.display_order })
        .eq('id', belowOpportunity.id);

      const { error: error2 } = await supabase
        .from('earning_opportunities')
        .update({ display_order: opportunity.display_order + 1 })
        .eq('id', opportunity.id);

      if (error1 || error2) throw error1 || error2;

      await logActivity('reordered', 'opportunity', opportunity.id, { 
        title: opportunity.title,
        action: 'moved_down',
        new_order: opportunity.display_order + 1
      });

      toast({
        title: "Order Updated",
        description: `${opportunity.title} moved down in display order.`,
      });

      fetchOpportunities();
    } catch (error) {
      console.error('Error moving opportunity down:', error);
      toast({
        title: "Error",
        description: "Failed to reorder opportunity.",
        variant: "destructive",
      });
    }
  };

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'invite': return Users;
      case 'shopping': return ShoppingBag;
      case 'partner': return Star;
      default: return Gift;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Start Guide */}
      <Card className="bg-section-highlight border border-section-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Gift className="w-5 h-5" />
            Create New Opportunities
          </CardTitle>
          <p className="text-muted-foreground">
            Start here to create earning opportunities for your users
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">Step 1:</span> Need brands? Use the "Find Brands" tab to search and add partners from Loyalize
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">Step 2:</span> Create opportunities below and select from your added brands
            </p>
            <div className="flex gap-2 text-sm pt-2">
              <Badge variant="outline" className="bg-white">✅ {opportunities.filter(o => o.is_active).length} Active Opportunities</Badge>
              <Badge variant="outline" className="bg-white">🏢 {brands.length} Brands Ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Your Opportunities</h3>
          <p className="text-muted-foreground">Manage your earning opportunities</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="free_trial">Free Trial</SelectItem>
              <SelectItem value="invite">Invite</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={modalOpen} onOpenChange={(open) => {
            console.log('🔔 Dialog onOpenChange called:', { open, loading, editingOpportunity: !!editingOpportunity });
            // Prevent closing dialog during form submission
            if (!loading) {
              if (open && !editingOpportunity) {
                console.log('🔄 Calling resetForm because dialog is opening for new opportunity');
                resetForm();
              }
              console.log('✅ Setting modalOpen to:', open);
              setModalOpen(open);
            } else {
              console.log('⚠️ Not opening dialog because loading is true');
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  console.log('🖱️ Create New Opportunity button clicked!');
                  console.log('📊 Current state:', { modalOpen, loading, editingOpportunity: !!editingOpportunity });
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Opportunity
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground">
                  {editingOpportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Fill out the form below to {editingOpportunity ? 'update' : 'create'} an earning opportunity.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Brand Selection - MOVED TO TOP */}
                <div className="bg-section-highlight p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Brand Partner Selection
                  </h4>
                  
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="manual">
                        Manual Entry
                      </TabsTrigger>
                      <TabsTrigger value="loyalize">
                        Loyalize Brands
                      </TabsTrigger>
                      <TabsTrigger value="impact">
                        Impact.com Network
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Create Custom Opportunity
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          For brands not in Loyalize or Impact.com (like Rad.Live), enter the details manually below:
                        </p>
                        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                          <li>First, create the brand in the "Brands" tab using "Manual Brand Creation"</li>
                          <li>Then select it from the "Link to Brand" dropdown below</li>
                          <li>Enter the affiliate/referral tracking link</li>
                          <li>Fill in the opportunity details and rewards</li>
                        </ol>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="loyalize" className="space-y-2 mt-4">
                      <Label className="text-sm font-medium">Search Added Brands & Gift Cards (Loyalize)</Label>
                      <BrandSearchInterface
                        onBrandSelect={(brand) => {
                          if (brand) {
                            setSelectedBrand(brand);
                            // Get brand details and generate tracking link
                            fetchBrandDetails(brand.id).then((brandDetails) => {
                              // Generate proper tracking link - use Loyalize redirect if it's a Loyalize brand
                              const trackingLink = generateUserTrackingLink(
                                brandDetails?.website_url || '', 
                                brand.name,
                                brand.id,
                                brandDetails?.loyalize_id // Pass loyalize_id to generate proper Loyalize tracking
                              );
                              
                              setFormData({
                                ...formData,
                                brand_id: brand.id, // CRITICAL: Link the brand_id
                                partner_name: brand.name,
                                partner_logo_url: brand.logo_url || '',
                                affiliate_link: trackingLink,
                                title: `Shop with ${brand.name}`,
                                description: brandDetails?.description || `Earn NCTR when you shop with ${brand.name}. Get rewarded for every purchase!`,
                                display_order: formData.display_order // Preserve existing display order
                              });
                            });
                          } else {
                            setSelectedBrand(null);
                          }
                        }}
                        selectedBrand={selectedBrand}
                        showFullDetails={true}
                        placeholder="🔍 Search your added brands and gift cards..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Search your added Loyalize brands and gift cards - when you select one, it will automatically populate the form below with tracking links
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="impact" className="space-y-2 mt-4">
                      <Label className="text-sm font-medium">Search Impact.com Network (US Brands)</Label>
                      <ImpactBrandSearch 
                        onOpportunitiesUpdated={async () => {
                          await fetchOpportunities(true);
                          onStatsUpdate();
                        }}
                        onBrandSelect={(brandData) => {
                          // Auto-populate form with Impact.com brand data
                          const nctrPerDollar = brandData.commissionRate * 20; // Convert commission % to NCTR per dollar
                          
                          setFormData({
                            ...formData,
                            partner_name: brandData.name,
                            partner_logo_url: brandData.logoUrl || '',
                            affiliate_link: brandData.affiliateLink,
                            title: `Shop with ${brandData.name}`,
                            description: brandData.description,
                            reward_per_dollar: nctrPerDollar,
                            opportunity_type: 'shopping'
                          });
                          
                          setLogoPreview(brandData.logoUrl || '');
                          
                          toast({
                            title: "Brand Loaded",
                            description: `${brandData.name} details populated in form`,
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Search Impact.com's US affiliate network - when you generate a tracking link, it will automatically populate the opportunity form below
                      </p>
                    </TabsContent>
                  </Tabs>

                  {/* Manual Brand Entry */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand_select">Link to Brand (Required for Shopping)</Label>
                        <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={brandPopoverOpen}
                              className="w-full justify-between"
                            >
                              {formData.brand_id
                                ? brands.find(b => b.id === formData.brand_id)?.name
                                : "Select a brand..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Type to search brands..." />
                              <CommandList className="max-h-[300px] overflow-y-auto">
                                <CommandEmpty>No brand found.</CommandEmpty>
                                <CommandGroup>
                                  {brands.map((brand) => (
                                    <CommandItem
                                      key={brand.id}
                                      value={brand.name}
                                      onSelect={() => {
                                        console.log('🔵 Brand selected:', brand.name);
                                        setFormData({
                                          ...formData,
                                          brand_id: brand.id,
                                          partner_name: brand.name,
                                          partner_logo_url: brand.logo_url || formData.partner_logo_url
                                        });
                                        setBrandPopoverOpen(false);
                                      }}
                                    >
                                      {brand.name}
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          formData.brand_id === brand.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          {formData.brand_id ? 
                            `✅ Brand linked: ${brands.find(b => b.id === formData.brand_id)?.name}` : 
                            '⚠️ Shopping opportunities need a brand link to appear in The Garden'
                          }
                        </p>
                        <p className="text-xs text-blue-600">
                          {brands.length} brands loaded. Current selection: {formData.brand_id || 'none'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="partner_name">Brand Display Name (Optional)</Label>
                        <Input
                          id="partner_name"
                          value={formData.partner_name}
                          onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                          placeholder="Auto-filled from brand selection"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to use brand name
                        </p>
                      </div>
                      
                      {/* Regenerate Link Button - Show in edit mode */}
                      {editingOpportunity && (
                        <div className="space-y-2">
                          <Label>Update Tracking Link</Label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                              console.log('🔄 Regenerating link for:', formData.partner_name);
                              
                              // Find brand by partner name
                              const { data: brandData, error } = await supabase
                                .from('brands')
                                .select('*')
                                .eq('name', formData.partner_name)
                                .single();
                              
                              console.log('📦 Brand lookup result:', { brandData, error });
                              
                              if (error || !brandData) {
                                toast({
                                  title: "Brand Not Found",
                                  description: `Could not find "${formData.partner_name}" in database.`,
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              console.log('🔍 Brand loyalize_id:', brandData.loyalize_id);
                              
                              if (brandData.loyalize_id) {
                                const newLink = generateUserTrackingLink(
                                  brandData.website_url || '', 
                                  brandData.name,
                                  brandData.id,
                                  brandData.loyalize_id
                                );
                                
                                console.log('✅ Generated new link:', newLink);
                                console.log('🔗 Old link:', formData.affiliate_link);
                                
                                setFormData({...formData, affiliate_link: newLink});
                                
                                toast({
                                  title: "Link Regenerated ✅",
                                  description: `Updated to Loyalize tracking link (Store ID: ${brandData.loyalize_id})`,
                                });
                              } else {
                                toast({
                                  title: "Not a Loyalize Brand",
                                  description: `"${brandData.name}" doesn't have a Loyalize ID for tracking`,
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="w-full"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate Loyalize Link
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Updates affiliate link to use proper Loyalize tracking
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Logo section - should be at same level */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Brand Logo</Label>
                        
                        {/* Logo Preview */}
                        {logoPreview && (
                          <div className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearLogo}
                              className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Upload Option */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileSelect}
                              className="hidden"
                              id="logo-upload"
                              disabled={uploadingLogo}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              disabled={uploadingLogo}
                              className="flex items-center gap-2"
                            >
                              {uploadingLogo ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                            </Button>
                            <span className="text-sm text-muted-foreground">or</span>
                          </div>
                          
                          {/* URL Option */}
                          <Input
                            type="url"
                            value={formData.partner_logo_url}
                            onChange={(e) => {
                              setFormData({...formData, partner_logo_url: e.target.value});
                              if (e.target.value) {
                                setLogoPreview(e.target.value);
                                setLogoFile(null);
                              }
                            }}
                            placeholder="https://example.com/logo.png"
                            disabled={!!logoFile}
                          />
                          <div className="text-xs text-muted-foreground">
                            💡 Max 5MB • Supports PNG, JPG, SVG formats
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      💡 Tip: Use "Find Brands" tab to search and add new brands from Loyalize, or upload/link brand logos directly
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Opportunity Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g., Nike Shopping Rewards"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="opportunity_type">Type *</Label>
                    <Select
                      value={formData.opportunity_type}
                      onValueChange={(value) => setFormData({...formData, opportunity_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shopping">Shopping Rewards</SelectItem>
                        <SelectItem value="free_trial">Free Trial</SelectItem>
                        <SelectItem value="invite">Invite Friends</SelectItem>
                        <SelectItem value="partner">Partner Bonus</SelectItem>
                        <SelectItem value="bonus">Special Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="1"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 1})}
                      placeholder="1"
                    />
                    <div className="text-xs text-muted-foreground">
                      Lower numbers appear first
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe what users need to do to earn NCTR..."
                    rows={3}
                  />
                </div>

                {/* Affiliate Link - Manual Override */}
                <div className="space-y-2">
                  <Label htmlFor="affiliate_link">Affiliate/Tracking Link</Label>
                  <Input
                    id="affiliate_link"
                    value={formData.affiliate_link}
                    onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    The tracking URL users will be redirected to. Can be manually updated here.
                  </p>
                </div>

                {/* NCTR Bounty Configuration */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border-2 border-primary/20 space-y-6">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-lg text-foreground">NCTR Bounty Configuration</h4>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">💡 How Bounties Work</h5>
                    <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                      <p><strong>One-time Bounty:</strong> Fixed NCTR reward when user completes the opportunity</p>
                      <p><strong>Per-Dollar Rewards:</strong> NCTR distributed <strong>using the same ratios</strong> as your bounty breakdown for each $1 spent</p>
                      <p><strong>Active Status:</strong> Immediately available • <strong>90LOCK:</strong> 90-day lock • <strong>360LOCK:</strong> 360-day premium lock</p>
                    </div>
                  </div>

                  {/* Bounty Distribution Type Selector */}
                  <div className="space-y-3">
                    <Label htmlFor="reward_distribution_type" className="text-base font-semibold">Distribution Strategy</Label>
                    <Select
                      value={formData.reward_distribution_type}
                      onValueChange={(value) => {
                        setFormData({...formData, reward_distribution_type: value});
                        // Reset reward fields when changing type
                        if (value === 'legacy') {
                          setFormData(prev => ({
                            ...prev,
                            available_nctr_reward: 0,
                            lock_90_nctr_reward: 0,
                            lock_360_nctr_reward: 0,
                            reward_distribution_type: value
                          }));
                        } else if (value !== 'combined') {
                          setFormData(prev => ({
                            ...prev,
                            nctr_reward: 0,
                            reward_distribution_type: value
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="legacy">🔄 Legacy Mode (Backward Compatible)</SelectItem>
                        <SelectItem value="available">🟢 Active Status Only</SelectItem>
                        <SelectItem value="lock_90">🟠 90LOCK Only</SelectItem>
                        <SelectItem value="lock_360">🔵 360LOCK Only</SelectItem>
                        <SelectItem value="combined">🎯 Multi-Tier Bounty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Per Dollar NCTR for Shopping */}
                  {formData.opportunity_type === 'shopping' && formData.reward_distribution_type !== 'legacy' && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                        <Label className="font-semibold text-amber-800 dark:text-amber-300">NCTR per $1 Spent (Shopping Rewards)</Label>
                      </div>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.reward_per_dollar}
                        onChange={(e) => setFormData({...formData, reward_per_dollar: parseInt(e.target.value) || 0})}
                        placeholder="100"
                        className="mb-2"
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        This amount will be distributed using the same ratios as your bounty breakdown for each dollar spent
                      </p>
                      
                      {/* Show distribution preview for shopping */}
                      {formData.reward_per_dollar > 0 && (formData.available_nctr_reward > 0 || formData.lock_90_nctr_reward > 0 || formData.lock_360_nctr_reward > 0) && (
                        <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/20 rounded border border-amber-300 dark:border-amber-700">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">Per $1 Distribution Preview:</p>
                          <div className="flex flex-wrap gap-1 text-xs">
                            {(() => {
                              const total = (formData.available_nctr_reward || 0) + (formData.lock_90_nctr_reward || 0) + (formData.lock_360_nctr_reward || 0);
                              if (total === 0) return null;
                              
                              const activePerDollar = Math.round((formData.available_nctr_reward || 0) / total * formData.reward_per_dollar);
                              const lock90PerDollar = Math.round((formData.lock_90_nctr_reward || 0) / total * formData.reward_per_dollar);
                              const lock360PerDollar = Math.round((formData.lock_360_nctr_reward || 0) / total * formData.reward_per_dollar);
                              
                              return (
                                <>
                                  {activePerDollar > 0 && (
                                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded">
                                      {activePerDollar} Active
                                    </span>
                                  )}
                                  {lock90PerDollar > 0 && (
                                    <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                      {lock90PerDollar} 90LOCK
                                    </span>
                                  )}
                                  {lock360PerDollar > 0 && (
                                    <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                      {lock360PerDollar} 360LOCK
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy Rewards (backward compatibility) */}
                  {formData.reward_distribution_type === 'legacy' && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Legacy Reward System</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reward_per_dollar">NCTR per Dollar Spent</Label>
                          <Input
                            id="reward_per_dollar"
                            type="number"
                            step="1"
                            min="0"
                            value={formData.reward_per_dollar}
                            onChange={(e) => setFormData({...formData, reward_per_dollar: parseInt(e.target.value) || 100})}
                            placeholder="100"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="nctr_reward">Sign-up Bonus NCTR</Label>
                          <Input
                            id="nctr_reward"
                            type="number"
                            step="1"
                            min="0"
                            value={formData.nctr_reward}
                            onChange={(e) => setFormData({...formData, nctr_reward: parseInt(e.target.value) || 0})}
                            placeholder="1000"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Status Only */}
                  {formData.reward_distribution_type === 'available' && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <h5 className="font-semibold text-green-800 dark:text-green-300">Active Status Bounty</h5>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="available_nctr_reward">One-Time Active Status Bounty</Label>
                        <Input
                          id="available_nctr_reward"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.available_nctr_reward}
                          onChange={(e) => setFormData({...formData, available_nctr_reward: parseInt(e.target.value) || 0})}
                          placeholder="500"
                        />
                        <p className="text-xs text-green-600 dark:text-green-400">Fixed reward when user completes the opportunity</p>
                      </div>
                    </div>
                  )}

                  {/* 90LOCK Only */}
                  {formData.reward_distribution_type === 'lock_90' && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                        <h5 className="font-semibold text-orange-800 dark:text-orange-300">90LOCK Bounty</h5>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lock_90_nctr_reward">One-Time 90LOCK Bounty</Label>
                        <Input
                          id="lock_90_nctr_reward"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.lock_90_nctr_reward}
                          onChange={(e) => setFormData({...formData, lock_90_nctr_reward: parseInt(e.target.value) || 0})}
                          placeholder="750"
                        />
                        <p className="text-xs text-orange-600 dark:text-orange-400">Fixed reward locked for 90 days, upgradeable to 360LOCK</p>
                      </div>
                    </div>
                  )}

                  {/* 360LOCK Only */}
                  {formData.reward_distribution_type === 'lock_360' && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h5 className="font-semibold text-blue-800 dark:text-blue-300">360LOCK Bounty</h5>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lock_360_nctr_reward">One-Time 360LOCK Bounty</Label>
                        <Input
                          id="lock_360_nctr_reward"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.lock_360_nctr_reward}
                          onChange={(e) => setFormData({...formData, lock_360_nctr_reward: parseInt(e.target.value) || 0})}
                          placeholder="1000"
                        />
                        <p className="text-xs text-blue-600 dark:text-blue-400">Premium fixed reward locked for 360 days</p>
                      </div>
                    </div>
                  )}

                  {/* Multi-Tier Bounty */}
                  {formData.reward_distribution_type === 'combined' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-50 via-orange-50 to-blue-50 dark:from-green-950/20 dark:via-orange-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-primary/30">
                        <h5 className="font-semibold mb-2 text-primary">🎯 Multi-Tier NCTR Bounty</h5>
                        <p className="text-sm text-muted-foreground">
                          Set one-time bounty amounts for each NCTR type. For shopping opportunities, per-dollar rewards will use these same ratios.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Active Status Bounty */}
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <Label className="font-medium text-green-800 dark:text-green-300">Active Status</Label>
                          </div>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={formData.available_nctr_reward}
                            onChange={(e) => setFormData({...formData, available_nctr_reward: parseInt(e.target.value) || 0})}
                            placeholder="200"
                            className="mb-2"
                          />
                          <p className="text-xs text-green-600 dark:text-green-400">Immediately usable</p>
                        </div>
                        
                        {/* 90LOCK Bounty */}
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <Label className="font-medium text-orange-800 dark:text-orange-300">90LOCK</Label>
                          </div>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={formData.lock_90_nctr_reward}
                            onChange={(e) => setFormData({...formData, lock_90_nctr_reward: parseInt(e.target.value) || 0})}
                            placeholder="300"
                            className="mb-2"
                          />
                          <p className="text-xs text-orange-600 dark:text-orange-400">90-day lock</p>
                        </div>
                        
                        {/* 360LOCK Bounty */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <Label className="font-medium text-blue-800 dark:text-blue-300">360LOCK</Label>
                          </div>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={formData.lock_360_nctr_reward}
                            onChange={(e) => setFormData({...formData, lock_360_nctr_reward: parseInt(e.target.value) || 0})}
                            placeholder="500"
                            className="mb-2"
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-400">360-day premium lock</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Total Bounty Display */}
                  {(formData.available_nctr_reward > 0 || formData.lock_90_nctr_reward > 0 || formData.lock_360_nctr_reward > 0 || formData.nctr_reward > 0 || formData.reward_per_dollar > 0) && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                      <h5 className="font-bold text-lg text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        Bounty Summary
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">One-Time Completion Bounty:</p>
                          <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                            {(formData.available_nctr_reward || 0) + (formData.lock_90_nctr_reward || 0) + (formData.lock_360_nctr_reward || 0) + (formData.nctr_reward || 0)} NCTR
                          </div>
                        </div>
                        {formData.reward_per_dollar > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                              {formData.opportunity_type === 'shopping' ? 'Per Dollar (Distributed by Ratios):' : 'Per Dollar:'}
                            </p>
                            <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                              {formData.reward_per_dollar} NCTR
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Breakdown */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(formData.available_nctr_reward || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {formData.available_nctr_reward} Active
                          </span>
                        )}
                        {(formData.lock_90_nctr_reward || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            {formData.lock_90_nctr_reward} 90LOCK
                          </span>
                        )}
                        {(formData.lock_360_nctr_reward || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {formData.lock_360_nctr_reward} 360LOCK
                          </span>
                        )}
                        {(formData.nctr_reward || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            {formData.nctr_reward} Legacy
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Section */}
                <div className="bg-section-highlight p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Brand Video (Optional)
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL</Label>
                      <Input
                        id="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                        placeholder="https://example.com/brand-video.mp4"
                      />
                      <div className="text-xs text-muted-foreground">
                        📹 Upload your video to a hosting service and paste the URL here
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="video_title">Video Title</Label>
                        <Input
                          id="video_title"
                          value={formData.video_title}
                          onChange={(e) => setFormData({...formData, video_title: e.target.value})}
                          placeholder="About Nike"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="video_description">Video Description</Label>
                        <Input
                          id="video_description"
                          value={formData.video_description}
                          onChange={(e) => setFormData({...formData, video_description: e.target.value})}
                          placeholder="Learn about Nike's innovation..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links & Activation */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="affiliate_link">
                      Affiliate Link {(() => {
                        const isOptional = formData.opportunity_type === 'bonus' || 
                                         formData.title.toLowerCase().includes('daily') || 
                                         formData.title.toLowerCase().includes('checkin');
                        return isOptional ? '(Optional)' : '*';
                      })()}
                    </Label>
                    <Input
                      id="affiliate_link"
                      type="url"
                      value={formData.affiliate_link}
                      onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                      placeholder="https://partner-tracking-url.com/?user_id={{USER_ID}}"
                      required={(() => {
                        const isOptional = formData.opportunity_type === 'bonus' || 
                                         formData.title.toLowerCase().includes('daily') || 
                                         formData.title.toLowerCase().includes('checkin');
                        return !isOptional;
                      })()}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const isOptional = formData.opportunity_type === 'bonus' || 
                                         formData.title.toLowerCase().includes('daily') || 
                                         formData.title.toLowerCase().includes('checkin');
                        return isOptional
                          ? '💡 Internal rewards like daily check-ins and bonus opportunities typically don\'t require external links.'
                          : '✅ Auto-populated from selected brand with user tracking. {USER_ID} and {TRACKING_ID} will be replaced dynamically.';
                      })()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium">
                      Activate opportunity immediately
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-section-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      if (!loading) {
                        setModalOpen(false);
                      }
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingOpportunity ? 'Update' : 'Create'} Opportunity
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card className="bg-white border border-section-border text-center py-12">
          <CardContent>
            <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              {searchTerm || filterType !== 'all' ? 'No opportunities match your filters.' : 'No opportunities created yet.'}
            </h3>
            <p className="text-muted-foreground mb-4">Start by creating your first earning opportunity!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity) => {
            const IconComponent = getOpportunityIcon(opportunity.opportunity_type);
            return (
              <Card key={opportunity.id} className="bg-white border border-section-border shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-section-highlight rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{opportunity.title}</h4>
                        <p className="text-sm text-muted-foreground">{opportunity.partner_name || 'No Partner'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      {/* Partner Logo */}
                      {opportunity.partner_logo_url && (
                        <BrandLogo 
                          src={opportunity.partner_logo_url} 
                          alt={opportunity.partner_name || 'Partner logo'}
                          size="lg"
                          variant="auto"
                          className="flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={opportunity.is_active ? "default" : "secondary"} className="text-xs">
                          {opportunity.is_active ? 'LIVE' : 'Inactive'}
                        </Badge>
                        
                        {/* Display Order Controls */}
                        <div className="flex items-center gap-1 bg-gray-50 rounded-md p-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground font-mono">#{opportunity.display_order}</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveOpportunityUp(opportunity)}
                              disabled={opportunity.display_order <= 1}
                              className="h-4 w-4 p-0 hover:bg-gray-100"
                              title="Move up in display order"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveOpportunityDown(opportunity)}
                              disabled={opportunity.display_order >= Math.max(...opportunities.map(o => o.display_order || 0))}
                              className="h-4 w-4 p-0 hover:bg-gray-100"
                              title="Move down in display order"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* Total NCTR Bounty Display */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-800 dark:text-purple-300">Total NCTR Bounty</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-purple-800 dark:text-purple-300">
                            {(() => {
                              const total = (opportunity.available_nctr_reward || 0) + 
                                          (opportunity.lock_90_nctr_reward || 0) + 
                                          (opportunity.lock_360_nctr_reward || 0) + 
                                          (opportunity.nctr_reward || 0);
                              return total > 0 ? `${total} NCTR` : 'No bounty set';
                            })()}
                          </div>
                          {opportunity.reward_per_dollar > 0 && opportunity.opportunity_type === 'shopping' && (
                            <div className="text-sm text-purple-600 dark:text-purple-400">
                              +{opportunity.reward_per_dollar} NCTR per $1
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Legacy Rewards Display */}
                    {(opportunity.nctr_reward > 0 || opportunity.reward_per_dollar > 0) && 
                     !(opportunity.available_nctr_reward > 0 || opportunity.lock_90_nctr_reward > 0 || opportunity.lock_360_nctr_reward > 0) && (
                      <>
                        {opportunity.nctr_reward > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Legacy Bounty:</span>
                            <span className="font-medium text-section-accent">{opportunity.nctr_reward} NCTR</span>
                          </div>
                        )}
                        {opportunity.reward_per_dollar > 0 && opportunity.opportunity_type === 'shopping' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Per Dollar:</span>
                            <span className="font-medium text-section-accent">{opportunity.reward_per_dollar} NCTR</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* New Reward Structure Display */}
                    {(opportunity.available_nctr_reward > 0 || opportunity.lock_90_nctr_reward > 0 || opportunity.lock_360_nctr_reward > 0) && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bounty Breakdown</div>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.available_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {opportunity.available_nctr_reward} Active
                            </span>
                          )}
                          {opportunity.lock_90_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              {opportunity.lock_90_nctr_reward} 90LOCK
                            </span>
                          )}
                          {opportunity.lock_360_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {opportunity.lock_360_nctr_reward} 360LOCK
                            </span>
                          )}
                        </div>
                        {opportunity.reward_per_dollar > 0 && opportunity.opportunity_type === 'shopping' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Per Dollar:</span>
                            <span className="font-medium text-section-accent">+{opportunity.reward_per_dollar} NCTR</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {opportunity.video_url && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Has Video:</span>
                        <Video className="w-4 h-4 text-section-accent" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(opportunity)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={opportunity.is_active ? "secondary" : "default"}
                      size="sm"
                      onClick={() => toggleOpportunityStatus(opportunity)}
                      className="flex-1 border-0"
                    >
                      {opportunity.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(opportunity)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OpportunityManagement;