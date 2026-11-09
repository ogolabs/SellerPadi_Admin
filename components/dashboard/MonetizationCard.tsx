import React from "react";
import { CreditCard, TrendingUp, Zap, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MonetizationCardProps {
  mrr?: {
    totalUsd: number;
    formattedTotalUsd: string;
    domesticNgn: number;
    formattedDomesticNgn: string;
    internationalUsd: number;
    formattedInternationalUsd: string;
    activePaidSubscribers: number;
    conversionRatePercent: string;
    monthlySubscribers?: number;
    yearlySubscribers?: number;
  };
  arr?: {
    totalUsd: number;
    formattedTotalUsd: string;
    domesticNgn: number;
    formattedDomesticNgn: string;
    internationalUsd: number;
    formattedInternationalUsd: string;
    activePaidSubscribers: number;
  };
  overage?: {
    totalNgn: number;
    totalUsd: number;
    formattedNgn: string;
    formattedUsd: string;
  };
  isLoading?: boolean;
}

export function MonetizationCard({
  mrr,
  arr,
  overage,
  isLoading = false,
}: MonetizationCardProps) {
  const activePaid = mrr?.activePaidSubscribers || 0;
  const yearlyCount = mrr?.yearlySubscribers || 0;
  const monthlyCount = mrr?.monthlySubscribers || (activePaid - yearlyCount);
  const conversionRate = mrr?.conversionRatePercent || "0.0";

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Platform MRR &amp; Overage Accrual</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            SaaS subscription recurring revenue across Paystack (NGN) and Stripe (USD).
          </p>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-medium">
          {conversionRate}% Paid Conversion
        </span>
      </div>

      {/* Main MRR & ARR Highlight Header */}
      <div className="py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Monthly Run-Rate: </span>
            <span className="text-slate-900 dark:text-white font-bold font-mono text-xl sm:text-2xl ml-1">
              {isLoading ? "..." : mrr?.formattedTotalUsd || "$0.00"}
            </span>{" "}
            <span className="text-slate-500 text-xs">/ mo</span>
            {arr && (
              <span className="ml-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                (ARR: <strong className="text-slate-700 dark:text-slate-300">{isLoading ? "..." : arr.formattedTotalUsd}</strong>/yr)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {activePaid} paying ({monthlyCount} mo &bull; {yearlyCount} yr)
            </span>
          </span>
        </div>

        {/* 3-Column Monetization Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          {/* Domestic Paystack NGN */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono">
              <span>Domestic (NGN)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Paystack</span>
            </div>
            <div className="text-slate-900 dark:text-white font-bold font-mono text-sm mt-1 truncate">
              {isLoading ? "..." : mrr?.formattedDomesticNgn || "₦0.00"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Automated auto-debit</div>
          </div>

          {/* International Stripe USD */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono">
              <span>Global (USD)</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Stripe / FX</span>
            </div>
            <div className="text-slate-900 dark:text-white font-bold font-mono text-sm mt-1 truncate">
              {isLoading ? "..." : mrr?.formattedInternationalUsd || "$0.00"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">International cards</div>
          </div>

          {/* Universal Overage Guarantee */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono">
              <span>Universal Overage</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-0.5">
                <Zap className="w-3 h-3" />
                Live
              </span>
            </div>
            <div className="text-slate-900 dark:text-white font-bold font-mono text-sm mt-1 truncate">
              {isLoading ? "..." : overage?.formattedNgn || "₦0.00"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Excess receipts &amp; seats</div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Universal Overage Guarantee Active</span>
        </div>
        <span className="text-slate-500 font-mono text-[10px]">Flat ₦10/op &bull; $0.003/op</span>
      </div>
    </Card>
  );
}
