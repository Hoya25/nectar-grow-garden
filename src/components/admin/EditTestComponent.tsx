import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TestTube, Save } from 'lucide-react';

const EditTestComponent = () => {
  const [loading, setLoading] = useState(false);
  const [testTitle, setTestTitle] = useState('');

  const testNoBullEdit = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing NOBull opportunity edit...');
      
      // First, get the NOBull opportunity
      const { data: opportunity, error: fetchError } = await supabase
        .from('earning_opportunities')
        .select('*')
        .ilike('partner_name', '%nobull%')
        .single();

      if (fetchError) {
        console.error('❌ Error fetching NOBull opportunity:', fetchError);
        throw fetchError;
      }

      console.log('✅ Found NOBull opportunity:', opportunity);

      // Test update with current timestamp
      const newTitle = testTitle || `${opportunity.title} - Updated ${new Date().toLocaleTimeString()}`;
      
      const { error: updateError } = await supabase
        .from('earning_opportunities')
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (updateError) {
        console.error('❌ Error updating NOBull opportunity:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully updated NOBull opportunity title');
      
      toast({
        title: "✅ Edit Test Successful!",
        description: `NOBull opportunity title updated successfully`,
      });

      // Verify the update worked
      const { data: updatedOpportunity, error: verifyError } = await supabase
        .from('earning_opportunities')
        .select('title, updated_at')
        .eq('id', opportunity.id)
        .single();

      if (verifyError) throw verifyError;

      console.log('✅ Verified update:', updatedOpportunity);
      
    } catch (error) {
      console.error('❌ Edit test failed:', error);
      
      toast({
        title: "❌ Edit Test Failed",
        description: error.message || 'Check console for details',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testAdminAccess = async () => {
    try {
      console.log('🔐 Testing admin access...');
      
      const { data, error } = await supabase.rpc('get_admin_financial_access_secure');
      
      if (error) throw error;
      
      console.log('Admin access result:', data);
      
      toast({
        title: data ? "✅ Admin Access Granted" : "❌ Admin Access Denied",
        description: `Admin security function returned: ${data}`,
        variant: data ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Admin access test error:', error);
      toast({
        title: "Admin Access Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Edit Functionality Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Test the edit functionality directly to diagnose the issue.
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Title (optional):</label>
          <Input
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Enter custom title or leave blank for auto-generated"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testNoBullEdit}
            disabled={loading}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Testing Edit...' : 'Test NOBull Edit'}
          </Button>
          
          <Button 
            onClick={testAdminAccess}
            variant="outline"
          >
            Test Admin Access
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <strong>What this tests:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Direct database update to NOBull opportunity</li>
            <li>Admin security function access</li>
            <li>Authentication status</li>
            <li>Console logging for debugging</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EditTestComponent;