import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getTierForAmount, getTierEmoji, getTierName } from "@/lib/crescendo-tiers";
import { ChevronDown, ShoppingBag } from "lucide-react";

interface PortfolioData {
  available_nctr: number;
  total_earned: number;
  lock_90_nctr: number;
  lock_360_nctr: number;
}

export const NCTREarningsBadge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch portfolio data
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("nctr_portfolio")
        .select("available_nctr, total_earned, lock_90_nctr, lock_360_nctr")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPortfolio(data);

      // Get earliest active lock unlock date for "days remaining"
      const { data: locks } = await supabase
        .from("nctr_locks")
        .select("unlock_date")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("unlock_date", { ascending: true })
        .limit(1);
      if (locks && locks.length > 0) {
        const days = Math.max(0, Math.ceil((new Date(locks[0].unlock_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        setDaysRemaining(days);
      }
    };
    fetch();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const available = portfolio?.available_nctr ?? 0;
  const totalEarned = portfolio?.total_earned ?? 0;
  const locked = (portfolio?.lock_90_nctr ?? 0) + (portfolio?.lock_360_nctr ?? 0);
  const totalNctr = available + locked;
  const tier = getTierForAmount(totalNctr);
  const tierEmoji = getTierEmoji(tier);
  const tierName = getTierName(tier);
  const isEmpty = totalNctr === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Badge button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
        style={{ background: "#E2FF6D", color: "#323232" }}
      >
        <span>{tierEmoji}</span>
        <span>{available.toLocaleString(undefined, { maximumFractionDigits: 2 })} NCTR</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-[100] overflow-hidden"
          style={{ background: "#323232", borderColor: "#5A5A58" }}
        >
          {isEmpty ? (
            <div className="p-5 text-center">
              <p className="text-white text-sm mb-1 font-medium">0 NCTR — Start shopping to earn!</p>
              <button
                onClick={() => { setOpen(false); navigate("/garden"); }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#E2FF6D", color: "#323232" }}
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Brands
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {/* Tier */}
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider" style={{ color: "#D9D9D9" }}>Current Tier</span>
                <span className="text-sm font-bold text-white">{tierEmoji} {tierName}</span>
              </div>

              <div className="h-px" style={{ background: "#5A5A58" }} />

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#D9D9D9" }}>Total NCTR Earned</span>
                  <span className="text-sm font-semibold text-white">{totalEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#D9D9D9" }}>Available</span>
                  <span className="text-sm font-semibold" style={{ color: "#E2FF6D" }}>{available.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#D9D9D9" }}>NCTR Locked</span>
                  <span className="text-sm font-semibold text-white">{locked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                {daysRemaining !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#D9D9D9" }}>Days Remaining on Lock</span>
                    <span className="text-sm font-semibold text-white">{daysRemaining} days</span>
                  </div>
                )}
              </div>

              {/* Crescendo link */}
              <a
                href="https://crescendo.nctr.live"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-center hover:underline"
                style={{ color: "#E2FF6D" }}
              >
                Higher status = more rewards in Crescendo →
              </a>

              <div className="h-px" style={{ background: "#5A5A58" }} />

              {/* CTA */}
              <button
                onClick={() => { setOpen(false); navigate("/garden?tab=dashboard"); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#E2FF6D", color: "#323232" }}
              >
                Manage My NCTR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NCTREarningsBadge;
