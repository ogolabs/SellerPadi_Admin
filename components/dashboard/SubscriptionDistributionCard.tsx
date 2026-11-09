import React from "react";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface PlanTierMetric {
  id: "free" | "starter_500" | "growth_1000" | "business_2500" | "scale_5000";
  name: string;
  merchantCount: number;
  percentage: number;
  monthlyOpsQuota: number;
  annualOpsQuota?: number;
  priceNgn: number;
  priceUsd: number;
  priceNgnYearly?: number;
  priceUsdYearly?: number;
  monthlyCount?: number;
  yearlyCount?: number;
}

interface SubscriptionDistributionCardProps {
  plans?: {
    breakdown: PlanTierMetric[];
    payingMerchants: number;
    freeMerchants: number;
  };
  totalMerchants?: number;
  isLoading?: boolean;
}

const TIER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  free: {
    bg: "bg-slate-800/60",
    text: "text-slate-300",
    bar: "bg-slate-600",
  },
  starter_500: {
    bg: "bg-blue-950/60",
    text: "text-blue-300",
    bar: "bg-blue-500",
  },
  growth_1000: {
    bg: "bg-emerald-950/60",
    text: "text-emerald-300",
    bar: "bg-emerald-500",
  },
  business_2500: {
    bg: "bg-indigo-950/60",
    text: "text-indigo-300",
    bar: "bg-indigo-500",
  },
  scale_5000: {
    bg: "bg-purple-950/60",
    text: "text-purple-300",
    bar: "bg-purple-500",
  },
};

export function SubscriptionDistributionCard({
  plans,
  totalMerchants = 0,
  isLoading = false,
}: SubscriptionDistributionCardProps) {
  const breakdown = plans?.breakdown || [];
  const payingCount = plans?.payingMerchants || 0;
  const freeCount = plans?.freeMerchants || 0;

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>SaaS Subscription Tier Distribution</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Store volume quotas across active merchant accounts.
          </p>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
          {totalMerchants} Total Stores
        </span>
      </div>

      {/* Segmented Tier Bar */}
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Tier Adoption Share</span>
          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
            {payingCount} Paid &bull; {freeCount} Free
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
          {breakdown.map((tier) => {
            if (tier.percentage <= 0) return null;
            const style = TIER_COLORS[tier.id] || TIER_COLORS.free;
            return (
              <div
                key={tier.id}
                className={`h-full rounded-xs transition-all ${style.bar}`}
                style={{ width: `${Math.max(3, tier.percentage)}%` }}
                title={`${tier.name}: ${tier.merchantCount} stores (${tier.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Tier List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {breakdown.map((tier) => {
            const style = TIER_COLORS[tier.id] || TIER_COLORS.free;
            return (
              <div
                key={tier.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.bar}`} />
                  <div className="min-w-0">
                    <span className="text-slate-900 dark:text-white font-medium block truncate text-[11px]">
                      {tier.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {tier.monthlyOpsQuota.toLocaleString()} ops/mo
                      {tier.annualOpsQuota ? ` · ${tier.annualOpsQuota.toLocaleString()}/yr` : ""}
                    </span>
                    {(tier.yearlyCount ?? 0) > 0 && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono block">
                        {tier.yearlyCount} yearly (5% off)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="text-slate-900 dark:text-white font-mono font-bold text-xs block">
                    {isLoading ? "..." : tier.merchantCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {tier.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Standard monthly limits with universal overage overflow</span>
        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">5 Tiers</span>
      </div>
    </Card>
  );
}
