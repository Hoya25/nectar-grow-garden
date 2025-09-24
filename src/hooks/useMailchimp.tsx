import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MailchimpContact {
  email: string;
  firstName?: string;
  lastName?: string;
  status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
  tags?: string[];
  mergeFields?: Record<string, any>;
}

interface MailchimpHookReturn {
  subscribeUser: (contact: MailchimpContact, listId?: string) => Promise<boolean>;
  sendWelcomeEmail: (contact: MailchimpContact, listId?: string, templateId?: number) => Promise<boolean>;
  updateContact: (contact: MailchimpContact, listId?: string) => Promise<boolean>;
  unsubscribeUser: (email: string, listId?: string) => Promise<boolean>;
}

export const useMailchimp = (): MailchimpHookReturn => {
  const { toast } = useToast();
  
  // Default list ID - you'll need to get this from your Mailchimp account
  const DEFAULT_LIST_ID = 'ac31586d64'; // Your actual Mailchimp Audience ID
  const DEFAULT_WELCOME_TEMPLATE_ID = 123; // Replace with your welcome template ID

  const callMailchimpFunction = useCallback(async (
    action: string,
    data: any
  ): Promise<any> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('mailchimp-integration', {
        body: data
      });

      if (error) {
        console.error('Mailchimp function error:', error);
        throw new Error(error.message || 'Failed to process Mailchimp request');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Mailchimp request failed');
      }

      return result;
    } catch (error: any) {
      console.error(`Mailchimp ${action} error:`, error);
      throw error;
    }
  }, []);

  const subscribeUser = useCallback(async (
    contact: MailchimpContact,
    listId: string = DEFAULT_LIST_ID
  ): Promise<boolean> => {
    try {
      const result = await callMailchimpFunction('subscribe', {
        action: 'subscribe',
        listId,
        contact: {
          ...contact,
          status: contact.status || 'subscribed',
          tags: [...(contact.tags || []), 'garden-member', 'web-signup']
        }
      });

      console.log('User subscribed to Mailchimp:', result);
      return true;
    } catch (error: any) {
      console.error('Failed to subscribe user to Mailchimp:', error);
      toast({
        title: "Newsletter Signup",
        description: "We couldn't add you to our newsletter, but your account was created successfully.",
        variant: "default",
      });
      return false;
    }
  }, [callMailchimpFunction, toast]);

  const sendWelcomeEmail = useCallback(async (
    contact: MailchimpContact,
    listId: string = DEFAULT_LIST_ID,
    templateId: number = DEFAULT_WELCOME_TEMPLATE_ID
  ): Promise<boolean> => {
    try {
      const result = await callMailchimpFunction('send_confirmation', {
        action: 'send_confirmation',
        listId,
        contact,
        emailTemplate: {
          templateId,
          subject: `Welcome to The Garden, ${contact.firstName || 'Member'}! 🌱`,
          customData: {
            from_name: 'The Garden Team',
            reply_to: 'support@nctr.live'
          }
        }
      });

      console.log('Welcome email sent via Mailchimp:', result);
      return true;
    } catch (error: any) {
      console.error('Failed to send welcome email via Mailchimp:', error);
      return false;
    }
  }, [callMailchimpFunction]);

  const updateContact = useCallback(async (
    contact: MailchimpContact,
    listId: string = DEFAULT_LIST_ID
  ): Promise<boolean> => {
    try {
      const result = await callMailchimpFunction('update', {
        action: 'update',
        listId,
        contact
      });

      console.log('Contact updated in Mailchimp:', result);
      return true;
    } catch (error: any) {
      console.error('Failed to update contact in Mailchimp:', error);
      return false;
    }
  }, [callMailchimpFunction]);

  const unsubscribeUser = useCallback(async (
    email: string,
    listId: string = DEFAULT_LIST_ID
  ): Promise<boolean> => {
    try {
      const result = await callMailchimpFunction('unsubscribe', {
        action: 'unsubscribe',
        listId,
        contact: { email }
      });

      console.log('User unsubscribed from Mailchimp:', result);
      return true;
    } catch (error: any) {
      console.error('Failed to unsubscribe user from Mailchimp:', error);
      return false;
    }
  }, [callMailchimpFunction]);

  return {
    subscribeUser,
    sendWelcomeEmail,
    updateContact,
    unsubscribeUser
  };
};