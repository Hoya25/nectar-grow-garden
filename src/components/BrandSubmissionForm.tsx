import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2 } from 'lucide-react';
import { z } from 'zod';

const brandSubmissionSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required").max(100, "Brand name must be less than 100 characters"),
  contactName: z.string().trim().min(1, "Contact name is required").max(100, "Contact name must be less than 100 characters"),
  contactEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  website: z.string().trim().min(1, "Website is required").max(500, "Website URL must be less than 500 characters")
    .refine((val) => {
      // Accept URLs with or without protocol
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
      return urlPattern.test(val);
    }, "Please enter a valid website URL"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
});

interface BrandSubmissionFormProps {
  children?: React.ReactNode;
}

export const BrandSubmissionForm = ({ children }: BrandSubmissionFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    contactName: '',
    contactEmail: '',
    website: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (fieldName: keyof typeof formData, value: string) => {
    try {
      const fieldSchema = brandSubmissionSchema.shape[fieldName];
      fieldSchema.parse(value);
      // Clear error if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    } catch (error) {
      // Keep the error if validation fails
    }
  };

  const handleFieldChange = (fieldName: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    validateField(fieldName, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form data
    try {
      brandSubmissionSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-brand-submission', {
        body: {
          brandName: formData.brandName,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          website: formData.website,
          description: formData.description,
        },
      });

      if (error) throw error;

      toast({
        title: "Submission Sent!",
        description: "Thank you for your interest in partnering with The Garden. We'll be in touch soon!",
      });

      // Reset form
      setFormData({
        brandName: '',
        contactName: '',
        contactEmail: '',
        website: '',
        description: '',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error submitting brand form:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your form. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="lg">
            <Building2 className="w-5 h-5 mr-2" />
            Partner With Us
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Partner With The Garden</DialogTitle>
          <p className="text-muted-foreground mt-2">
            Join our growing network of brands and unlock opportunities to engage with our loyal community.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name *</Label>
            <Input
              id="brandName"
              value={formData.brandName}
              onChange={(e) => handleFieldChange('brandName', e.target.value)}
              placeholder="Your brand name"
              maxLength={100}
            />
            {errors.brandName && (
              <p className="text-sm text-destructive">{errors.brandName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => handleFieldChange('contactName', e.target.value)}
                placeholder="Your name"
                maxLength={100}
              />
              {errors.contactName && (
                <p className="text-sm text-destructive">{errors.contactName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                placeholder="your@email.com"
                maxLength={255}
              />
              {errors.contactEmail && (
                <p className="text-sm text-destructive">{errors.contactEmail}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder="https://yourbrand.com"
              maxLength={500}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tell us about your brand *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="What does your brand do? Why would you like to partner with The Garden?"
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.description.length}/1000
            </p>
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Partnership Inquiry'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
