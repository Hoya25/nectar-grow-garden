import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  subject: string;
  message: string;
  targetAudience?: 'all' | 'subscribed';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify admin access
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { subject, message, targetAudience = 'subscribed' }: BulkEmailRequest = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'Subject and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get all user profiles with emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name, user_id')
      .not('email', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user profiles' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${profiles?.length || 0} users with email addresses`);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: 'No users found with email addresses' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Create Mailchimp campaign for bulk send
    const mailchimpApiKey = Deno.env.get('MAILCHIMP_API_KEY');
    if (!mailchimpApiKey) {
      return new Response(JSON.stringify({ error: 'Mailchimp API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Extract datacenter from API key (last part after the dash)
    const datacenter = mailchimpApiKey.split('-')[1];
    if (!datacenter) {
      return new Response(JSON.stringify({ error: 'Invalid Mailchimp API key format' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const listId = 'ac31586d64'; // Your Mailchimp audience ID

    // Create campaign
    const campaignResponse = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailchimpApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'regular',
        recipients: {
          list_id: listId,
        },
        settings: {
          subject_line: subject,
          from_name: 'The Garden Team',
          reply_to: 'support@nctr.live',
          title: `Test Campaign - ${subject}`,
        },
      }),
    });

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text();
      console.error('Failed to create Mailchimp campaign:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create campaign', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const campaign = await campaignResponse.json();
    console.log('Created Mailchimp campaign:', campaign.id);

    // Set campaign content
    const contentResponse = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/campaigns/${campaign.id}/content`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mailchimpApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Test Email from The Garden</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #666; font-size: 14px;">
              This is a test email sent to all Garden members.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              You received this email because you're a member of The Garden community.
            </p>
          </div>
        `,
      }),
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Failed to set campaign content:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to set campaign content', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Send the campaign
    const sendResponse = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/campaigns/${campaign.id}/actions/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailchimpApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('Failed to send campaign:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send campaign', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Admin activity logging temporarily disabled to fix FK constraint issues
    console.log('Bulk email admin action:', {
      admin_id: user.id,
      campaign_id: campaign.id,
      recipient_count: profiles.length
    });

    console.log(`Bulk email sent successfully. Campaign ID: ${campaign.id}, Recipients: ${profiles.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Test email sent successfully to all users',
      campaign_id: campaign.id,
      recipient_count: profiles.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-bulk-test-email function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);