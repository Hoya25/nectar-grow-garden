import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMailchimp } from '@/hooks/useMailchimp';
import { Mail, Users, Settings, CheckCircle, ExternalLink } from 'lucide-react';

const MailchimpSetup = () => {
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { subscribeUser, sendWelcomeEmail } = useMailchimp();

  const handleTestIntegration = async () => {
    if (!testEmail || !testName) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and name for testing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const nameParts = testName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const success = await subscribeUser({
        email: testEmail,
        firstName,
        lastName,
        status: 'subscribed',
        tags: ['test-integration', 'admin-test']
      });

      if (success) {
        toast({
          title: "Test Successful!",
          description: "The test contact was added to your Mailchimp list.",
        });
        
        // Optional: Send welcome email
        await sendWelcomeEmail({
          email: testEmail,
          firstName,
          lastName
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Mailchimp integration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mailchimp Integration Setup
          </CardTitle>
          <CardDescription>
            Configure your Mailchimp integration for branded emails and marketing automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Your Mailchimp API key has been configured. Complete the setup below to start collecting contacts and sending branded emails.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Required Setup Steps
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <div>
                    <p className="font-medium">Get your Mailchimp List ID</p>
                    <p className="text-sm text-muted-foreground">
                      Go to your Mailchimp audience settings and copy the List ID
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href="https://admin.mailchimp.com/lists/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Mailchimp Lists
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <div>
                    <p className="font-medium">Create Email Templates</p>
                    <p className="text-sm text-muted-foreground">
                      Design branded welcome and confirmation email templates
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href="https://admin.mailchimp.com/templates/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Create Templates
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <div>
                    <p className="font-medium">Update Configuration</p>
                    <p className="text-sm text-muted-foreground">
                      Update the useMailchimp hook with your List ID and Template IDs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Integration</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="test-email">Test Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="test-name">Test Name</Label>
                  <Input
                    id="test-name"
                    placeholder="John Doe"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleTestIntegration} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Testing..." : "Test Integration"}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-3">Configuration Code</h3>
            <div className="bg-muted p-4 rounded-lg">
              <Textarea
                readOnly
                value={`// Update these values in src/hooks/useMailchimp.tsx:

const DEFAULT_LIST_ID = 'your-mailchimp-list-id'; // Replace with your actual list ID
const DEFAULT_WELCOME_TEMPLATE_ID = 123; // Replace with your welcome template ID

// Example list ID: a1b2c3d4e5
// Example template ID: 12345`}
                className="font-mono text-sm"
                rows={8}
              />
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens automatically:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                <li>New users are automatically added to your Mailchimp list when they sign up</li>
                <li>Branded welcome emails are sent using your templates</li>
                <li>User data is synced with custom merge fields (signup date, referral code, etc.)</li>
                <li>Proper tags are applied for segmentation (garden-member, new-signup, etc.)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default MailchimpSetup;