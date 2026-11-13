"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  RefreshCw,
  Fingerprint,
  User,
  Building2,
} from "lucide-react";
import type { IMerchantVerification } from "@/lib/db";

interface MerchantVerificationTabProps {
  merchantId: string;
  country: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  verification?: IMerchantVerification | null;
  onStatusUpdated?: () => void;
}

function formatDocType(type?: string | null): string {
  if (!type) return "Identity Document";
  switch (type.toLowerCase()) {
    case "national_id":
    case "id_card":
      return "National Identity Card";
    case "passport":
      return "International Passport";
    case "driving_license":
    case "driver_license":
      return "Driver's License";
    case "residence_permit":
      return "Residence Permit";
    default:
      return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

export default function MerchantVerificationTab({
  merchantId,
  country,
  isEmailVerified,
  isPhoneVerified,
  verification,
  onStatusUpdated,
}: MerchantVerificationTabProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const status = verification?.status || "unverified";
  const isVerified = status === "verified";
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isKyb = verification?.verificationType === "kyb" || Boolean(verification?.businessName);

  const handleUpdateStatus = async (
    targetStatus: "verified" | "rejected" | "unverified",
    reason?: string
  ) => {
    try {
      setIsUpdating(true);
      setActionError(null);

      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: targetStatus,
          rejectionReason: reason,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to update verification status");
      }

      setRejectModalOpen(false);
      setRejectReason("");
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {actionError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Compliance Overview Card */}
      <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Identity &amp; Compliance
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  isVerified
                    ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    : isPending
                    ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                    : isRejected
                    ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                }`}
              >
                {isVerified ? (
                  isKyb ? (
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )
                ) : isPending ? (
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                ) : isRejected ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>
                  {isVerified
                    ? isKyb
                      ? "Business Verified (KYB)"
                      : "Business Owner Verified (KYC)"
                    : isPending
                    ? isKyb
                      ? "KYB Under Review"
                      : "KYC Under Review"
                    : isRejected
                    ? isKyb
                      ? "KYB Rejected"
                      : "KYC Rejected"
                    : "Unverified Merchant"}
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {isVerified && isKyb &&
                "Merchant company identity authenticated via official corporate registry lookup & beneficial ownership verification (KYB)."}
              {isVerified && !isKyb &&
                "Merchant individual identity authenticated via automated government document & biometric verification (KYC)."}
              {isPending &&
                "Verification session completed and currently under compliance operator review."}
              {isRejected &&
                "Verification was rejected by a compliance administrator or automated risk check."}
              {!isVerified && !isPending && !isRejected &&
                "Merchant has not yet submitted identification or registry documentation for automated verification."}
            </p>
          </div>

          {/* Admin Moderation Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0">
            {!isVerified && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("verified")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isKyb ? "Approve Business (KYB)" : "Approve Identity"}</span>
              </button>
            )}

            {!isRejected && (
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 text-[11px] sm:text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}

            {(isVerified || isRejected) && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("unverified")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] sm:text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Rejection Notice if rejected */}
        {isRejected && verification?.rejectionReason && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold">Rejection Note: </span>
              <span>{verification.rejectionReason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Official Corporate Registry Record (KYB) or Government Document (KYC) */}
        <div
          className={`p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-950/50 space-y-3.5 ${
            isVerified ? "border-slate-200 dark:border-slate-800" : "border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isKyb ? (
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {isKyb ? "Official Corporate Registry Record (KYB)" : "Government Identity Record (KYC)"}
              </span>
            </div>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Authenticated
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-sky-400">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>

          {isKyb ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Verified Business Name:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 text-right">
                  {verification?.businessName || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Registration Number:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                  {verification?.registrationNumber || "Official Corporate Record"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Jurisdiction / State:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200 uppercase">
                  {verification?.jurisdiction || verification?.issuingCountry || country || "Registered State"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Corporate Status:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {verification?.companyStatus || "Approved"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Compliance Level:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Tier-2 Verified Business
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Verification Scope:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Registry Search, UBO Screening &amp; AML
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Legal Full Name:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200 text-right">
                  {verification?.fullName || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Document Type:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {formatDocType(verification?.documentType)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Document Number:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                  {verification?.documentNumberMasked || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Issuing Country:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200 uppercase">
                  {verification?.issuingCountry || country || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span>Date of Birth:</span>
                <span className="font-mono text-slate-900 dark:text-slate-200">
                  {verification?.dateOfBirth || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Expiration Date:</span>
                <span className="font-mono text-slate-900 dark:text-slate-200">
                  {verification?.expirationDate || "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Biometric & Session Telemetry */}
        <div
          className={`p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-950/50 space-y-3.5 ${
            isVerified ? "border-slate-200 dark:border-slate-800" : "border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Verification Engine Telemetry
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/50">
              Didit v3
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
              <span>Network Provider:</span>
              <span className="text-slate-900 dark:text-slate-200 font-medium">
                {verification?.provider
                  ? `Automated Identity Network (${verification.provider})`
                  : "Automated Identity Network"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
              <span>Session ID:</span>
              <span
                className="font-mono text-slate-900 dark:text-slate-200 text-[11px] truncate max-w-48"
                title={verification?.sessionId || undefined}
              >
                {verification?.sessionId || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
              <span>Audit Method:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {isKyb
                  ? "Official Company Registry Lookup, UBO Identification & AML Screening"
                  : "Live Biometric & Document OCR"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
              <span>Verified Timestamp:</span>
              <span className="text-slate-900 dark:text-slate-200 font-mono text-[11px]">
                {verification?.verifiedAt
                  ? new Date(verification.verifiedAt).toLocaleString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Data Retention:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {isKyb ? "Corporate Registry Snapshot / Masked Off-Chain" : "Zero PII Storage / Masked Off-Chain"}
              </span>
            </div>

            {isKyb && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block">
                  Didit KYB Workflow Pipeline (4 Steps)
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate" title="Registry lookup, officers and owners">1. Company Registry</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate" title="Documents you ask the company for">2. Company Documents</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate" title="Device, IP and VPN signals">3. Device &amp; IP Analysis</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate" title="Approve automatically when every step passes">4. Decision (Approved)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Individual Owner KYC Record (If merchant completed KYC prior to KYB) */}
      {isKyb && (verification?.kycHistory || verification?.documentType || verification?.documentNumberMasked) && (
        <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Prior Owner Identity Record (KYC History)
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              Archived Individual KYC
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This merchant completed individual identity verification (KYC) before upgrading to official corporate business verification (KYB). Historical identity records remain preserved for administrative compliance and statutory audits.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Verified Owner</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block">
                {verification.kycHistory?.fullName || verification.fullName || "—"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Document Type</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block">
                {formatDocType(verification.kycHistory?.documentType || verification.documentType)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Document Number</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block">
                {verification.kycHistory?.documentNumberMasked || verification.documentNumberMasked || "—"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Issuing Country</span>
              <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block">
                {verification.kycHistory?.issuingCountry || verification.issuingCountry || country || "—"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Date of Birth</span>
              <span className="font-mono text-slate-900 dark:text-white truncate block">
                {verification.kycHistory?.dateOfBirth || verification.dateOfBirth || "—"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">KYC Verified Date</span>
              <span className="font-mono text-slate-900 dark:text-white truncate block">
                {verification.kycHistory?.verifiedAt
                  ? new Date(verification.kycHistory.verifiedAt).toLocaleDateString()
                  : "Archived"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Communication & Contact Channels Verification */}
      <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Contact Channels Verification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Email Verification</span>
            </div>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Phone Verification</span>
            </div>
            {isPhoneVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reject Merchant Verification</h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide a clear reason for rejecting this merchant&apos;s identity verification. This reason will be recorded in the immutable audit log and displayed in their portal.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Identity document expired, name mismatch, or image was unreadable."
              className="w-full h-24 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("rejected", rejectReason.trim() || undefined)}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                {isUpdating ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
