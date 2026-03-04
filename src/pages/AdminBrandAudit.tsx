import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle, Database, Image, Link, Star, Megaphone, DollarSign, Activity } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  category: string | null;
  commission_rate: number | null;
  nctr_per_dollar: number | null;
  website_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  featured: boolean;
  is_promoted: boolean | null;
  loyalize_id: string | null;
}

interface AppSetting {
  key: string;
  value: any;
  updated_at: string | null;
}

const AdminBrandAudit: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    const [brandsRes, settingsRes] = await Promise.all([
      supabase.from('brands').select('id, name, category, commission_rate, nctr_per_dollar, website_url, logo_url, is_active, featured, is_promoted, loyalize_id').order('name'),
      supabase.from('app_settings').select('key, value, updated_at').in('key', ['nctr_rate_multiplier', 'nctr_price', 'hybrid_rate_settings']),
    ]);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (settingsRes.data) setAppSettings(settingsRes.data);
    setLoading(false);
  };

  const getStatus = (b: Brand) => {
    const hasRate = b.nctr_per_dollar != null && b.nctr_per_dollar > 0;
    const hasUrl = !!b.website_url;
    return hasRate && hasUrl && b.is_active ? 'OK' : 'NEEDS FIX';
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = brands.filter(b => !q || b.name.toLowerCase().includes(q));
    return list.sort((a, b) => {
      const sa = getStatus(a) === 'NEEDS FIX' ? 0 : 1;
      const sb = getStatus(b) === 'NEEDS FIX' ? 0 : 1;
      return sa - sb || a.name.localeCompare(b.name);
    });
  }, [brands, search]);

  const stats = useMemo(() => {
    const total = brands.length;
    const active = brands.filter(b => b.is_active).length;
    const hasRate = brands.filter(b => b.nctr_per_dollar != null && b.nctr_per_dollar > 0).length;
    const noRate = total - hasRate;
    const hasCommission = brands.filter(b => b.commission_rate != null && b.commission_rate > 0).length;
    const hasUrl = brands.filter(b => !!b.website_url).length;
    const hasLogo = brands.filter(b => !!b.logo_url).length;
    const feat = brands.filter(b => b.featured).length;
    const promo = brands.filter(b => b.is_promoted).length;
    return { total, active, hasRate, noRate, hasCommission, hasUrl, hasLogo, feat, promo };
  }, [brands]);

  const problemBrands = useMemo(() => ({
    noRate: brands.filter(b => b.nctr_per_dollar == null || b.nctr_per_dollar === 0),
    noUrl: brands.filter(b => !b.website_url),
    noCommission: brands.filter(b => b.commission_rate == null || b.commission_rate === 0),
    activeNoLogo: brands.filter(b => b.is_active && !b.logo_url),
  }), [brands]);

  const rateSetting = appSettings.find(s => s.key === 'nctr_rate_multiplier' || s.key === 'hybrid_rate_settings');

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const StatCard = ({ label, value, icon: Icon, color = 'text-primary' }: { label: string; value: number | string; icon: any; color?: string }) => (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color} shrink-0`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brand Data Audit</h1>
        <Badge variant="outline" className="text-muted-foreground">{brands.length} brands loaded</Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Brands" value={stats.total} icon={Database} />
        <StatCard label="Active" value={stats.active} icon={Activity} color="text-green-500" />
        <StatCard label="NCTR Rate > 0" value={stats.hasRate} icon={DollarSign} color="text-green-500" />
        <StatCard label="NCTR Rate = 0/NULL" value={stats.noRate} icon={AlertTriangle} color="text-destructive" />
        <StatCard label="Commission > 0" value={stats.hasCommission} icon={DollarSign} />
        <StatCard label="Has Affiliate URL" value={stats.hasUrl} icon={Link} />
        <StatCard label="Has Logo" value={stats.hasLogo} icon={Image} />
        <StatCard label="Featured" value={stats.feat} icon={Star} color="text-yellow-500" />
        <StatCard label="Promoted" value={stats.promo} icon={Megaphone} color="text-blue-400" />
      </div>

      {/* App Settings */}
      {rateSetting && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rate Settings (app_settings)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Key:</span> {rateSetting.key}</p>
            <p><span className="text-muted-foreground">Value:</span> <code className="bg-muted px-2 py-0.5 rounded text-xs">{JSON.stringify(rateSetting.value)}</code></p>
            <p><span className="text-muted-foreground">Updated:</span> {rateSetting.updated_at ? new Date(rateSetting.updated_at).toLocaleString() : 'N/A'}</p>
          </CardContent>
        </Card>
      )}

      {/* Problem Brands */}
      <Card className="bg-card border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" /> Problem Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <p className="text-muted-foreground mb-1">NCTR rate = 0 or NULL ({problemBrands.noRate.length})</p>
            <div className="flex flex-wrap gap-1">{problemBrands.noRate.map(b => <Badge key={b.id} variant="destructive" className="text-xs">{b.name}</Badge>)}</div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">No affiliate URL ({problemBrands.noUrl.length})</p>
            <div className="flex flex-wrap gap-1">{problemBrands.noUrl.map(b => <Badge key={b.id} variant="outline" className="text-xs border-destructive/50">{b.name}</Badge>)}</div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Commission rate = 0 or NULL ({problemBrands.noCommission.length})</p>
            <div className="flex flex-wrap gap-1">{problemBrands.noCommission.map(b => <Badge key={b.id} variant="secondary" className="text-xs">{b.name}</Badge>)}</div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Active but no logo ({problemBrands.activeNoLogo.length})</p>
            <div className="flex flex-wrap gap-1">{problemBrands.activeNoLogo.map(b => <Badge key={b.id} variant="outline" className="text-xs">{b.name}</Badge>)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Search + Table */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Commission %</TableHead>
              <TableHead className="text-right">NCTR/$1</TableHead>
              <TableHead className="text-center">URL</TableHead>
              <TableHead className="text-center">Logo</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-center">Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(b => {
              const status = getStatus(b);
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    {status === 'OK' ? (
                      <Badge className="bg-green-900/40 text-green-400 border-green-700 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> FIX
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.category || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{b.commission_rate != null ? `${(b.commission_rate * 100).toFixed(1)}%` : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{b.nctr_per_dollar != null ? b.nctr_per_dollar.toFixed(4) : '—'}</TableCell>
                  <TableCell className="text-center">{b.website_url ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-center">{b.logo_url ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-center">{b.is_active ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-center">{b.featured ? '⭐' : '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminBrandAudit;
