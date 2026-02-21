import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, Zap, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface TokenDefinition {
  token_id: string;
  display_name: string;
  color: string;
  glow_color: string | null;
  impact_engine: string | null;
  is_impact_token: boolean;
  sort_order: number;
  is_active: boolean;
}

interface TokenBounty {
  id?: string;
  brand_id: string;
  token_id: string;
  base_rate: number;
  is_active: boolean;
  is_shopper_selectable: boolean;
  is_admin_locked: boolean;
  amplifier_override: number | null;
}

interface OverlaySettings {
  nctr_overlay_enabled: boolean;
  nctr_overlay_rate: number;
  amplifier_enabled: boolean;
  amplifier_multiplier: number;
}

interface BrandTokenBountiesEditorProps {
  brandId: string;
  brandName: string;
  nctrRate: number; // the final NCTR rate per $1
  overlay: OverlaySettings;
  onOverlayChange: (overlay: OverlaySettings) => void;
  bounties: TokenBounty[];
  onBountiesChange: (bounties: TokenBounty[]) => void;
  calcSpend: number;
  onCalcSpendChange: (v: number) => void;
}

export default function BrandTokenBountiesEditor({
  brandId,
  brandName,
  nctrRate,
  overlay,
  onOverlayChange,
  bounties,
  onBountiesChange,
  calcSpend,
  onCalcSpendChange,
}: BrandTokenBountiesEditorProps) {
  const [tokenDefs, setTokenDefs] = useState<TokenDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);

  useEffect(() => {
    fetchTokenDefinitions();
  }, []);

  const fetchTokenDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from("token_definitions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      setTokenDefs((data as TokenDefinition[]) || []);
    } catch (e) {
      console.error("Error fetching token definitions:", e);
    } finally {
      setLoadingDefs(false);
    }
  };

  // Only show impact tokens (not NCTR) in the bounties section
  const impactTokens = useMemo(
    () => tokenDefs.filter((t) => t.is_impact_token),
    [tokenDefs]
  );

  const getBounty = (tokenId: string): TokenBounty => {
    return (
      bounties.find((b) => b.token_id === tokenId) || {
        brand_id: brandId,
        token_id: tokenId,
        base_rate: 1.0,
        is_active: false,
        is_shopper_selectable: true,
        is_admin_locked: false,
        amplifier_override: null,
      }
    );
  };

  const updateBounty = (tokenId: string, patch: Partial<TokenBounty>) => {
    const existing = bounties.find((b) => b.token_id === tokenId);
    if (existing) {
      onBountiesChange(
        bounties.map((b) => (b.token_id === tokenId ? { ...b, ...patch } : b))
      );
    } else {
      onBountiesChange([
        ...bounties,
        {
          brand_id: brandId,
          token_id: tokenId,
          base_rate: 1.0,
          is_active: false,
          is_shopper_selectable: true,
          is_admin_locked: false,
          amplifier_override: null,
          ...patch,
        },
      ]);
    }
  };

  // Live calculator
  const activeImpactBounties = bounties.filter(
    (b) => b.is_active && impactTokens.some((t) => t.token_id === b.token_id)
  );

  const calcResults = useMemo(() => {
    const results: { token_id: string; display_name: string; color: string; amount: number }[] = [];

    // NCTR base
    const nctrBase = nctrRate * calcSpend;

    // NCTR overlay
    const nctrOverlay = overlay.nctr_overlay_enabled ? overlay.nctr_overlay_rate * calcSpend : 0;

    // Amplifier on NCTR
    const ampMult = overlay.amplifier_enabled ? overlay.amplifier_multiplier : 1;

    results.push({
      token_id: "NCTR",
      display_name: "NCTR",
      color: "#E2FF6D",
      amount: (nctrBase + nctrOverlay) * ampMult,
    });

    // Impact tokens
    for (const bounty of activeImpactBounties) {
      const def = impactTokens.find((t) => t.token_id === bounty.token_id);
      if (!def) continue;
      const bAmp = bounty.amplifier_override ?? (overlay.amplifier_enabled ? overlay.amplifier_multiplier : 1);
      results.push({
        token_id: bounty.token_id,
        display_name: def.display_name,
        color: def.color,
        amount: bounty.base_rate * calcSpend * bAmp,
      });
    }

    return results;
  }, [nctrRate, calcSpend, overlay, activeImpactBounties, impactTokens]);

  if (loadingDefs) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Token Bounties ── */}
      <div className="space-y-3 p-4 border rounded-lg border-border bg-muted/30">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Token Bounties
        </h4>
        <p className="text-xs text-muted-foreground">
          Configure which Impact tokens this brand rewards alongside NCTR
        </p>

        <div className="space-y-2">
          {impactTokens.map((token) => {
            const bounty = getBounty(token.token_id);
            return (
              <div
                key={token.token_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
              >
                {/* Token badge */}
                <Badge
                  className="text-xs font-bold min-w-[100px] justify-center border-0"
                  style={{
                    backgroundColor: token.color + "22",
                    color: token.color,
                  }}
                >
                  {token.display_name}
                </Badge>

                {/* Active toggle */}
                <Switch
                  checked={bounty.is_active}
                  onCheckedChange={(checked) =>
                    updateBounty(token.token_id, { is_active: checked })
                  }
                />

                {/* Rate */}
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={bounty.base_rate}
                  onChange={(e) =>
                    updateBounty(token.token_id, {
                      base_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-20 h-8 text-sm"
                  disabled={!bounty.is_active}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">/$1</span>

                {/* Shopper selectable */}
                <div className="flex items-center gap-1" title="Shopper can select this token">
                  <input
                    type="checkbox"
                    checked={bounty.is_shopper_selectable}
                    onChange={(e) =>
                      updateBounty(token.token_id, {
                        is_shopper_selectable: e.target.checked,
                      })
                    }
                    disabled={!bounty.is_active}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  <span className="text-xs text-muted-foreground">Sel</span>
                </div>

                {/* Admin locked */}
                <button
                  onClick={() =>
                    updateBounty(token.token_id, {
                      is_admin_locked: !bounty.is_admin_locked,
                    })
                  }
                  className={`p-1 rounded ${
                    bounty.is_admin_locked
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={bounty.is_admin_locked ? "Locked by admin" : "Unlocked"}
                  disabled={!bounty.is_active}
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NCTR Overlay ── */}
      <div className="space-y-3 p-4 border rounded-lg border-border bg-muted/30">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          NCTR Overlay
        </h4>
        <p className="text-xs text-muted-foreground">
          Add bonus NCTR on top of any Impact token pool
        </p>

        <div className="flex items-center justify-between">
          <Label>Add NCTR on top of Impact pool?</Label>
          <Switch
            checked={overlay.nctr_overlay_enabled}
            onCheckedChange={(checked) =>
              onOverlayChange({ ...overlay, nctr_overlay_enabled: checked })
            }
          />
        </div>

        {overlay.nctr_overlay_enabled && (
          <div className="flex items-center gap-2 pl-4">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">
              NCTR overlay rate:
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={overlay.nctr_overlay_rate}
              onChange={(e) =>
                onOverlayChange({
                  ...overlay,
                  nctr_overlay_rate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">per $1</span>
          </div>
        )}
      </div>

      {/* ── Amplifier ── */}
      <div className="space-y-3 p-4 border rounded-lg border-border bg-muted/30">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          Amplifier
        </h4>
        <p className="text-xs text-muted-foreground">
          Reward 100% concentration into a single token
        </p>

        <div className="flex items-center justify-between">
          <Label>Enable amplifier?</Label>
          <Switch
            checked={overlay.amplifier_enabled}
            onCheckedChange={(checked) =>
              onOverlayChange({ ...overlay, amplifier_enabled: checked })
            }
          />
        </div>

        {overlay.amplifier_enabled && (
          <div className="flex items-center gap-2 pl-4">
            <Label className="text-sm text-muted-foreground">Multiplier:</Label>
            <Input
              type="number"
              step="0.05"
              min="1"
              value={overlay.amplifier_multiplier}
              onChange={(e) =>
                onOverlayChange({
                  ...overlay,
                  amplifier_multiplier: parseFloat(e.target.value) || 1.25,
                })
              }
              className="w-20 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">×</span>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Live Earn Calculator ── */}
      <div className="space-y-3 p-4 border rounded-lg border-primary/20 bg-card/80">
        <h4 className="font-medium text-foreground">Live Earn Calculator</h4>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Spend:</Label>
          <span className="text-sm font-medium">$</span>
          <Input
            type="number"
            step="10"
            min="1"
            value={calcSpend}
            onChange={(e) => onCalcSpendChange(parseFloat(e.target.value) || 50)}
            className="w-24 h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5 mt-2">
          {calcResults.map((r) => (
            <div
              key={r.token_id}
              className="flex items-center justify-between p-2 rounded border border-border bg-background"
            >
              <Badge
                className="text-xs font-bold border-0"
                style={{
                  backgroundColor: r.color + "22",
                  color: r.color,
                }}
              >
                {r.display_name}
              </Badge>
              <span className="font-bold text-foreground">
                {r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {calcResults.length === 1 && activeImpactBounties.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Enable Impact token bounties above to see multi-token rewards
          </p>
        )}
      </div>
    </div>
  );
}
