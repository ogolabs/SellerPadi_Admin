"use client";

import React from "react";
import { Gauge, Zap, TrendingUp, CreditCard, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/currency";

export interface MerchantQuotaData {
  plan: string;
  baseLimit: number;
  rolloverQuota: number;
  effectiveLimit: number;
  currentMonthOperations: number;
  monthReceiptsCount: number;
  monthShipmentsCount: number;
  overageCount: number;
  overageRate: number;
  accruedOverageCharge: number;
  billingCycle: string;
  isDomestic: boolean;
}

interface MerchantQuotaCardProps {
  quota: MerchantQuotaData;
  currency: string;
}

export function MerchantQuotaCard({ quota, currency }: MerchantQuotaCardProps) {
  const percentUsed =
    quota.effectiveLimit > 0
      ? Math.min(100, Math.round((quota.currentMonthOperations / quota.effectiveLimit) * 100))
      : 100;

  const isOverLimit = quota.overageCount > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              SaaS Quota &amp; Operational Capacity
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Current Billing Month (Receipts &amp; Dispatches)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {quota.plan.toUpperCase()} TIER
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
              isOverLimit
                ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
            }`}
          >
            {isOverLimit ? "Overage Active" : "Within Capacity"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Monthly Utilization</span>
          </span>
          <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
            {quota.currentMonthOperations.toLocaleString()} / {quota.effectiveLimit.toLocaleString()} ops ({percentUsed}%)
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/60">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverLimit
                ? "bg-rose-600 dark:bg-rose-500"
                : percentUsed > 85
                ? "bg-slate-600 dark:bg-slate-400"
                : "bg-blue-600 dark:bg-blue-500"
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/60">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Base Plan Allowance</span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
            {quota.baseLimit.toLocaleString()} ops/mo
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/60">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Rollover Balance</span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
            +{quota.rolloverQuota.toLocaleString()} ops
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/60">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-slate-400" />
            <span>Month Receipts / Dispatches</span>
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
            {quota.monthReceiptsCount} / {quota.monthShipmentsCount}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/60">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <span>Accrued Overage Fee</span>
          </span>
          <span
            className={`text-xs font-mono font-bold ${
              quota.accruedOverageCharge > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatMoney(quota.accruedOverageCharge, currency)}
            <span className="text-[10px] font-normal text-slate-500 ml-1">
              ({quota.isDomestic ? "₦1" : "$0.003"}/op)
            </span>
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Universal Overage Guarantee: Operations never halt unexpectedly.</span>
        </span>
        <span className="font-mono">Billing Cycle: Monthly</span>
      </div>
    </div>
  );
}

