import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PRODUCTS = [
  { name: "5-Day Reset Kit", desc: "The flagship wellness reset. Earn INSPIRATION rewards when you complete all 5 days." },
  { name: "Beauty Matcha", desc: "Daily superfood ritual. Every purchase earns." },
  { name: "24K Bone Broth", desc: "Gut health, golden. Earn with every order." },
  { name: "Super Core (Colostrum)", desc: "First dairy-free colostrum. Subscribe and earn recurring rewards." },
  { name: "Superfood Snacks", desc: "Low-barrier entry into the Kroma ecosystem." },
];

const KromaWellness = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleShop = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("id, loyalize_id")
      .eq("name", "Kroma Wellness")
      .single();

    if (!brand?.loyalize_id) return;

    const trackingId = `${user.id}_${brand.id}_${Date.now()}`;

    await supabase.from("shopping_clicks" as any).insert({
      user_id: user.id,
      brand_id: brand.id,
      tracking_id: trackingId,
    });

    const { data: fnData } = await supabase.functions.invoke("loyalize-redirect", {
      body: { store: brand.loyalize_id, user: user.id, tracking: trackingId },
    });

    if (fnData?.url) {
      window.open(fnData.url, "_blank");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F5EDE3 0%, #FAFAF7 30%, #FFFFFF 100%)" }}>
      {/* Nav */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/garden")} className="text-[#8B7355] hover:text-[#C4946A] hover:bg-[#F5EDE3]">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to The Garden
        </Button>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Badge className="mb-6 px-4 py-1.5 text-sm font-semibold border-0" style={{ background: "#C4946A", color: "#FFFFFF" }}>
          ✦ INSPIRATION Flagship Partner
        </Badge>

        <div className="mx-auto mb-6 w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-2xl tracking-wider" style={{ background: "#C4946A", color: "#F5EDE3" }}>
          K
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#3D2E1F" }}>
          Kroma Wellness
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ color: "#8B7355" }}>
          Superfood nutrition that makes healthy taste amazing
        </p>

        <Button size="lg" onClick={handleShop} className="rounded-full px-8 text-base font-semibold border-0 shadow-lg hover:shadow-xl transition-shadow" style={{ background: "#C4946A", color: "#FFFFFF" }}>
          Shop Kroma <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </section>

      {/* About */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-2xl p-8 md:p-10" style={{ background: "#FFFFFF", border: "1px solid #E8DDD0" }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#3D2E1F" }}>About Kroma</h2>
          <p className="text-base leading-relaxed" style={{ color: "#6B5B4A" }}>
            Founded by Lisa Odenweller, Kroma Wellness was born from a simple belief: food is medicine, and healthy should taste amazing. From 5-Day Reset Kits to everyday superfood nutrition, Kroma is proving that what you put in your body can change everything.
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: "#3D2E1F" }}>Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="rounded-xl p-6 transition-shadow hover:shadow-md" style={{ background: "#FFFFFF", border: "1px solid #E8DDD0" }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "#F5EDE3" }}>
                <Sparkles className="h-5 w-5" style={{ color: "#C4946A" }} />
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: "#3D2E1F" }}>{p.name}</h3>
              <p className="text-sm mb-4" style={{ color: "#8B7355" }}>{p.desc}</p>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full" style={{ background: "#E8F5E2", color: "#2D6A2E" }}>
                Earns INSPIRATION
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-platform CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <a
          href="https://crescendo.nctr.live"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl p-6 md:p-8 text-center transition-shadow hover:shadow-lg"
          style={{ background: "#323232" }}
        >
          <p className="text-base md:text-lg font-semibold text-white mb-2">
            Earn INSPIRATION when you shop Kroma
          </p>
          <p className="text-sm font-medium" style={{ color: "#E2FF6D" }}>
            Unlock Kroma rewards on Crescendo →
          </p>
        </a>
      </section>

      {/* Bottom */}
      <section className="py-12" style={{ background: "#F5EDE3" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-base leading-relaxed mb-4" style={{ color: "#6B5B4A" }}>
            Kroma is the founding flagship partner of the INSPIRATION Impact Engine — a wellness participation economy where customers earn real rewards for living well.
          </p>
          <p className="text-sm font-medium" style={{ color: "#C4946A" }}>
            Powered by NCTR Alliance | Built by Butterfly Studios
          </p>
        </div>
      </section>
    </div>
  );
};

export default KromaWellness;
