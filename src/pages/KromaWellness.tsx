import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";

const KROMA_LOGO =
  "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-logo.webp";

const PRODUCTS = [
  {
    name: "5-Day Reset Kit",
    tagline: "The flagship wellness reset",
    price: "$385–$525",
    tag: "Earns INSPIRATION + completion bonus",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-reset-kit.webp",
    link: "https://kromawellness.com/products/kroma-new-deluxe-5-day-lifestyle-reset",
  },
  {
    name: "Beauty Matcha Latte",
    tagline: "The world's best matcha latte. Period.",
    tag: "Earns INSPIRATION",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-beauty-matcha.webp",
    link: "https://kromawellness.com/products/beauty-matcha-latte",
  },
  {
    name: "Super Core Colostrum",
    tagline: "The first-ever dairy-free colostrum",
    tag: "Earns INSPIRATION",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-core.webp",
    link: "https://kromawellness.com/products/super-core-jar",
  },
  {
    name: "24K Chicken Bone Broth",
    tagline: "Not just broth — liquid gold",
    tag: "Earns INSPIRATION",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-bone-broth.webp",
    link: "https://kromawellness.com/products/24k-chicken-bone-broth",
  },
  {
    name: "Super Ramen",
    tagline: "The world's first gluten-free bone broth ramen",
    tag: "Earns INSPIRATION",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-ramen.webp",
  },
  {
    name: "Super Porridge",
    tagline: "Superfood breakfast in minutes",
    tag: "Earns INSPIRATION",
    image:
      "https://yhwcaodofmbusjurawhp.supabase.co/storage/v1/object/public/reward-images/kroma/kroma-super-porridge.webp",
  },
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

    const { data: fnData } = await supabase.functions.invoke(
      "loyalize-redirect",
      {
        body: {
          store: brand.loyalize_id,
          user: user.id,
          tracking: trackingId,
        },
      }
    );

    if (fnData?.url) {
      window.open(fnData.url, "_blank");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #F5EDE3 0%, #FAFAF7 30%, #FFFFFF 100%)",
      }}
    >
      <SEOHead
        title="Kroma Wellness | INSPIRATION Flagship Partner — The Garden"
        description="Shop Kroma Wellness superfood nutrition and earn INSPIRATION rewards. From the 5-Day Reset Kit to Beauty Matcha — every purchase earns."
        canonicalPath="/brands/kroma-wellness"
      />

      {/* Nav */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/garden")}
          className="text-[#8B7355] hover:text-[#C4946A] hover:bg-[#F5EDE3]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to The Garden
        </Button>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-16 text-center">
        <Badge
          className="mb-6 px-4 py-1.5 text-sm font-semibold border-0"
          style={{ background: "#C4946A", color: "#FFFFFF" }}
        >
          🌿 INSPIRATION Partner
        </Badge>

        <img
          src={KROMA_LOGO}
          alt="Kroma Wellness"
          className="mx-auto mb-6 h-20 w-20 rounded-2xl object-contain bg-white p-2 shadow-sm"
        />

        <h1
          className="text-4xl md:text-5xl font-bold mb-3"
          style={{ color: "#3D2E1F" }}
        >
          Kroma Wellness
        </h1>
        <p
          className="text-lg md:text-xl italic mb-4"
          style={{ color: "#8B7355" }}
        >
          "Food is medicine"
        </p>
        <p
          className="text-base max-w-2xl mx-auto mb-8 leading-relaxed"
          style={{ color: "#6B5B4A" }}
        >
          Founded by Lisa Odenweller, Kroma makes superfood nutrition that
          actually tastes good. Every purchase through The Garden earns
          INSPIRATION rewards.
        </p>

        <Button
          size="lg"
          onClick={handleShop}
          className="rounded-full px-8 text-base font-semibold border-0 shadow-lg hover:shadow-xl transition-shadow"
          style={{ background: "#C4946A", color: "#FFFFFF" }}
        >
          Shop Kroma <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </section>

      {/* Product Grid */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2
          className="text-2xl font-bold mb-8 text-center"
          style={{ color: "#3D2E1F" }}
        >
          Featured Products
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl overflow-hidden transition-shadow hover:shadow-lg group"
              style={{ background: "#FFFFFF", border: "1px solid #E8DDD0" }}
            >
              {/* Image */}
              <div className="w-full h-48 bg-[#F5EDE3] flex items-center justify-center overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-5">
                <h3
                  className="font-semibold text-base mb-1"
                  style={{ color: "#3D2E1F" }}
                >
                  {p.name}
                </h3>
                <p className="text-sm mb-3" style={{ color: "#8B7355" }}>
                  {p.tagline}
                </p>
                {p.price && (
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "#3D2E1F" }}
                  >
                    {p.price}
                  </p>
                )}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: "#E8F5E2", color: "#2D6A2E" }}
                >
                  <Sparkles className="w-3 h-3" />
                  {p.tag}
                </span>

                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-[#E8DDD0] hover:bg-[#F5EDE3]"
                      style={{ color: "#8B7355" }}
                    >
                      View Product <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Crescendo Cross-link */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div
          className="rounded-2xl p-8 md:p-10 text-center"
          style={{ background: "#323232" }}
        >
          <p className="text-lg md:text-xl font-semibold text-white mb-3">
            Earning INSPIRATION? Unlock Kroma products as rewards on Crescendo
          </p>
          <a
            href="https://crescendo.nctr.live/rewards"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              className="rounded-full px-8 font-semibold border-0 shadow-md hover:shadow-lg transition-shadow"
              style={{ background: "#E2FF6D", color: "#323232" }}
            >
              View Kroma Rewards on Crescendo →
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <section className="py-12" style={{ background: "#F5EDE3" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#6B5B4A" }}
          >
            Kroma is the founding flagship partner of the INSPIRATION Impact
            Engine — a wellness participation economy where customers earn real
            rewards for living well.
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
