import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Users, Ban } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface DuplicateIP {
  ip_address: string;
  account_count: number;
  user_ids: string[];
  emails: string[];
  created_dates: string[];
}

export const DuplicateIPDetector = () => {
  const [duplicates, setDuplicates] = useState<DuplicateIP[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDuplicateIPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('detect_duplicate_ips');
      
      if (error) throw error;
      
      const typedData = (data || []).map((item: any) => ({
        ip_address: String(item.ip_address),
        account_count: item.account_count,
        user_ids: item.user_ids,
        emails: item.emails,
        created_dates: item.created_dates
      }));
      
      setDuplicates(typedData);
    } catch (error) {
      console.error('Error fetching duplicate IPs:', error);
      toast.error('Failed to fetch duplicate IPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicateIPs();
  }, []);

  const handleSuspendAll = async (userIds: string[], ipAddress: string) => {
    if (!confirm(`Suspend all ${userIds.length} accounts from IP ${ipAddress}?`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const userId of userIds) {
        const { data, error } = await supabase.rpc('suspend_user_account', {
          p_user_id: userId,
          p_reason: `Duplicate IP address fraud: ${ipAddress}`
        });

        if (!error && data && typeof data === 'object' && 'success' in data && data.success) {
          successCount++;
        }
      }

      toast.success(`Suspended ${successCount}/${userIds.length} accounts`);
      fetchDuplicateIPs();
    } catch (error) {
      console.error('Error suspending accounts:', error);
      toast.error('Failed to suspend accounts');
    }
  };

  const handleRevokeAll = async (userIds: string[], ipAddress: string) => {
    if (!confirm(`Revoke NCTR from all ${userIds.length} accounts from IP ${ipAddress}?`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const userId of userIds) {
        const { data, error } = await supabase.rpc('revoke_fraudulent_nctr', {
          p_user_id: userId,
          p_reason: `Duplicate IP address fraud: ${ipAddress}`
        });

        if (!error && data && typeof data === 'object' && 'success' in data && data.success) {
          successCount++;
        }
      }

      toast.success(`Revoked NCTR from ${successCount}/${userIds.length} accounts`);
      fetchDuplicateIPs();
    } catch (error) {
      console.error('Error revoking NCTR:', error);
      toast.error('Failed to revoke NCTR');
    }
  };

  const getRiskLevel = (count: number) => {
    if (count >= 5) return 'critical';
    if (count >= 3) return 'high';
    return 'medium';
  };

  const getRiskBadge = (count: number) => {
    const level = getRiskLevel(count);
    if (level === 'critical') {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Critical ({count})
      </Badge>;
    } else if (level === 'high') {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1">
        <AlertTriangle className="w-3 h-3" />
        High Risk ({count})
      </Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
      <AlertTriangle className="w-3 h-3" />
      Medium ({count})
    </Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Duplicate IP Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Duplicate IP Detection
          </CardTitle>
          <Button onClick={fetchDuplicateIPs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {duplicates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No duplicate IP addresses detected</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Created Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicates.map((dup) => (
                  <TableRow key={dup.ip_address}>
                    <TableCell className="font-mono text-sm">
                      {dup.ip_address}
                    </TableCell>
                    <TableCell>
                      {getRiskBadge(dup.account_count)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {dup.emails.map((email, idx) => (
                          <div key={idx} className="text-xs">
                            {email}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {dup.created_dates.map((date, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            {new Date(date).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSuspendAll(dup.user_ids, dup.ip_address)}
                          variant="destructive"
                          size="sm"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Suspend All
                        </Button>
                        <Button
                          onClick={() => handleRevokeAll(dup.user_ids, dup.ip_address)}
                          variant="outline"
                          size="sm"
                        >
                          Revoke NCTR
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateIPDetector;