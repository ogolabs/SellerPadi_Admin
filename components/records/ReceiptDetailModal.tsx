"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Store,
  User,
  CreditCard,
  ExternalLink,
  Calendar,
  Building2,
} from "lucide-react";
import { UnifiedRecordItem } from "@/app/api/records/route";

interface ReceiptDetailModalProps {
  record: UnifiedRecordItem | null;
  onClose: () => void;
}

export function ReceiptDetailModal({ record, onClose }: ReceiptDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!record || record.recordType !== "receipt") return null;

  const r = record.receipt;
  const isVoided = record.isVoidedOrDisputed || (record.status || "").toLowerCase() === "voided";

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

  const explorerUrl = r?.onChainTxHash?.startsWith("0x")
    ? `https://subnets-test.avax.network/c-chain/tx/${r.onChainTxHash}`
    : null;

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
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Digital Sales Receipt
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                    isVoided
                      ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                      : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  }`}
                >
                  {isVoided ? "VOIDED" : "ISSUED"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-slate-500 select-all">
                  {r?.receiptNumber || record.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(r?.receiptNumber || record.id, "id")}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Copy Receipt Number"
                >
                  {copiedField === "id" ? (
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

        {/* Voided Alert Banner (if applicable) */}
        {isVoided && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 min-w-0">
              <div className="font-semibold text-rose-900 dark:text-rose-200">
                Receipt Marked as Voided
              </div>
              <p className="text-rose-700 dark:text-rose-300">
                Reason:{" "}
                <span className="font-medium italic">
                  &ldquo;{r?.voidReason || "No explicit reason recorded"}&rdquo;
                </span>
              </p>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 font-mono">
                {r?.voidedBy && <span>Voided By: {r.voidedBy}</span>}
                {r?.voidedAt && <span>Timestamp: {new Date(r.voidedAt).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Store & Issuer Context Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Store Info */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Store className="w-3.5 h-3.5 text-blue-500" />
              <span>Merchant / Store</span>
            </div>
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {record.merchantName || "Registered Merchant"}
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
              <span>{shortenAddress(record.merchantOrShipper)}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(record.merchantOrShipper, "merchantAddr")}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Copy Address"
              >
                {copiedField === "merchantAddr" ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Issuer / Staff Info */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Counter Branch &amp; Issuer</span>
            </div>
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {r?.branchName || "Main Counter / HQ"}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              Issued by:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {r?.issuedByName || "Store Staff"}
              </span>
              {r?.issuedByRole && ` (${r.issuedByRole})`}
            </div>
          </div>
        </div>

        {/* Customer Information (if present) */}
        {(r?.customerName || r?.customerPhone || r?.customerEmail) && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-500 mb-1">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Customer Identification</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {r.customerName && (
                <span className="font-medium text-slate-900 dark:text-white">
                  {r.customerName}
                </span>
              )}
              {r.customerPhone && (
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {r.customerPhone}
                </span>
              )}
              {r.customerEmail && (
                <span className="text-slate-500">{r.customerEmail}</span>
              )}
            </div>
          </div>
        )}

        {/* Itemized Cart Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
            <span>Itemized Breakdown</span>
            <span className="font-mono text-slate-500 font-normal">
              {r?.items?.length || 0} line items
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(r?.items && r.items.length > 0) ? (
                  r.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {r?.currency || "NGN"} {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {r?.currency || "NGN"} {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-center text-slate-500 italic">
                      Standard transaction recorded ({record.detail})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 space-y-1.5 text-xs font-mono">
          {typeof r?.subtotal === "number" && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span>{r?.currency || "NGN"} {r.subtotal.toLocaleString()}</span>
            </div>
          )}
          {typeof r?.discount === "number" && r.discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span>-{r?.currency || "NGN"} {r.discount.toLocaleString()}</span>
            </div>
          )}
          {typeof r?.tax === "number" && r.tax > 0 && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>VAT / Tax</span>
              <span>+{r?.currency || "NGN"} {r.tax.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="font-sans">Grand Total</span>
            <span>{record.detail}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Method: {r?.paymentMethod || "Cash"}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium font-mono text-[10px] uppercase">
              {r?.paymentStatus || "Paid"}
            </span>
          </div>
        </div>

        {/* Audit & Relayer Proof Verification */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Immutable Ledger Audit Proof</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-semibold uppercase">
              {record.onChainStatus}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            {r?.receiptHash && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 shrink-0">Proof of Sale SHA-256:</span>
                <div className="flex items-center gap-1 truncate text-slate-700 dark:text-slate-300">
                  <span className="truncate">{r.receiptHash}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(r.receiptHash!, "receiptHash")}
                    className="hover:text-slate-900 dark:hover:text-white shrink-0"
                    title="Copy Hash"
                  >
                    {copiedField === "receiptHash" ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {explorerUrl && r?.onChainTxHash && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-slate-500 shrink-0">Avalanche C-Chain Ref:</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate font-mono text-[11px]"
                >
                  <span className="truncate">{shortenAddress(r.onChainTxHash)}</span>
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
            <span>Issued: {new Date(record.createdAt).toLocaleString()}</span>
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
