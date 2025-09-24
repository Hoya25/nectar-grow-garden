import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const EmergencyActions = () => {
  const [revokeEmail, setRevokeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEmergencyRevoke = async () => {
    if (!revokeEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const { data, error } = await supabase.rpc('emergency_revoke_admin_access', {
        p_user_email: revokeEmail.trim()
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result?.success) {
        setResult(`Successfully revoked admin access for ${result.revoked_user}. Revoked ${result.revoked_count} access record(s).`);
        toast({
          title: "Access Revoked",
          description: `Admin access revoked for ${result.revoked_user}`,
        });
        setRevokeEmail('');
      } else {
        throw new Error(result?.error || 'Failed to revoke access');
      }
    } catch (err: any) {
      console.error('Emergency revoke error:', err);
      setResult(`Error: ${err.message}`);
      toast({
        title: "Revocation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Shield className="h-5 w-5" />
          Emergency Security Actions
        </CardTitle>
        <CardDescription>
          Critical security functions for compromised accounts. Use with extreme caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            <strong>Warning:</strong> These actions are irreversible and should only be used in emergency situations 
            where an admin account may be compromised.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revoke-email" className="font-semibold">
              Revoke Admin Access
            </Label>
            <div className="flex gap-2">
              <Input
                id="revoke-email"
                type="email"
                placeholder="admin@example.com"
                value={revokeEmail}
                onChange={(e) => setRevokeEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleEmergencyRevoke}
                disabled={loading || !revokeEmail.trim()}
                variant="destructive"
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Revoke Access
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Immediately removes all admin privileges from the specified user account.
            </p>
          </div>

          {result && (
            <Alert className={result.startsWith('Error') ? 'border-destructive' : 'border-green-500'}>
              <AlertDescription className={result.startsWith('Error') ? 'text-destructive' : 'text-green-700'}>
                {result}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-2">Security Protocol Checklist:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✓ All admin actions are logged with audit trails</li>
            <li>✓ Emergency revocation requires super admin privileges</li>
            <li>✓ All sensitive data access is monitored</li>
            <li>✓ Rate limiting protects against abuse</li>
            <li>✓ Session validation enforces recent activity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyActions;