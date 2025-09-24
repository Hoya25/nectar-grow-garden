import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Users, Activity, RefreshCw } from 'lucide-react';

interface SecurityDashboardData {
  critical_events_today: number;
  high_risk_events_today: number;
  active_users_today: number;
  last_activity: string;
}

export const SecurityMonitor = () => {
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.rpc('get_security_dashboard_data');
      
      if (error) {
        throw error;
      }
      
      // Type-safe handling of RPC response
      const responseData = data as any;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }
      
      setDashboardData(responseData as SecurityDashboardData);
    } catch (err: any) {
      console.error('Security dashboard error:', err);
      setError(err.message || 'Failed to fetch security data');
      toast({
        title: "Security Monitor Error",
        description: "Failed to load security dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSecurityData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getRiskLevel = () => {
    if (!dashboardData) return 'unknown';
    
    const { critical_events_today, high_risk_events_today } = dashboardData;
    
    if (critical_events_today > 0) return 'critical';
    if (high_risk_events_today > 5) return 'high';
    if (high_risk_events_today > 0) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
          <CardDescription>Loading security dashboard...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchSecurityData} 
            className="mt-4" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Monitor
          <Badge variant={getRiskColor(riskLevel)}>
            {riskLevel.toUpperCase()} RISK
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time security monitoring and threat detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dashboardData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {dashboardData.critical_events_today}
                </div>
                <div className="text-sm text-muted-foreground">Critical Events</div>
              </div>
              <div className="text-center p-3 bg-orange-100 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.high_risk_events_today}
                </div>
                <div className="text-sm text-muted-foreground">High Risk Events</div>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData.active_users_today}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-3 bg-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  <Activity className="h-6 w-6 mx-auto" />
                </div>
                <div className="text-sm text-muted-foreground">System Health</div>
              </div>
            </div>

            {dashboardData.last_activity && (
              <div className="text-sm text-muted-foreground">
                Last activity: {new Date(dashboardData.last_activity).toLocaleString()}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Auto-refresh: 5 minutes
              </div>
              <Button 
                onClick={fetchSecurityData} 
                size="sm" 
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Now
              </Button>
            </div>

            {(dashboardData.critical_events_today > 0 || dashboardData.high_risk_events_today > 5) && (
              <Alert className="border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High security risk detected. Review security logs immediately.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityMonitor;