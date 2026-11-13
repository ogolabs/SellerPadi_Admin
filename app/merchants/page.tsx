"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Search,
  RefreshCw,
  GitBranch,
  Users,
  Receipt,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";

import { QUERY_TIMINGS } from "@/lib/query-config";
import { formatMoney } from "@/lib/currency";

interface MerchantItem {
  id: string;
  merchantAddress: string;
  displayName?: string | null;
  fullName: string;
  companyName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessHandle: string | null;
  country: string;
  currency: string;
  plan: string;
  operatingMode: string;
  subscriptionActive: boolean;
  isSuspended: boolean;
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  verificationType?: "kyc" | "kyb" | null;
  businessName?: string | null;
  isVerified?: boolean;
  documentType?: string | null;
  documentNumberMasked?: string | null;
  verifiedAt?: string | null;
  branchCount: number;
  teamCount: number;
  receiptCount: number;
  voidedCount: number;
  gmv: number;
  shipmentCount: number;
  createdAt: string;
}

interface MerchantsResponse {
  merchants: MerchantItem[];
  total: number;
  page: number;
  totalPages: number;
  summary?: {
    totalActive: number;
    totalSuspended: number;
    totalVerified?: number;
    totalBranches: number;
  };
}

export default function MerchantsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "pending" | "unverified">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery<MerchantsResponse>({
    queryKey: ["admin-merchants", searchTerm, statusFilter, verificationFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("q", searchTerm);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (verificationFilter !== "all") params.set("verification", verificationFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/merchants?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load merchants");
      }
      return res.json();
    },
    staleTime: QUERY_TIMINGS.DIRECTORY_STALE_MS,
    refetchOnWindowFocus: true,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const merchants = data?.merchants || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Aggregate high-level stats from backend global summary with fallback to view
  const activeCount = data?.summary?.totalActive ?? merchants.filter((m) => !m.isSuspended).length;
  const suspendedCount = data?.summary?.totalSuspended ?? merchants.filter((m) => m.isSuspended).length;
  const verifiedCount =
    data?.summary?.totalVerified ??
    merchants.filter((m) => m.verificationStatus === "verified" || m.isVerified).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Merchant Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Universal audit of onboarded stores, physical branches, staff rosters, and ledger throughput.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto shadow-xs active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Total Registered Stores
          </span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">{totalCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Verified Stores
          </span>
          <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {isLoading ? "..." : verifiedCount}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Active Merchants
          </span>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {isLoading ? "..." : activeCount}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Suspended Stores
          </span>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {isLoading ? "..." : suspendedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by store name, email, phone, wallet, or provider key..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-24 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(["all", "active", "suspended"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[11px] sm:text-xs font-medium capitalize transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(["all", "verified", "pending", "unverified"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVerificationFilter(v);
                  setPage(1);
                }}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[11px] sm:text-xs font-medium capitalize transition-colors cursor-pointer ${
                  verificationFilter === v
                    ? "bg-slate-800 dark:bg-slate-700 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Merchant Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs font-mono">Querying merchant records from MongoDB...</p>
          </div>
        ) : merchants.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No merchants found</p>
            <p className="text-xs text-slate-500">
              {searchTerm ? "Try modifying your search query or status filter." : "No merchants registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Merchant &amp; Profile</th>
                  <th className="py-3 px-4">Wallet Identity</th>
                  <th className="py-3 px-4">Compliance / KYB</th>
                  <th className="py-3 px-4">Branches &amp; Staff</th>
                  <th className="py-3 px-4">Ledger Sales (GMV)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {merchants.map((merchant) => (
                  <tr
                    key={merchant.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{merchant.companyName}</span>
                        {merchant.displayName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                            {merchant.displayName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{merchant.fullName}</span>
                        {merchant.businessEmail && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="truncate max-w-40">{merchant.businessEmail}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="truncate max-w-35" title={merchant.merchantAddress}>
                        {merchant.merchantAddress}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 capitalize mt-0.5">
                        Plan: {merchant.plan || "free"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {merchant.verificationStatus === "verified" || merchant.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            {merchant.verificationType === "kyb" ? (
                              <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {merchant.verificationType === "kyb" ? "Business Verified (Tier-2)" : "Owner Verified (Tier-1)"}
                          </span>
                        ) : merchant.verificationStatus === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {merchant.verificationType === "kyb" ? "KYB Review" : "Under Review"}
                          </span>
                        ) : merchant.verificationStatus === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                            <ShieldAlert className="w-3 h-3" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            Unverified
                          </span>
                        )}

                        {merchant.verificationType === "kyb" && merchant.businessName ? (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-32">
                            {merchant.businessName}
                          </span>
                        ) : merchant.documentNumberMasked ? (
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-30">
                            {merchant.documentNumberMasked}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1" title="Physical branches">
                          <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{merchant.branchCount}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Active cashiers &amp; managers">
                          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{merchant.teamCount}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-900 dark:text-white font-medium">
                        {formatMoney(merchant.gmv, merchant.currency)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        <span>{merchant.receiptCount} receipts</span>
                        {merchant.voidedCount > 0 && (
                          <span className="text-rose-600 dark:text-rose-400">({merchant.voidedCount} voided)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {merchant.isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                          <ShieldAlert className="w-3 h-3" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/merchants/${encodeURIComponent(merchant.id)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors text-xs font-medium cursor-pointer shadow-2xs active:scale-[0.98]"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Page <span className="text-slate-900 dark:text-white font-medium">{page}</span> of{" "}
              <span className="text-slate-900 dark:text-white font-medium">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
