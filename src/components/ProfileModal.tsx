import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Settings, ExternalLink, Camera, Upload } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
}

interface Portfolio {
  opportunity_status: string;
  available_nctr: number;
}

interface ProfileModalProps {
  children: React.ReactNode;
}

const ProfileModal = ({ children }: ProfileModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      fetchQuickProfileData();
    }
  }, [open, user]);

  const fetchQuickProfileData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, email, avatar_url, wallet_address')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Fetch portfolio status
      const { data: portfolioData } = await supabase
        .from('nctr_portfolio')
        .select('opportunity_status, available_nctr')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Check admin status
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      setProfile(profileData);
      setPortfolio(portfolioData);
      setIsAdmin(!!adminData);

      if (profileData) {
        setFormData({
          username: profileData.username || '',
          full_name: profileData.full_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      // Remove old avatar if exists
      if (profile?.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          email: user.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully",
      });

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      handleAvatarUpload(file);
    }
  };

  const handleQuickSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          username: formData.username || null,
          full_name: formData.full_name || null,
          email: user.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starter': return 'bg-gray-500';
      case 'advanced': return 'bg-blue-500';
      case 'premium': return 'bg-purple-500';
      case 'platinum': return 'bg-slate-400';
      case 'vip': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-foreground" />
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            View and edit your basic profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar & Status */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : 
                   profile?.username ? getInitials(profile.username) : 
                   user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Change profile picture"
              >
                {uploading ? (
                  <Upload className="h-6 w-6 text-foreground animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">
                {profile?.full_name || profile?.username || 'Anonymous User'}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getStatusColor(portfolio?.opportunity_status || 'starter')} text-foreground border-0 text-xs`}>
                  {portfolio?.opportunity_status?.toUpperCase() || 'STARTER'}
                </Badge>
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Edit Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-full-name">Full Name</Label>
              <Input
                id="modal-full-name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-username">Username</Label>
              <Input
                id="modal-username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="p-2 bg-muted/50 rounded-md text-sm text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleQuickSave} 
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Full Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;