import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

export const BulkEmailSender = () => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSendBulkEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both subject and message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-test-email', {
        body: {
          subject: subject.trim(),
          message: message.trim(),
          targetAudience: 'all'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Test email sent to ${data.recipient_count} users. Campaign ID: ${data.campaign_id}`,
        });
        
        // Clear form
        setSubject('');
        setMessage('');
      } else {
        throw new Error(data?.error || 'Failed to send bulk email');
      }
    } catch (error: any) {
      console.error('Failed to send bulk email:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Bulk Email Sender
        </CardTitle>
        <CardDescription>
          Send a test email to all registered users via Mailchimp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will send an email to ALL users in your database. Make sure your message is appropriate and well-tested.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email-subject">Email Subject</Label>
          <Input
            id="email-subject"
            placeholder="Enter email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-message">Email Message</Label>
          <Textarea
            id="email-message"
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            rows={6}
          />
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSendBulkEmail}
            disabled={loading || !subject.trim() || !message.trim()}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send to All Users
              </>
            )}
          </Button>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            The email will be sent through Mailchimp using your configured audience (ac31586d64).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};