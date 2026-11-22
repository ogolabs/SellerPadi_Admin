"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, ExternalLink, Copy, Check } from "lucide-react";
import { validateAccountNameMatch } from "@/lib/partner-utils";

export interface Partner {
  _id: string;
  partnerCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  status: "active" | "pending" | "suspended" | "rejected";
  payoutCurrency: "NGN" | "USD";
  payoutMethod?: "bank" | "crypto";
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency: "NGN" | "USD";
  } | null;
  cryptoDetails?: CryptoPayoutDetails | null;
  application?: {
    promotionChannels?: string | null;
    audienceSize?: string | null;
    marketingExperience?: string | null;
    websiteOrSocialLink?: string | null;
    adminNotes?: string | null;
    appliedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
  } | null;
  earnings?: {
    totalEarnedNgn: number;
    totalEarnedUsd: number;
    unpaidBalanceNgn: number;
    unpaidBalanceUsd: number;
    totalPaidNgn: number;
    totalPaidUsd: number;
  };
  metrics?: {
    clicksCount: number;
    signupsCount: number;
    payingCustomersCount: number;
  };
  createdAt: string;
}

export interface CryptoPayoutDetails {
  walletAddress: string;
  token: "USDC" | "USDT";
  tokenAddress?: string | null;
  network?: string | null;
  chainId?: number | null;
}

export interface PayoutRequest {
  _id: string;
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerEmail: string;
  amount: number;
  currency: "NGN" | "USD";
  payoutMethod?: "bank" | "crypto";
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
  cryptoDetails?: CryptoPayoutDetails | null;
  status: "pending" | "processing" | "paid" | "rejected";
  transferReference?: string | null;
  txHash?: string | null;
  paymentReference?: string | null;
  adminNotes?: string | null;
  fxRate?: number | null;
  originalUnpaidNgn?: number | null;
  originalUnpaidUsd?: number | null;
  requestedAt: string;
  processedAt?: string | null;
}

// 1. APPROVE PAYOUT MODAL
export function ApprovePayoutModal({
  payout,
  isPending,
  onClose,
  onConfirm,
}: {
  payout: PayoutRequest | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (transferReference: string, adminNotes: string) => void;
}) {
  const [transferRef, setTransferRef] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);

  if (!payout) return null;

  const handleCopyWallet = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const isCrypto =
    payout.payoutMethod === "crypto" || Boolean(payout.cryptoDetails?.walletAddress);
  const isValidTx = isCrypto
    ? /^0x[a-fA-F0-9]{64}$/.test(transferRef.trim())
    : Boolean(transferRef.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-md">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Approve &amp; Confirm Payout
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Mark payout for <strong>{payout.partnerName}</strong> ({payout.partnerCode}) as paid.
        </p>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
          <div>
            <strong>Amount:</strong> {payout.currency === "NGN" ? "₦" : "$"}
            {payout.amount.toLocaleString()}
          </div>
          {isCrypto ? (
            <>
              <div>
                <strong>Token:</strong> Hyperlane {payout.cryptoDetails?.token || "USDC"}
                <span className="text-[10px] text-slate-400 font-mono ml-1.5">(Electroneum Chain 52014)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong>Recipient Wallet:</strong>
                <a
                  href={`https://blockexplorer.electroneum.com/address/${payout.cryptoDetails?.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span className="break-all">{payout.cryptoDetails?.walletAddress}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                {payout.cryptoDetails?.walletAddress && (
                  <button
                    type="button"
                    onClick={() => handleCopyWallet(payout.cryptoDetails!.walletAddress)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="Copy EVM wallet address"
                  >
                    {copiedWallet ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div><strong>Bank:</strong> {payout.bankDetails?.bankName}</div>
              <div><strong>Account Number:</strong> {payout.bankDetails?.accountNumber}</div>
              <div><strong>Account Name:</strong> {payout.bankDetails?.accountName}</div>
            </>
          )}
          {Boolean(payout.fxRate && (payout.originalUnpaidNgn || payout.originalUnpaidUsd)) && (
            <div className="pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
              <strong>Conversion:</strong> Includes ₦{payout.originalUnpaidNgn?.toLocaleString() || "0"} and ${payout.originalUnpaidUsd?.toLocaleString() || "0"} at ₦{payout.fxRate?.toLocaleString()}/$1
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {isCrypto ? (
              <span>Electroneum Transaction Hash (TxHash) <span className="text-rose-500">*</span></span>
            ) : (
              <span>Bank Transfer Reference / Session ID <span className="text-rose-500">*</span></span>
            )}
          </label>
          <input
            type="text"
            placeholder={isCrypto ? "0x... (64 hex characters)" : "e.g. 090267240101123456"}
            value={transferRef}
            onChange={(e) => setTransferRef(e.target.value.trim())}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
          />
          {isCrypto && transferRef.trim() && !isValidTx && (
            <p className="text-[11px] text-rose-500 mt-1">
              Must be a valid 66-character EVM transaction hash starting with 0x.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Admin Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="Optional notes for record-keeping"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={!isValidTx || isPending}
            onClick={() => onConfirm(transferRef.trim(), adminNotes.trim())}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending ? "Approving..." : isCrypto ? "Confirm Crypto Payout" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. REJECT PAYOUT MODAL
export function RejectPayoutModal({
  payout,
  isPending,
  onClose,
  onConfirm,
}: {
  payout: PayoutRequest | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");

  if (!payout) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-md">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Reject Payout Request
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The amount ({payout.currency === "NGN" ? "₦" : "$"}
          {payout.amount.toLocaleString()}) will be refunded back to the partner&apos;s wallet.
        </p>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Reason for Rejection <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Invalid bank account name, please update bank details."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={!rejectReason.trim() || isPending}
            onClick={() => onConfirm(rejectReason.trim())}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. COMPREHENSIVE APPLICATION REVIEW MODAL (Zero Amber)
export function ViewApplicationModal({
  partner,
  isPending = false,
  onClose,
  onAccept,
  onReject,
}: {
  partner: Partner | null;
  isPending?: boolean;
  onClose: () => void;
  onAccept: (partner: Partner, adminNotes?: string) => void;
  onReject: (partner: Partner, reason: string) => void;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionError, setRejectionError] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);

  if (!partner) return null;

  const bankNameMatch = partner.bankDetails?.accountName
    ? validateAccountNameMatch(partner.bankDetails.accountName, partner.fullName)
    : null;

  const handleConfirmReject = () => {
    if (!adminNotes.trim()) {
      setRejectionError("Please provide a rejection reason/feedback for the applicant.");
      return;
    }
    setRejectionError("");
    onReject(partner, adminNotes.trim());
  };

  const handleConfirmApprove = () => {
    setRejectionError("");
    onAccept(partner, adminNotes.trim() || undefined);
  };

  const submissionDate = partner.application?.appliedAt
    ? new Date(partner.application.appliedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : partner.createdAt
    ? new Date(partner.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Partner Application Review</span>
              {partner.country && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {partner.country}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Code: <strong className="text-blue-600 dark:text-blue-400">{partner.partnerCode}</strong> · {partner.fullName}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
              partner.status === "active"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : partner.status === "pending"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : partner.status === "suspended"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {partner.status === "pending" ? "Pending Review" : partner.status}
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Card 1: Applicant Profile & Contact */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Applicant Profile &amp; Contact
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Full Name / Entity:</span>{" "}
                <strong className="text-slate-900 dark:text-white">{partner.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Google Email:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-white break-all">{partner.email}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Phone:</span>{" "}
                <span>{partner.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Country &amp; Payout:</span>{" "}
                <span className="font-semibold">{partner.country || "Not specified"} ({partner.payoutCurrency})</span>
              </div>
              {submissionDate && (
                <div className="sm:col-span-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  Applied on: <strong className="font-medium text-slate-700 dark:text-slate-300">{submissionDate}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Payout Destination & Anti-Fraud Verification */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Payout Destination &amp; Verification
            </div>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              {partner.payoutMethod === "crypto" || partner.cryptoDetails?.walletAddress ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Payout Method:</span>{" "}
                      <strong className="text-blue-600 dark:text-blue-400">Hyperlane Stablecoin</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Preferred Token:</span>{" "}
                      <strong>{partner.cryptoDetails?.token || "USDC"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Target Chain:</span>{" "}
                      <span>Electroneum (Chain ID: 52014)</span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 dark:text-slate-400">EVM Wallet Address:</span>
                    <a
                      href={`https://blockexplorer.electroneum.com/address/${partner.cryptoDetails?.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span className="break-all">{partner.cryptoDetails?.walletAddress || "Not provided"}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    {partner.cryptoDetails?.walletAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(partner.cryptoDetails!.walletAddress);
                          setCopiedWallet(true);
                          setTimeout(() => setCopiedWallet(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ml-1"
                        title="Copy EVM wallet address"
                      >
                        {copiedWallet ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : partner.bankDetails?.bankName ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Bank Name:</span>{" "}
                      <strong>{partner.bankDetails.bankName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Account Number:</span>{" "}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {partner.bankDetails.accountNumber}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400">Account Name:</span>{" "}
                      <strong className="text-slate-900 dark:text-white">{partner.bankDetails.accountName}</strong>
                    </div>
                  </div>

                  {/* Anti-fraud Name Match Banner */}
                  {bankNameMatch && (
                    <div className="pt-1.5">
                      {bankNameMatch.isValid ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Anti-Fraud Passed:</strong> Bank account name matches registered applicant entity.
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-rose-800 dark:text-rose-300 text-[11px]">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Anti-Fraud Warning (Name Mismatch):</span>{" "}
                            <span>{bankNameMatch.message} Third-party payout accounts are strictly prohibited.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 italic">
                  No payout details configured yet.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Application Questionnaire */}
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                1. Promotional Channels &amp; Marketing Strategy
              </div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {partner.application?.promotionChannels || "Not provided"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                2. Estimated Merchant Reach / Network Size
              </div>
              <p className="text-slate-800 dark:text-slate-200 font-semibold">
                {partner.application?.audienceSize || "Not specified"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                3. Relevant Marketing or E-Commerce Experience
              </div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {partner.application?.marketingExperience || "Not provided"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                4. Social Media Profile (TikTok, Instagram, or Facebook)
              </div>
              {partner.application?.websiteOrSocialLink ? (
                <a
                  href={partner.application.websiteOrSocialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all inline-flex items-center gap-1 font-medium"
                >
                  <span>{partner.application.websiteOrSocialLink}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-slate-500 italic">Not provided</p>
              )}
            </div>
          </div>

          {/* Recorded Admin Feedback for Reviewed Partners */}
          {partner.application?.adminNotes && partner.status !== "pending" && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
              <div className="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider text-[10px]">
                Recorded Reviewer Feedback
              </div>
              <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
                {partner.application.adminNotes}
              </p>
              {partner.application.reviewedAt && (
                <p className="text-[10px] text-blue-700 dark:text-blue-400 pt-1">
                  Reviewed at: {new Date(partner.application.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Section 4: In-Place Review Decision & Feedback Area */}
          {partner.status === "pending" && (
            <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Reviewer Notes / Feedback
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes for approval; required feedback if rejecting (sent to applicant on their review screen)..."
                value={adminNotes}
                onChange={(e) => {
                  setAdminNotes(e.target.value);
                  if (rejectionError) setRejectionError("");
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {rejectionError && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                  {rejectionError}
                </p>
              )}

              {showRejectConfirm ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 space-y-2 mt-2">
                  <p className="font-bold text-rose-900 dark:text-rose-200 text-xs">
                    Confirm Rejection for {partner.fullName}?
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    The partner will be marked as rejected and shown the feedback entered above.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setShowRejectConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleConfirmReject}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
          >
            Close
          </button>

          {partner.status === "pending" && !showRejectConfirm && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!adminNotes.trim()) {
                    setRejectionError("Please enter a rejection reason/feedback in the notes field above.");
                    return;
                  }
                  setShowRejectConfirm(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject Application
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmApprove}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Approving..." : "Approve Application"}
              </button>
            </>
          )}

          {partner.status === "rejected" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirmApprove}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Approving..." : "Re-approve Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. SUSPEND PARTNER MODAL
export function SuspendPartnerModal({
  partner,
  isPending,
  onClose,
  onConfirm,
}: {
  partner: Partner | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [suspendReason, setSuspendReason] = useState("");

  if (!partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            ⚠
          </span>
          <span>Confirm Partner Suspension</span>
        </h3>

        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
          <p className="font-bold">
            Are you sure you want to suspend {partner.fullName} ({partner.partnerCode})?
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700 dark:text-rose-400">
            <li>Their vanity promo code will be deactivated at checkout &amp; onboarding</li>
            <li>All commission earnings on referee renewals will be frozen</li>
            <li>Commission payout withdrawals will be locked</li>
            <li>Their Partner Dashboard will indicate an active suspension notice</li>
          </ul>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Suspension Reason / Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Terms violation, suspicious self-referral, or account under investigation"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(suspendReason.trim())}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Suspending..." : "Confirm Suspension"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. ACCEPT / REACTIVATE PARTNER MODAL
export function AcceptPartnerModal({
  partner,
  isPending,
  onClose,
  onConfirm,
}: {
  partner: Partner | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {partner.status === "suspended" ? "Reactivate Partner Account" : "Approve Partner Application"}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {partner.status === "suspended"
            ? `Reactivate ${partner.fullName} (${partner.partnerCode})? Their promo code and commission accruals will be restored.`
            : `Approve ${partner.fullName} (${partner.partnerCode}) as an active partner? Their vanity promo code will be activated and they will gain full partner access.`}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Approving..." : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 6. REJECT PARTNER APPLICATION MODAL
export function RejectPartnerModal({
  partner,
  isPending,
  onClose,
  onConfirm,
}: {
  partner: Partner | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");

  if (!partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Reject Partner Application
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reject the partner application for {partner.fullName} ({partner.partnerCode}).
        </p>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Reason for Rejection / Feedback (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Ineligible reach, incomplete promotional plan, or duplicate submission."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(rejectReason.trim())}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Rejecting..." : "Reject Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
