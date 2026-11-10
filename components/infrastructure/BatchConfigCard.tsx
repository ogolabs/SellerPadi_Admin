"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  ExternalLink,
  Zap,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";

interface BatchConfigResponse {
  maxWaitMinutes: number;
  minBatchSize: number;
  maxBatchSize: number;
  estimatedBatchCost?: {
    gasUnits: number;
    costNative: string;
    costUsd: string;
    avaxPriceUsd: number;
  };
  lastTxActual?: {
    txHash: string;
    batchType: string;
    recordCount: number;
    gasUsed: number;
    effectiveGasPriceGwei: string;
    feeNative: string;
    feeUsd: string;
    mainnetEquivalentUsd?: string;
    mainnetEquivalentNative?: string;
    anchoredAt: string | null;
    explorerUrl: string;
  } | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export function BatchConfigCard() {
  const queryClient = useQueryClient();
  const [maxWaitInput, setMaxWaitInput] = useState<number>(30);
  const [maxBatchInput, setMaxBatchInput] = useState<number>(100);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<BatchConfigResponse>({
    queryKey: ["admin-batch-config"],
    queryFn: async () => {
      const res = await fetch("/api/infrastructure/batch-config");
      if (!res.ok) {
        throw new Error("Failed to load batch configuration");
      }
      return res.json();
    },
    staleTime: QUERY_TIMINGS.CONFIG_STALE_MS,
  });

  useEffect(() => {
    if (data) {
      if (typeof data.maxWaitMinutes === "number") setMaxWaitInput(data.maxWaitMinutes);
      if (typeof data.maxBatchSize === "number") setMaxBatchInput(data.maxBatchSize);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { maxWaitMinutes: number; maxBatchSize: number }) => {
      const res = await fetch("/api/infrastructure/batch-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update batch configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["admin-batch-config"] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      maxWaitMinutes: Number(maxWaitInput),
      maxBatchSize: Number(maxBatchInput),
    });
  };

  const isDirty =
    data &&
    (maxWaitInput !== data.maxWaitMinutes ||
      maxBatchInput !== data.maxBatchSize);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Merkle Batch Engine Policy
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Avalanche C-Chain
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Time-driven anchoring policy: accumulates receipts and dispatches into a balanced Merkle tree.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Settings Saved
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          Loading batch configuration...
        </div>
      ) : isError ? (
        <div className="p-4 my-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{(error as Error)?.message || "Failed to load batch settings"}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 rounded text-xs transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Setting 1: Max Wait Window */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Accumulation Window
                </label>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {maxWaitInput} minutes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Sales buffer in MongoDB for this exact duration before triggering a unified on-chain batch anchor.
              </p>
              <div className="space-y-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={maxWaitInput}
                  onChange={(e) => setMaxWaitInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  {[10, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setMaxWaitInput(mins)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        maxWaitInput === mins
                          ? "bg-blue-600 text-white font-semibold shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Setting 2: Max Tree Capacity */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  Max Tree Capacity
                </label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {maxBatchInput} records
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Maximum items per Merkle tree. Flushes early only if this volume fills before the timer expires.
              </p>
              <div className="space-y-2">
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={maxBatchInput}
                  onChange={(e) => setMaxBatchInput(Math.max(10, Math.min(200, parseInt(e.target.value) || 10)))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  {[50, 100, 150, 200].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setMaxBatchInput(cap)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        maxBatchInput === cap
                          ? "bg-blue-600 text-white font-semibold shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency & Estimated Cost in USD */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Universal Merkle tree provides <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">99.2% gas reduction</strong> on Avalanche C-Chain (~68k gas per batch &bull;{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{data?.estimatedBatchCost?.costUsd || "~$0.04 USD"}</strong> /{" "}
                <span className="font-mono text-slate-500 dark:text-slate-400">{data?.estimatedBatchCost?.costNative || "~0.0017 AVAX"}</span>).
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {data?.updatedAt && (
                <span>
                  Last policy update {new Date(data.updatedAt).toLocaleDateString()}{" "}
                  {data.updatedBy ? `by ${data.updatedBy}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Last Transaction Gas Fee Block */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Last On-Chain Transaction Gas Fee
              </span>
              {data?.lastTxActual?.anchoredAt && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Anchored {new Date(data.lastTxActual.anchoredAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {data?.lastTxActual ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Actual Gas Used</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {data.lastTxActual.gasUsed.toLocaleString()} gas
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Actual Fee (USD)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs block">
                      {data.lastTxActual.feeUsd}
                    </span>
                    {data.lastTxActual.mainnetEquivalentUsd && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans mt-0.5">
                        est. {data.lastTxActual.mainnetEquivalentUsd} mainnet
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Native Cost</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs block">
                      {data.lastTxActual.feeNative}
                    </span>
                    {data.lastTxActual.mainnetEquivalentNative && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans mt-0.5">
                        est. {data.lastTxActual.mainnetEquivalentNative} mainnet
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Batched Records</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {data.lastTxActual.recordCount} items
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Witness Transaction:</span>
                  <a
                    href={data.lastTxActual.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-mono text-[11px]"
                  >
                    {data.lastTxActual.txHash.slice(0, 12)}...{data.lastTxActual.txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                No on-chain batch anchor recorded yet. Records are currently accumulating in buffer.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-2xs transition-colors cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Policy...
                </>
              ) : (
                "Save Batch Policy"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default BatchConfigCard;
