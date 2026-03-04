import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Search, Save, ArrowLeft } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  is_active: boolean;
  featured: boolean;
  is_big_brand: boolean | null;
  is_promoted: boolean | null;
  display_priority: string;
}

const PRIORITY_OPTIONS = [
  { value: 'flagship', label: '🚀 Flagship', desc: 'Always prominent' },
  { value: 'featured', label: '⭐ Featured', desc: 'Featured sections' },
  { value: 'standard', label: '📦 Standard', desc: 'Category browsing' },
  { value: 'search_only', label: '🔍 Search Only', desc: 'Only via search' },
];

const AdminBrandPriority: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchBrands();
  }, [isAdmin]);

  const fetchBrands = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('brands')
      .select('id, name, logo_url, category, is_active, featured, is_big_brand, is_promoted, display_priority')
      .order('name');
    if (data) setBrands(data as Brand[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return brands.filter(b => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (filterPriority !== 'all') {
        const effective = pendingChanges[b.id] || b.display_priority;
        if (effective !== filterPriority) return false;
      }
      return true;
    });
  }, [brands, search, filterPriority, pendingChanges]);

  const handleChange = (brandId: string, priority: string) => {
    setPendingChanges(prev => ({ ...prev, [brandId]: priority }));
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      for (const [id, priority] of entries) {
        const { error } = await supabase
          .from('brands')
          .update({ display_priority: priority, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
      toast({ title: 'Saved', description: `Updated ${entries.length} brand(s).` });
      setPendingChanges({});
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSet = async (priority: string) => {
    const ids = filtered.map(b => b.id);
    if (ids.length === 0) return;
    const newChanges: Record<string, string> = {};
    ids.forEach(id => { newChanges[id] = priority; });
    setPendingChanges(prev => ({ ...prev, ...newChanges }));
    toast({ title: `Queued ${ids.length} brands`, description: `Set to "${priority}". Click Save to apply.` });
  };

  const stats = useMemo(() => {
    const counts: Record<string, number> = { flagship: 0, featured: 0, standard: 0, search_only: 0 };
    brands.forEach(b => {
      const p = pendingChanges[b.id] || b.display_priority;
      if (counts[p] !== undefined) counts[p]++;
    });
    return counts;
  }, [brands, pendingChanges]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Brand Display Priority</h1>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={handleSaveAll} disabled={saving} className="ml-auto">
            <Save className="h-4 w-4 mr-2" />
            Save {Object.keys(pendingChanges).length} Changes
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PRIORITY_OPTIONS.map(p => (
          <Card key={p.value} className="bg-card border-border cursor-pointer hover:border-primary/50" onClick={() => setFilterPriority(p.value)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats[p.value] || 0}</p>
              <p className="text-xs text-muted-foreground">{p.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map(p => (
            <Button key={p.value} variant="outline" size="sm" className="text-xs" onClick={() => handleBulkSet(p.value)}>
              Set all → {p.label.split(' ')[1]}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} brands shown</p>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Big Brand</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead>Display Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 200).map(b => {
              const current = pendingChanges[b.id] || b.display_priority;
              const changed = !!pendingChanges[b.id];
              return (
                <TableRow key={b.id} className={changed ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {b.logo_url && <img src={b.logo_url} alt="" className="w-6 h-6 rounded object-contain bg-white" />}
                    {b.name}
                    {changed && <Badge variant="secondary" className="text-[10px] ml-1">changed</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.category || '—'}</TableCell>
                  <TableCell className="text-center">{b.is_big_brand ? '🏢' : '—'}</TableCell>
                  <TableCell className="text-center">{b.is_active ? '✅' : '❌'}</TableCell>
                  <TableCell>
                    <Select value={current} onValueChange={v => handleChange(b.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {filtered.length > 200 && (
        <p className="text-xs text-muted-foreground text-center">Showing first 200. Use search to find specific brands.</p>
      )}
    </div>
  );
};

export default AdminBrandPriority;
