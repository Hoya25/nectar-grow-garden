import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const ReferralTestComponent = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testReferralFetch = async () => {
    setLoading(true);
    try {
      console.log('Testing referral fetch with new function...');
      
      // Test the new database function
      const { data, error } = await supabase.rpc('get_user_referrals_with_names', {
        p_user_id: null // Admin view - get all referrals
      });

      console.log('Test result:', { data, error });
      setTestResult({ data, error });
      
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({ error: err });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Referral Display Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={testReferralFetch} disabled={loading}>
          {loading ? 'Testing...' : 'Test Referral Data Fetch'}
        </Button>
        
        {testResult && (
          <div className="mt-4 p-4 bg-muted rounded">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralTestComponent;