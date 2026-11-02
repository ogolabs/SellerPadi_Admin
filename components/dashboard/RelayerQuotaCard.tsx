import React from "react";
import Link from "next/link";
import { Server, ArrowUpRight, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RelayerQuotaCardProps {
  address: string;
  balanceAvax?: string;
  balanceEtn?: string; // backward compatibility fallback
  unanchoredQueue: number;
  isLowBalance: boolean;
  network?: string;
  isLoading?: boolean;
}

export function RelayerQuotaCard({
  address,
  balanceAvax,
  balanceEtn,
  unanchoredQueue,
  isLowBalance,
  network = "testnet",
  isLoading = false,
}: RelayerQuotaCardProps) {
  const currentBalance = balanceAvax ?? balanceEtn ?? "0";
  const balanceNum = parseFloat(currentBalance);
  const targetBuffer = 1.0; // 1.0 AVAX target reserve buffer
  const fuelPercentage = Math.min(100, Math.round((balanceNum / targetBuffer) * 100));

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr || "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isMainnet = network.toLowerCase() === "mainnet";

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Relayer Fuel &amp; Network Capacity</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Avalanche C-Chain {isMainnet ? "Mainnet" : "Fuji Testnet"} transaction gas reserves and anchor queue.
          </p>
        </div>

        <Link
          href="/infrastructure"
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>Inspect</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Capacity Gauge Header */}
      <div className="py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Available Fuel:{" "}
            <span className="text-slate-900 dark:text-white font-bold font-mono text-base">
              {isLoading ? "..." : `${balanceNum.toFixed(4)} AVAX`}
            </span>{" "}
            <span className="text-slate-500">({isLowBalance ? "< 0.50 AVAX threshold" : "healthy reserve"})</span>
          </div>
          <span
            className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
              isLowBalance
                ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
            }`}
          >
            {isLowBalance ? "Low Fuel Warning" : "Fuel Operational"}
          </span>
        </div>

        {/* Dynamic Capacity Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden flex p-0.5 gap-1">
          <div
            className={`h-full rounded-full transition-all ${
              isLowBalance ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.max(4, Math.min(100, fuelPercentage))}%` }}
            title={`Relayer Gas: ${balanceNum.toFixed(4)} AVAX`}
          />
        </div>

        {/* Real Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-1">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Active Network</span>
            <span className="text-slate-900 dark:text-white font-mono font-medium mt-0.5 block">
              {isMainnet ? "AVAX Mainnet (43114)" : "Fuji Testnet (43113)"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Relayer Queue</span>
            <span
              className={`font-mono font-medium mt-0.5 block ${
                unanchoredQueue > 0 ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {unanchoredQueue} in flight
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5 col-span-2 sm:col-span-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Relayer Address</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px] mt-0.5 block truncate" title={address}>
              {shortenAddress(address)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Automated Gas Relaying</span>
        </div>
        <div className="flex items-center gap-1">
          {isLowBalance ? (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Top-up Fuel Advised
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sufficient Fuel
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
