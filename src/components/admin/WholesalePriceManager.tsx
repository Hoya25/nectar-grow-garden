import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Save, RefreshCw } from 'lucide-react';

export const WholesalePriceManager: React.FC = () => {
  const [wholesalePrice, setWholesalePrice] = useState('0.04');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchWholesalePrice();
  }, []);

  const fetchWholesalePrice = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'wholesale_nctr_price')
        .single();

      if (error) throw error;

      if (data) {
        setWholesalePrice(String(data.setting_value));
      }
    } catch (error) {
      console.error('Error fetching wholesale price:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wholesale price",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(wholesalePrice);
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: price.toFixed(4),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'wholesale_nctr_price');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Wholesale NCTR price updated to $${price.toFixed(4)}`,
      });
    } catch (error) {
      console.error('Error updating wholesale price:', error);
      toast({
        title: "Error",
        description: "Failed to update wholesale price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-section-highlight border border-section-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <DollarSign className="w-5 h-5 text-primary" />
          Wholesale NCTR Price
        </CardTitle>
        <CardDescription>
          Set the wholesale price per NCTR token for 360LOCK purchases. This is the price users pay when buying NCTR through The Garden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Wholesale vs Market Price</p>
            <p>
              <strong>Market Price:</strong> Currently ${(0.07971).toFixed(4)} (live trading price on DEX)
              <br />
              <strong>Wholesale Price:</strong> ${parseFloat(wholesalePrice).toFixed(4)} (price for 360LOCK purchases)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wholesale-price">Wholesale Price (USD per NCTR)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="wholesale-price"
                type="number"
                step="0.0001"
                min="0.0001"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                className="pl-7"
                placeholder="0.04"
                disabled={fetching}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchWholesalePrice}
              disabled={fetching}
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: If set to $0.04, a user buying 1,000 NCTR will pay $40
          </p>
        </div>

        <Button
          onClick={handleUpdatePrice}
          disabled={loading || fetching}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Update Wholesale Price
            </>
          )}
        </Button>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This price affects all NCTR purchases made through the Buy NCTR system. 
            Users will pay this wholesale price, and the tokens will be automatically locked in 360LOCK.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
