"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Sliders,
} from "lucide-react";
import { getTierPricing, TierPricingInfo } from "@/lib/pricing-config";

interface PricingConfigResponse {
  yearlyDiscountPercent: number;
  tierPricing: Record<string, TierPricingInfo>;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export function PricingConfigCard() {
  const queryClient = useQueryClient();
  const [discountInput, setDiscountInput] = useState<number>(5);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewCurrency, setPreviewCurrency] = useState<"NGN" | "USD">("NGN");

  const { data, isLoading, isError, error, refetch } = useQuery<PricingConfigResponse>({
    queryKey: ["admin-pricing-config"],
    queryFn: async () => {
      const res = await fetch("/api/pricing-config");
      if (!res.ok) {
        throw new Error("Failed to load pricing configuration");
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data && typeof data.yearlyDiscountPercent === "number") {
      setDiscountInput(data.yearlyDiscountPercent);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (discountPercent: number) => {
      const res = await fetch("/api/pricing-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearlyDiscountPercent: discountPercent }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update pricing discount");
      }
      return res.json();
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["admin-pricing-config"], updatedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    },
  });

  // Preview tier pricing calculated in real-time as admin adjusts the slider
  const previewPricing = getTierPricing(discountInput);
  const hasChanges = data?.yearlyDiscountPercent !== discountInput;

  const presets = [
    { label: "0% (No Discount)", value: 0 },
    { label: "5% (Standard)", value: 5 },
    { label: "10%", value: 10 },
    { label: "15% (~2 Mo Free)", value: 15 },
    { label: "20%", value: 20 },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Annual Subscription Discount &amp; Pricing Controls
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Dynamic
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adjust the upfront annual incentive to increase 12-month negative working capital float.
            </p>
          </div>
        </div>

        {data?.updatedAt && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Last updated: {new Date(data.updatedAt).toLocaleDateString()} by {data.updatedBy || "admin"}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading pricing configuration...</span>
        </div>
      ) : isError ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center justify-between text-xs text-rose-700 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error instanceof Error ? error.message : "Failed to load pricing config."}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900 hover:bg-rose-200 text-rose-800 dark:text-rose-200 rounded font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls row: Slider, Input, and Presets */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Annual Discount Percentage</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={discountInput}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setDiscountInput(Math.max(0, Math.min(50, val)));
                        }
                      }}
                      className="w-16 px-2 py-1 text-center font-mono text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                  {presets.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDiscountInput(p.value)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        discountInput === p.value
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col justify-end pt-2 md:pt-0">
                <button
                  onClick={() => updateMutation.mutate(discountInput)}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98] cursor-pointer"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Apply &amp; Save Discount</span>
                    </>
                  )}
                </button>
                {hasChanges && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 text-center mt-1">
                    Unsaved changes ({discountInput}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Live Preview Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Live Preview: Recalculated Annual Tier Pricing Matrix</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Market View:</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewCurrency("NGN")}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                      previewCurrency === "NGN"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    ₦ NGN (Nigeria)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCurrency("USD")}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                      previewCurrency === "USD"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    $ USD (International)
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Plan Tier</th>
                    <th className="py-2.5 px-3">Monthly Rate</th>
                    <th className="py-2.5 px-3">Standard 12 Mo</th>
                    <th className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                      Annual ({discountInput}% Off)
                    </th>
                    <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      Customer Savings
                    </th>
                    <th className="py-2.5 px-3 text-right">Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {Object.entries(previewPricing)
                    .filter(([key]) => key !== "free")
                    .map(([key, tier]) => {
                      const isNgn = previewCurrency === "NGN";
                      const monthlyStr = isNgn ? `₦${tier.ngn.toLocaleString()}` : `$${tier.usd}`;
                      const standard12 = isNgn ? tier.ngn * 12 : Math.round(tier.usd * 12 * 100) / 100;
                      const standard12Str = isNgn ? `₦${standard12.toLocaleString()}` : `$${standard12}`;
                      const annualPrice = isNgn ? tier.ngnYearly : tier.usdYearly;
                      const annualPriceStr = isNgn ? `₦${annualPrice.toLocaleString()}` : `$${annualPrice}`;
                      const savings = isNgn
                        ? standard12 - tier.ngnYearly
                        : Math.round((standard12 - tier.usdYearly) * 100) / 100;
                      const savingsStr = isNgn ? `₦${savings.toLocaleString()}` : `$${savings}`;

                      return (
                        <tr
                          key={key}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                            {tier.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {monthlyStr}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 line-through">
                            {standard12Str}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                            {annualPriceStr}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {savingsStr}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                            {tier.annualQuota.toLocaleString()} ops/yr
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
