import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, ExternalLink, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShopifyOrder {
  id: string;
  order_number: string;
  total_price: number;
  currency: string;
  nctr_awarded: number;
  nctr_credited: boolean;
  order_status: string;
  created_at: string;
}

export const ShopifyMerchSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Get Shopify store URL from environment or use placeholder
  const shopifyStoreUrl = "https://your-store.myshopify.com"; // TODO: Replace with actual store URL

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("shopify_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading Shopify orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAffiliateLink = () => {
    if (!user) return shopifyStoreUrl;
    
    // Get username from profile for referral code
    const username = user.user_metadata?.username || user.id.substring(0, 8);
    return `${shopifyStoreUrl}?ref=${username}`;
  };

  const copyAffiliateLink = async () => {
    const link = getAffiliateLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link to earn 10% referral bonus on all purchases",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            NCTR Merch Store
          </CardTitle>
          <CardDescription>
            Sign in to shop merch and earn NCTR rewards on every purchase!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Shop CTA Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            NCTR Merch Store
          </CardTitle>
          <CardDescription>
            Shop official NCTR merchandise and earn 1 NCTR per dollar spent!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => window.open(getAffiliateLink(), "_blank")}
              className="flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Now
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              onClick={copyAffiliateLink}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Affiliate Link
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">💰 Earn NCTR Rewards:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Get 1 NCTR per $1 spent (auto-locked in 90LOCK)</li>
              <li>✓ Wings status multiplier applies to all rewards</li>
              <li>✓ Share your link and earn 10% bonus on referrals</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Order History */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Merch Orders</CardTitle>
            <CardDescription>
              Track your purchases and NCTR rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Order #{order.order_number}</p>
                      <Badge variant={order.nctr_credited ? "default" : "secondary"}>
                        {order.order_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">
                      {order.currency} ${order.total_price.toFixed(2)}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      +{order.nctr_awarded.toFixed(2)} NCTR
                      {order.nctr_credited && " ✓"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
