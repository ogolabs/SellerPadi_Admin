"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  GitBranch,
  Users,
  Receipt,
  Package,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Wallet,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Clock,
  History,
  Tag,
} from "lucide-react";
import { QUERY_TIMINGS } from "@/lib/query-config";
import { formatMoney } from "@/lib/currency";
import type { IMerchantVerification } from "@/lib/db";
import MerchantVerificationTab from "@/components/merchants/MerchantVerificationTab";
import { MerchantQuotaCard, type MerchantQuotaData } from "@/components/merchants/MerchantQuotaCard";
import { MerchantInventoryTab, type InventoryItem } from "@/components/merchants/MerchantInventoryTab";
import { MerchantAuditTrailTab, type AuditLogItem } from "@/components/merchants/MerchantAuditTrailTab";
import { MerchantActivityTabs } from "@/components/merchants/MerchantActivityTabs";

interface MerchantDetailResponse {
  merchant: {
    id: string;
    merchantAddress: string;
    fullName: string;
    companyName: string;
    businessEmail?: string;
    businessPhone?: string;
    businessHandle?: string;
    businessAddress?: string;
    country: string;
    currency: string;
    plan: string;
    operatingMode: string;
    subscriptionActive: boolean;
    isSuspended: boolean;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    authProvider?: string | null;
    verification?: IMerchantVerification | null;
    createdAt: string;
  };
  stats: {
    receipts: {
      total: number;
      issued: number;
      voided: number;
      gmv: number;
      voidedGmv: number;
    };
    shipments: {
      total: number;
    };
    branchesCount: number;
    teamCount: number;
  };
  quota: MerchantQuotaData;
  inventory: InventoryItem[];
  auditLogs: AuditLogItem[];
  branches: Array<{
    id: string;
    name: string;
    location?: string;
    phone?: string;
    managerName?: string;
    managerAddress?: string;
    isDefault: boolean;
    createdAt: string;
  }>;
  teamMembers: Array<{
    id: string;
    memberName: string;
    memberEmail: string;
    memberPhone?: string;
    branchId: string;
    branchName: string;
    role: string;
    status: string;
    invitedAt: string;
  }>;
  recentReceipts: Array<{
    id: string;
    total: number;
    currency: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  recentShipments: Array<{
    id: string;
    trackingCode?: string;
    status: string;
    isDisputed: boolean;
    createdAt: string;
  }>;
}

export default function MerchantDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const merchantId = params.id as string;

  const [activeTab, setActiveTab] = useState<
    "verification" | "inventory" | "audit" | "branches" | "team" | "receipts" | "shipments"
  >("verification");
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<MerchantDetailResponse>({
    queryKey: ["admin-merchant-detail", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`);
      if (!res.ok) throw new Error("Failed to load merchant details");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.DETAIL_STALE_MS,
    refetchOnWindowFocus: true,
  });

  const toggleSuspensionMutation = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: newStatus }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Failed to update suspension status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-detail", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      setSuspendModalOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading store telemetry from MongoDB...</p>
      </div>
    );
  }

  if (!data?.merchant) {
    return (
      <div className="py-20 text-center space-y-4">
        <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Merchant Record Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          The requested merchant identifier could not be resolved in the primary database.
        </p>
        <Link
          href="/merchants"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  const { merchant, stats, quota, inventory, auditLogs, branches, teamMembers, recentReceipts, recentShipments } =
    data;
  const isSuspended = merchant.isSuspended;

  const verificationStatus = merchant.verification?.status || "unverified";
  const isVerified = verificationStatus === "verified";
  const isPending = verificationStatus === "pending";
  const isRejected = verificationStatus === "rejected";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/merchants"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Merchant Directory</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 pt-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {merchant.companyName}
            </h1>
            {isSuspended ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                <ShieldAlert className="w-3.5 h-3.5" />
                Suspended
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Store
              </span>
            )}

            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Identity Verified
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Under Review
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                <ShieldAlert className="w-3.5 h-3.5" />
                KYC Rejected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Owner: <span className="text-slate-800 dark:text-slate-200 font-medium">{merchant.fullName}</span> • Mode:{" "}
            <span className="capitalize text-slate-800 dark:text-slate-200">{merchant.operatingMode}</span> • Plan:{" "}
            <span className="uppercase text-slate-800 dark:text-slate-200">{merchant.plan}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setSuspendModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border shadow-xs active:scale-[0.98] ${
              isSuspended
                ? "bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80"
                : "bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/80"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isSuspended ? "Reinstate Merchant" : "Suspend Merchant"}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Active GMV (Issued)
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {formatMoney(stats.receipts.gmv, merchant.currency)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {stats.receipts.issued} of {stats.receipts.total} receipts
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Voided Sales Rate
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-200 font-mono">
            {stats.receipts.total > 0
              ? `${((stats.receipts.voided / stats.receipts.total) * 100).toFixed(1)}%`
              : "0.0%"}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 block">
            {stats.receipts.voided} voided ({formatMoney(stats.receipts.voidedGmv, merchant.currency)})
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Physical Branches
          </span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{branches.length}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Storefront locations</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Staff Roster
          </span>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{teamMembers.length}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Managers &amp; Cashiers</span>
        </div>
      </div>

      {/* Quota Telemetry Card */}
      {quota && <MerchantQuotaCard quota={quota} currency={merchant.currency} />}

      {/* Identity & Metadata Strip */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Blockchain EOA Identifier
          </span>
          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 break-all">
            <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{merchant.merchantAddress}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Contact &amp; Support
          </span>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{merchant.businessEmail || "No business email"}</span>
          </div>
          {merchant.businessPhone && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{merchant.businessPhone}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">
            Store Registration
          </span>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{new Date(merchant.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Country: {merchant.country} • Currency: {merchant.currency}
            {merchant.authProvider && (
              <span> • Auth: <span className="capitalize text-slate-800 dark:text-slate-200">{merchant.authProvider}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("verification")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "verification"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Compliance &amp; KYB</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "inventory"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Inventory SKUs ({inventory?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "audit"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Trail ({auditLogs?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "branches"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "team"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Roster ({teamMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("receipts")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "receipts"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Recent Receipts ({recentReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("shipments")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "shipments"
              ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-white"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Dispatches ({stats.shipments.total})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "verification" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <MerchantVerificationTab
              merchantId={merchant.id}
              country={merchant.country}
              isEmailVerified={merchant.isEmailVerified}
              isPhoneVerified={merchant.isPhoneVerified}
              verification={merchant.verification}
              onStatusUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["admin-merchant-detail", merchantId] });
                queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
              }}
            />
          </div>
        )}

        {activeTab === "inventory" && (
          <MerchantInventoryTab inventory={inventory || []} currency={merchant.currency} />
        )}

        {activeTab === "audit" && (
          <MerchantAuditTrailTab auditLogs={auditLogs || []} />
        )}

        {/* Branches, Staff, Receipts & Shipments via Decomposed Component */}
        {["branches", "team", "receipts", "shipments"].includes(activeTab) && (
          <MerchantActivityTabs
            tab={activeTab as "branches" | "team" | "receipts" | "shipments"}
            branches={branches}
            teamMembers={teamMembers}
            recentReceipts={recentReceipts}
            recentShipments={recentShipments}
            currency={merchant.currency}
          />
        )}
      </div>

      {/* Emergency Suspend / Reinstate Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSuspended
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                }`}
              >
                {isSuspended ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isSuspended ? "Reinstate Merchant Store?" : "Suspend Merchant Store?"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{merchant.companyName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isSuspended
                ? "Reinstating will restore the merchant's ability to issue receipts, manage team members, and process dispatches."
                : "Suspending will immediately lock this merchant account. Cashiers and managers will be blocked from issuing new sales records or package dispatches."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggleSuspensionMutation.isPending}
                onClick={() => toggleSuspensionMutation.mutate(!isSuspended)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50 ${
                  isSuspended
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {toggleSuspensionMutation.isPending
                  ? "Processing..."
                  : isSuspended
                  ? "Confirm Reinstatement"
                  : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
