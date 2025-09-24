import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Building2, 
  Gift, 
  TrendingUp, 
  Activity, 
  Settings,
  ArrowLeft,
  Shield,
  Sparkles,
  Webhook
} from 'lucide-react';
import BrandManagement from '@/components/admin/BrandManagement';
import OpportunityManagement from '@/components/admin/OpportunityManagement';
import UserManagement from '@/components/admin/UserManagement';
import LoyalizeBrandSync from '@/components/admin/LoyalizeBrandSync';
import LoyalizeApiTester from '@/components/admin/LoyalizeApiTester';
import SiteSettingsManagement from '@/components/admin/SiteSettingsManagement';
import WebhookTester from '@/components/WebhookTester';
import BannerEditor from '@/components/admin/BannerEditor';
import ReferralManagement from '@/components/admin/ReferralManagement';

interface AdminStats {
  total_users: number;
  active_brands: number;
  active_opportunities: number;
  total_nctr_locked: number;
  recent_activity: number;
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, adminUser, loading } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    active_brands: 0,
    active_opportunities: 0,
    total_nctr_locked: 0,
    recent_activity: 0
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchAdminStats();
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchAdminStats = async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active brands count
      const { count: brandCount } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch active opportunities count
      const { count: opportunityCount } = await supabase
        .from('earning_opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total locked NCTR
      const { data: lockData } = await supabase
        .from('nctr_locks')
        .select('nctr_amount')
        .eq('status', 'active');

      const totalLocked = lockData?.reduce((sum, lock) => sum + parseFloat(lock.nctr_amount.toString()), 0) || 0;

      setStats({
        total_users: userCount || 0,
        active_brands: brandCount || 0,
        active_opportunities: opportunityCount || 0,
        total_nctr_locked: totalLocked,
        recent_activity: 0 // Would need to implement activity tracking
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have admin access. Contact an administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Admin Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/garden')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Garden
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {adminUser?.role}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {adminUser?.role?.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.total_users.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {stats.active_brands}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.active_opportunities}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NCTR Locked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {stats.total_nctr_locked.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {stats.recent_activity}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="opportunities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-section-highlight">
            <TabsTrigger value="opportunities" className="flex items-center gap-2 text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Gift className="w-4 h-4" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2 text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Users className="w-4 h-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="loyalize" className="flex items-center gap-2 text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Sparkles className="w-4 h-4" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2 text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <OpportunityManagement onStatsUpdate={fetchAdminStats} />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralManagement />
          </TabsContent>

          <TabsContent value="loyalize">
            <div className="space-y-6">
              <LoyalizeApiTester />
              
              <Card className="bg-section-highlight border border-section-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Find & Add Brands</CardTitle>
                  <p className="text-muted-foreground">Search the Loyalize database to find new brands for your platform</p>
                </CardHeader>
                <CardContent>
                  <LoyalizeBrandSync onBrandsUpdated={fetchAdminStats} />
                </CardContent>
              </Card>
              
              <Card className="bg-white border border-section-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Manage Your Brands</CardTitle>
                  <p className="text-muted-foreground">Edit and organize the brands you've added</p>
                </CardHeader>
                <CardContent>
                  <BrandManagement onStatsUpdate={fetchAdminStats} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card className="bg-section-highlight border border-section-border">
              <CardHeader>
                <CardTitle className="text-foreground">Purchase Webhooks</CardTitle>
                <p className="text-muted-foreground">Test the purchase webhook endpoint for token.nctr.live integration</p>
              </CardHeader>
              <CardContent>
                <WebhookTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <BannerEditor />
            <Card className="bg-section-highlight border border-section-border">
              <CardHeader>
                <CardTitle className="text-foreground">System Management</CardTitle>
                <p className="text-muted-foreground">Manage users and configure site settings</p>
              </CardHeader>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white border border-section-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4" />
                    User Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">View and manage user accounts</p>
                </CardHeader>
                <CardContent>
                  <UserManagement />
                </CardContent>
              </Card>
              
              <Card className="bg-white border border-section-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Settings className="w-4 h-4" />
                    Site Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Configure platform settings</p>
                </CardHeader>
                <CardContent>
                  <SiteSettingsManagement />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;