"use client";

import React from "react";
import Link from "next/link";
import { Server, ArrowUpRight, Zap, CheckCircle2, AlertCircle, Fuel, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type GasFeeMetrics, getBlockExplorerTxUrl } from "@/lib/chain";

interface RelayerQuotaCardProps {
  address: string;
  balanceAvax?: string;
  balanceEtn?: string; // backward compatibility fallback
  unanchoredQueue: number;
  isLowBalance: boolean;
  network?: string;
  gasFee?: GasFeeMetrics;
  isLoading?: boolean;
}

export function RelayerQuotaCard({
  address,
  balanceAvax,
  balanceEtn,
  unanchoredQueue,
  isLowBalance,
  network = "testnet",
  gasFee,
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
  const symbol = gasFee?.currencySymbol || "AVAX";

  return (
    <Card className="p-5 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Relayer Fuel &amp; Gas Economics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time gas fees per smart contract interaction on {isMainnet ? "AVAX Mainnet" : "Fuji Testnet"}.
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Available Fuel:{" "}
            <span className="text-slate-900 dark:text-white font-bold font-mono text-base">
              {isLoading ? "..." : `${balanceNum.toFixed(4)} ${symbol}`}
            </span>{" "}
            {gasFee?.avaxPriceUsd ? (
              <span className="text-slate-500 font-mono text-xs">
                (~${(balanceNum * gasFee.avaxPriceUsd).toFixed(2)} USD)
              </span>
            ) : null}
            <span className="text-slate-500 text-xs"> ({isLowBalance ? "< 0.50 threshold" : "healthy reserve"})</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 tracking-tight ${
              isLowBalance
                ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
            }`}
          >
            {isLowBalance ? "Low Fuel" : "Operational"}
          </span>
        </div>

        {/* Dynamic Capacity Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden flex p-0.5 gap-1">
          <div
            className={`h-full rounded-full transition-all ${
              isLowBalance ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.max(4, Math.min(100, fuelPercentage))}%` }}
            title={`Relayer Gas: ${balanceNum.toFixed(4)} ${symbol}`}
          />
        </div>

        {/* Status Metrics Grid: Network, Gas Price, Queue, Relayer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] pt-1">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Active Network</span>
            <span className="text-slate-900 dark:text-white font-mono font-medium mt-0.5 block truncate">
              {isMainnet ? "AVAX Mainnet" : "Fuji Testnet"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Fuel className="w-3 h-3 text-blue-500" />
                <span>Base Gas</span>
              </span>
              {gasFee?.avaxPriceUsd ? (
                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  ${gasFee.avaxPriceUsd.toFixed(2)}
                </span>
              ) : null}
            </div>
            <span className="text-slate-900 dark:text-white font-mono font-bold mt-0.5 block truncate">
              {isLoading ? "..." : `${gasFee?.gasPriceGwei || "25.00"} Gwei`}
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

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Relayer Address</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px] mt-0.5 block truncate" title={address}>
              {shortenAddress(address)}
            </span>
          </div>
        </div>

        {/* Gas Fee per Transaction Breakdown */}
        <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium text-[11px]">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Gas Fee per Smart Contract Interaction:</span>
            </span>
            <div className="text-right font-mono">
              <span className="font-bold text-slate-900 dark:text-white">
                ~{isLoading ? "..." : `${gasFee?.avgFeeNative || "0.00225"} ${symbol}`}
              </span>{" "}
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                ({gasFee?.avgFeeUsd || "< $0.0001"})
              </span>
              <span className="text-slate-400 text-[10px]"> / tx</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                Receipt Anchor (~75k gas)
              </span>
              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                <span>{isLoading ? "..." : `${gasFee?.receiptFeeNative || "0.00188"} ${symbol}`}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-normal">
                  ({gasFee?.receiptFeeUsd || "< $0.0001"})
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                Shipment Custody (~105k gas)
              </span>
              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                <span>{isLoading ? "..." : `${gasFee?.shipmentFeeNative || "0.00263"} ${symbol}`}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-normal">
                  ({gasFee?.shipmentFeeUsd || "< $0.0001"})
                </span>
              </div>
            </div>
          </div>

          {/* Last Tx Actual On-Chain Witness if available */}
          {gasFee?.lastTxActual && (
            <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
              <span>
                Last Witness: <strong>{gasFee.lastTxActual.gasUsed.toLocaleString()} gas</strong> ({gasFee.lastTxActual.actualFeeNative} {symbol} / {gasFee.lastTxActual.actualFeeUsd})
              </span>
              <a
                href={getBlockExplorerTxUrl(gasFee.lastTxActual.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-mono"
              >
                <span>Witness</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
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
