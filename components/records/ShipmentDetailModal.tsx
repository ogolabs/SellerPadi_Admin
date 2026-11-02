"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Phone,
  Lock,
  ExternalLink,
  Calendar,
  Truck,
  Receipt,
  Clock,
} from "lucide-react";
import { UnifiedRecordItem } from "@/app/api/records/route";

interface ShipmentDetailModalProps {
  record: UnifiedRecordItem | null;
  onClose: () => void;
}

export function ShipmentDetailModal({ record, onClose }: ShipmentDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!record || record.recordType !== "shipment") return null;

  const s = record.shipment;
  const isDisputed = Boolean(s?.isDisputed) || (record.status || "").toLowerCase() === "disputed";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return "—";
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusBadgeStyle = (status: string) => {
    const st = status.toLowerCase();
    if (st === "verified") {
      return "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60";
    }
    if (st === "intransit" || st === "in transit") {
      return "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60";
    }
    if (st === "delivered") {
      return "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60";
    }
    if (st === "disputed") {
      return "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  const explorerUrl = s?.onChainTxHash?.startsWith("0x")
    ? `https://subnets-test.avax.network/c-chain/tx/${s.onChainTxHash}`
    : null;

  const trackingCode = s?.trackingCode || record.id;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 my-8 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Tracked Parcel Dispatch
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${getStatusBadgeStyle(
                    record.status
                  )}`}
                >
                  {record.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-slate-500 select-all">
                  {trackingCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trackingCode, "tracking")}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Copy Tracking Identifier"
                >
                  {copiedField === "tracking" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dispute Alert Banner (if applicable) */}
        {isDisputed && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 min-w-0">
              <div className="font-semibold text-rose-900 dark:text-rose-200">
                Package Custody Disputed
              </div>
              <p className="text-rose-700 dark:text-rose-300">
                Dispute Reason:{" "}
                <span className="font-medium italic">
                  &ldquo;{s?.disputeReason || "Recipient reported an issue during physical handover"}&rdquo;
                </span>
              </p>
              {s?.resolutionNotes && (
                <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-rose-200 dark:border-rose-900/40">
                  Resolution: {s.resolutionNotes}
                </p>
              )}
              <div className="text-[11px] text-rose-600 dark:text-rose-400 flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 font-mono">
                <span>Status: {s?.disputeResolved ? "Resolved" : "Pending Resolution"}</span>
                {s?.resolvedBy && <span>Investigator: {s.resolvedBy}</span>}
                {s?.resolvedAt && <span>Resolved At: {new Date(s.resolvedAt).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Sender & Receiver Routing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Sender / Merchant */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Truck className="w-3.5 h-3.5 text-purple-500" />
              <span>Sender &amp; Dispatch Origin</span>
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-white truncate">
                {record.merchantName || s?.senderName || "Merchant Origin"}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                Branch: {s?.branchName || "Main Dispatch Hub"}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 pt-0.5">
                <span>{shortenAddress(record.merchantOrShipper)}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(record.merchantOrShipper, "shipperAddr")}
                  className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Copy Shipper Address"
                >
                  {copiedField === "shipperAddr" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Receiver / Destination */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>Recipient &amp; Delivery Destination</span>
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-white truncate">
                {s?.receiverName || "Designated Recipient"}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{s?.destination || "Destination Address"}</span>
              </div>
              {s?.receiverPhone && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono pt-0.5">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{s.receiverPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linked Sales Receipt & Handover Secret Shield */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Linked Receipt */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Receipt className="w-3.5 h-3.5 text-blue-500" />
              <span>Linked Sales Receipt</span>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
              {s?.receiptNumber || "Direct Shipment (No linked receipt)"}
            </div>
          </div>

          {/* Handover Scratch-Off PIN Security */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Handover Verification PIN</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-semibold tracking-widest">
                SP-••••
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                {record.status.toLowerCase() === "verified"
                  ? "Handover Confirmed"
                  : "Confidential until scan"}
              </span>
            </div>
          </div>
        </div>

        {/* Custody Checkpoint Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
            <span>Custody Lifecycle &amp; Checkpoints</span>
            <span className="font-mono text-slate-500 font-normal">
              {s?.events?.length || 1} checkpoints logged
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 space-y-3">
            {s?.events && s.events.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {s.events.map((ev, idx) => (
                  <div key={idx} className="relative text-xs space-y-0.5">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ev.event || ev.status || "Checkpoint Recorded"}
                      </span>
                      {ev.timestamp && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {ev.location && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{ev.location}</span>
                      </p>
                    )}
                    {ev.note && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        {ev.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  Initial custody checkpoint created on{" "}
                  {new Date(record.createdAt).toLocaleString()}.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audit & Relayer Proof Verification */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Immutable Ledger Custody Proof</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-semibold uppercase">
              {record.onChainStatus}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 shrink-0">Package Tracking Code:</span>
              <div className="flex items-center gap-1 truncate text-slate-700 dark:text-slate-300">
                <span className="truncate">{trackingCode}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trackingCode, "pkgCode")}
                  className="hover:text-slate-900 dark:hover:text-white shrink-0"
                  title="Copy Code"
                >
                  {copiedField === "pkgCode" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {explorerUrl && s?.onChainTxHash && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-slate-500 shrink-0">Avalanche C-Chain Ref:</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate font-mono text-[11px]"
                >
                  <span className="truncate">{shortenAddress(s.onChainTxHash)}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Dispatched: {new Date(record.createdAt).toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
