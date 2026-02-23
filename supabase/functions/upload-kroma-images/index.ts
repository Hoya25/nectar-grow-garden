import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KROMA_IMAGES = [
  { name: "kroma-logo.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-logo.webp" },
  { name: "kroma-reset-kit.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-reset-kit.webp" },
  { name: "kroma-beauty-matcha.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-beauty-matcha.webp" },
  { name: "kroma-super-core.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-core.webp" },
  { name: "kroma-bone-broth.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-bone-broth.webp" },
  { name: "kroma-super-ramen.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-ramen.webp" },
  { name: "kroma-super-porridge.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-porridge.webp" },
  { name: "kroma-shipment.webp", url: "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-shipment.webp" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: { name: string; success: boolean; error?: string; url?: string }[] = [];

    for (const img of KROMA_IMAGES) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) {
          results.push({ name: img.name, success: false, error: `Fetch failed: ${response.status}` });
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const { error } = await supabase.storage
          .from("brand-images")
          .upload(`kroma/${img.name}`, uint8, {
            contentType: "image/webp",
            upsert: true,
          });

        if (error) {
          results.push({ name: img.name, success: false, error: error.message });
        } else {
          const { data: urlData } = supabase.storage
            .from("brand-images")
            .getPublicUrl(`kroma/${img.name}`);
          results.push({ name: img.name, success: true, url: urlData.publicUrl });
        }
      } catch (e) {
        results.push({ name: img.name, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
