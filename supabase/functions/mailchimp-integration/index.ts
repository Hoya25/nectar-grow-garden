import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Extract datacenter from API key (e.g., us1, us2, etc.)
const getDatacenter = (apiKey: string) => apiKey.split('-')[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface MailchimpContact {
  email: string;
  firstName?: string;
  lastName?: string;
  status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
  tags?: string[];
  mergeFields?: Record<string, any>;
}

interface MailchimpRequest {
  action: 'subscribe' | 'unsubscribe' | 'update' | 'send_confirmation';
  listId: string;
  contact: MailchimpContact;
  emailTemplate?: {
    templateId: number;
    subject: string;
    customData?: Record<string, any>;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!MAILCHIMP_API_KEY) {
      throw new Error('MAILCHIMP_API_KEY not configured');
    }

    const { action, listId, contact, emailTemplate }: MailchimpRequest = await req.json();
    const datacenter = getDatacenter(MAILCHIMP_API_KEY);
    const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`;

    console.log(`Processing Mailchimp ${action} for ${contact.email}`);

    switch (action) {
      case 'subscribe':
      case 'update': {
        // Add or update subscriber
        const subscriberData = {
          email_address: contact.email,
          status: contact.status || 'subscribed',
          merge_fields: {
            FNAME: contact.firstName || '',
            LNAME: contact.lastName || '',
            ...contact.mergeFields
          },
          tags: contact.tags || []
        };

        const response = await fetch(`${baseUrl}/lists/${listId}/members`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscriberData),
        });

        if (!response.ok) {
          // If user already exists, try to update instead
          if (response.status === 400) {
            const subscriberHash = await crypto.subtle.digest(
              'MD5',
              new TextEncoder().encode(contact.email.toLowerCase())
            );
            const hashHex = Array.from(new Uint8Array(subscriberHash))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            const updateResponse = await fetch(`${baseUrl}/lists/${listId}/members/${hashHex}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(subscriberData),
            });

            if (!updateResponse.ok) {
              throw new Error(`Failed to update subscriber: ${await updateResponse.text()}`);
            }

            const updateResult = await updateResponse.json();
            console.log('Updated subscriber:', updateResult.email_address);
            
            return new Response(JSON.stringify({ 
              success: true, 
              action: 'updated',
              subscriber: updateResult 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            throw new Error(`Failed to add subscriber: ${await response.text()}`);
          }
        }

        const result = await response.json();
        console.log('Added subscriber:', result.email_address);
        
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'subscribed',
          subscriber: result 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_confirmation': {
        if (!emailTemplate) {
          throw new Error('Email template required for send_confirmation action');
        }

        // Send custom branded confirmation email via Mailchimp campaign
        const campaignData = {
          type: 'regular',
          recipients: {
            list_id: listId,
            segment_opts: {
              conditions: [{
                condition_type: 'EmailAddress',
                field: 'EMAIL',
                op: 'is',
                value: contact.email
              }]
            }
          },
          settings: {
            subject_line: emailTemplate.subject,
            from_name: 'The Garden',
            reply_to: 'support@nctr.live',
            template_id: emailTemplate.templateId,
            ...emailTemplate.customData
          }
        };

        const campaignResponse = await fetch(`${baseUrl}/campaigns`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignData),
        });

        if (!campaignResponse.ok) {
          throw new Error(`Failed to create campaign: ${await campaignResponse.text()}`);
        }

        const campaign = await campaignResponse.json();
        
        // Send the campaign
        const sendResponse = await fetch(`${baseUrl}/campaigns/${campaign.id}/actions/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
          },
        });

        if (!sendResponse.ok) {
          throw new Error(`Failed to send campaign: ${await sendResponse.text()}`);
        }

        console.log('Sent branded confirmation email to:', contact.email);
        
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'confirmation_sent',
          campaignId: campaign.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unsubscribe': {
        const subscriberHash = await crypto.subtle.digest(
          'MD5',
          new TextEncoder().encode(contact.email.toLowerCase())
        );
        const hashHex = Array.from(new Uint8Array(subscriberHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const response = await fetch(`${baseUrl}/lists/${listId}/members/${hashHex}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'unsubscribed' }),
        });

        if (!response.ok) {
          throw new Error(`Failed to unsubscribe: ${await response.text()}`);
        }

        const result = await response.json();
        console.log('Unsubscribed:', result.email_address);
        
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'unsubscribed',
          subscriber: result 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('Error in Mailchimp integration:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);