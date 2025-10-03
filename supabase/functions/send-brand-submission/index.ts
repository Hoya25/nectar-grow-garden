import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrandSubmissionRequest {
  brandName: string;
  contactName: string;
  contactEmail: string;
  website: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      brandName, 
      contactName, 
      contactEmail, 
      website, 
      description 
    }: BrandSubmissionRequest = await req.json();

    // Validate required fields
    if (!brandName || !contactName || !contactEmail || !website || !description) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email to anderson@projectbutterfly.io
    const emailResponse = await resend.emails.send({
      from: "The Garden <onboarding@resend.dev>",
      to: ["anderson@projectbutterfly.io"],
      replyTo: contactEmail,
      subject: `New Brand Partnership Inquiry: ${brandName}`,
      html: `
        <h1>New Brand Partnership Submission</h1>
        
        <h2>Brand Information</h2>
        <p><strong>Brand Name:</strong> ${brandName}</p>
        <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
        
        <h2>Contact Information</h2>
        <p><strong>Name:</strong> ${contactName}</p>
        <p><strong>Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <h2>Description</h2>
        <p>${description.replace(/\n/g, '<br>')}</p>
        
        <hr style="margin: 20px 0; border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This submission was sent from The Garden partnership form at ${new Date().toLocaleString()}
        </p>
      `,
    });

    console.log("Brand submission email sent successfully:", emailResponse);

    // Send confirmation email to the submitter
    await resend.emails.send({
      from: "The Garden <onboarding@resend.dev>",
      to: [contactEmail],
      subject: "Thank you for your partnership inquiry!",
      html: `
        <h1>Thank you for your interest in partnering with The Garden!</h1>
        
        <p>Hi ${contactName},</p>
        
        <p>We've received your partnership inquiry for <strong>${brandName}</strong> and are excited to learn more about your brand.</p>
        
        <p>Our team will review your submission and get back to you within 2-3 business days.</p>
        
        <p>In the meantime, if you have any questions, feel free to reply to this email.</p>
        
        <p>Best regards,<br>The Garden Team</p>
        
        <hr style="margin: 20px 0; border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated confirmation email. Please do not reply directly to this message.
        </p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-brand-submission function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
