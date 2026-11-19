"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_TIMINGS } from "@/lib/query-config";
import {
  Handshake,
  Search,
  RefreshCw,
  Percent,
  Clock,
  Building,
  UserCheck,
  Sliders,
  ClipboardCheck,
} from "lucide-react";
import {
  Partner,
  PayoutRequest,
  ApprovePayoutModal,
  RejectPayoutModal,
  ViewApplicationModal,
  SuspendPartnerModal,
  AcceptPartnerModal,
  RejectPartnerModal,
} from "@/components/Partners/PartnerModals";
import PartnerSettingsTab, {
  PartnerSettingsData,
} from "@/components/Partners/PartnerSettingsTab";

type ProgramConfig = PartnerSettingsData;

export default function AdminPartnersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"directory" | "payouts" | "settings">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Approval Modal state
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectModalPayout, setRejectModalPayout] = useState<PayoutRequest | null>(null);

  // Partner Review & Suspension Modal States
  const [viewApplicationPartner, setViewApplicationPartner] = useState<Partner | null>(null);
  const [suspendModalPartner, setSuspendModalPartner] = useState<Partner | null>(null);
  const [rejectPartnerModal, setRejectPartnerModal] = useState<Partner | null>(null);
  const [acceptPartnerModal, setAcceptPartnerModal] = useState<Partner | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<PartnerSettingsData | null>(null);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState("");

  // 1. Fetch Partners & Program Stats
  const {
    data: partnersData,
    isLoading: isLoadingPartners,
    refetch: refetchPartners,
    isFetching: isFetchingPartners,
  } = useQuery({
    queryKey: ["admin-partners", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/partners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load partners");
      const json = await res.json();
      if (!settingsForm && json.config) {
        setSettingsForm(json.config);
      }
      return json;
    },
    staleTime: QUERY_TIMINGS.DIRECTORY_STALE_MS,
    gcTime: QUERY_TIMINGS.GC_TIME_MS,
  });

  // 2. Fetch Payout Requests
  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ["admin-partner-payouts"],
    queryFn: async () => {
      const res = await fetch("/api/partners/payouts?status=all");
      if (!res.ok) throw new Error("Failed to load payout requests");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.DIRECTORY_STALE_MS,
    gcTime: QUERY_TIMINGS.GC_TIME_MS,
  });

  // 3. Update Dynamic Config Mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updated: Partial<ProgramConfig>) => {
      const res = await fetch("/api/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      setSettingsSavedMessage("Partner settings updated successfully!");
      setTimeout(() => setSettingsSavedMessage(""), 4000);
    },
  });

  // 4. Process Payout Mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (payload: {
      payoutId: string;
      action: "approve" | "reject";
      transferReference?: string;
      adminNotes?: string;
    }) => {
      const res = await fetch("/api/partners/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process payout");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      setSelectedPayout(null);
      setRejectModalPayout(null);
    },
  });

  // 5. Update Partner Status Mutation (Accept, Reject, Suspend, Reactivate)
  const updatePartnerStatusMutation = useMutation({
    mutationFn: async ({
      partnerId,
      status,
      adminNotes,
    }: {
      partnerId: string;
      status: "active" | "rejected" | "suspended";
      adminNotes?: string;
    }) => {
      const res = await fetch("/api/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed to update partner status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      setSuspendModalPartner(null);
      setRejectPartnerModal(null);
      setAcceptPartnerModal(null);
      setViewApplicationPartner(null);
    },
  });

  const partners: Partner[] = partnersData?.partners || [];
  const stats = partnersData?.stats;
  const config: ProgramConfig = partnersData?.config || {
    discountPercent: 20,
    commissionPercent: 20,
    commissionDurationMonths: 24,
    minPayoutNgn: 5000,
    minPayoutUsd: 25,
    termsVersion: "v1.0",
    termsContent: "",
    partnerRegistrationOpen: true,
  };

  const payouts: PayoutRequest[] = payoutsData?.payouts || [];
  const pendingPayouts = payouts.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Handshake className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Partner Program
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervise referral partners, approve manual commission payouts, and dynamically tune program rates.
          </p>
        </div>

        <button
          onClick={() => {
            refetchPartners();
            refetchPayouts();
          }}
          disabled={isFetchingPartners}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetchingPartners ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Top Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Partners</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalPartners ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registered promoters & merchants
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Referred Customers</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.metrics?.totalPaying ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Paying merchants onboarded
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {pendingPayouts.length}
            {pendingPayouts.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Action Required
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Awaiting manual bank transfer
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Rates</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {config.discountPercent}% Off / {config.commissionPercent}% Cut
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            For {config.commissionDurationMonths} months active duration
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "directory"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <span>Partners Directory ({partners.length})</span>
          {Boolean(stats?.pendingApplicationsCount && stats.pendingApplicationsCount > 0) && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
              {stats.pendingApplicationsCount} Review
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "payouts"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Payout Requests
          {pendingPayouts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
              {pendingPayouts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Program Rates & Settings
        </button>
      </div>

      {/* TAB 1: PARTNERS DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code, partner name, email..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Promo Code</th>
                    <th className="py-3 px-4">Bank Details</th>
                    <th className="py-3 px-4 text-center">Attributed Stores</th>
                    <th className="py-3 px-4 text-right">Total Earned</th>
                    <th className="py-3 px-4 text-right">Unpaid Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {isLoadingPartners ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Loading partner directory...
                      </td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No partners found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    partners.map((partner) => (
                      <tr key={partner._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{partner.fullName}</span>
                            {partner.country && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {partner.country}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{partner.email}</div>
                          <button
                            type="button"
                            onClick={() => setViewApplicationPartner(partner)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer font-medium"
                          >
                            Review Application Details →
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {partner.partnerCode}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {partner.bankDetails?.accountNumber ? (
                            <div>
                              <div className="font-medium">{partner.bankDetails.bankName}</div>
                              <div>{partner.bankDetails.accountNumber} ({partner.bankDetails.accountName})</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not configured</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {partner.metrics?.payingCustomersCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                          ₦{(partner.earnings?.totalEarnedNgn || 0).toLocaleString()} / ${(partner.earnings?.totalEarnedUsd || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          ₦{(partner.earnings?.unpaidBalanceNgn || 0).toLocaleString()} / ${(partner.earnings?.unpaidBalanceUsd || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              partner.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : partner.status === "pending"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : partner.status === "suspended"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {partner.status === "pending" ? "Pending Review" : partner.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {partner.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => setViewApplicationPartner(partner)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                Review Application
                              </button>
                            )}

                            {partner.status === "active" && (
                              <button
                                type="button"
                                onClick={() => setSuspendModalPartner(partner)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}

                            {partner.status === "suspended" && (
                              <button
                                type="button"
                                onClick={() => setAcceptPartnerModal(partner)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}

                            {partner.status === "rejected" && (
                              <button
                                type="button"
                                onClick={() => setAcceptPartnerModal(partner)}
                                className="text-xs font-medium px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              >
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYOUT REQUESTS */}
      {activeTab === "payouts" && (
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Bank Account</th>
                    <th className="py-3 px-4">Requested On</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {isLoadingPayouts ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading payout requests...
                      </td>
                    </tr>
                  ) : payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No payout requests found.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white font-mono">{payout.partnerCode}</div>
                          <div className="text-xs text-slate-500">{payout.partnerEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {payout.currency === "NGN" ? "₦" : "$"}
                          {payout.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                          <div className="font-medium">{payout.bankDetails?.bankName}</div>
                          <div>{payout.bankDetails?.accountNumber} ({payout.bankDetails?.accountName})</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payout.status === "paid"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : payout.status === "pending"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                            }`}
                          >
                            {payout.status}
                          </span>
                          {payout.transferReference && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Ref: {payout.transferReference}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {payout.status === "pending" ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedPayout(payout)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                              >
                                Approve Transfer
                              </button>
                              <button
                                onClick={() => setRejectModalPayout(payout)}
                                className="px-2 py-1 text-xs font-medium rounded-md border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Archived</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC PROGRAM SETTINGS */}
      {activeTab === "settings" && settingsForm && (
        <PartnerSettingsTab
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm as React.Dispatch<React.SetStateAction<PartnerSettingsData>>}
          onSave={(data) => updateConfigMutation.mutate(data)}
          isPending={updateConfigMutation.isPending}
          savedMessage={settingsSavedMessage}
        />
      )}

      {/* APPROVE PAYOUT MODAL */}
      <ApprovePayoutModal
        payout={selectedPayout}
        isPending={processPayoutMutation.isPending}
        onClose={() => setSelectedPayout(null)}
        onConfirm={(transferReference, adminNotes) => {
          if (!selectedPayout) return;
          processPayoutMutation.mutate({
            payoutId: selectedPayout._id,
            action: "approve",
            transferReference,
            adminNotes,
          });
        }}
      />

      {/* REJECT PAYOUT MODAL */}
      <RejectPayoutModal
        payout={rejectModalPayout}
        isPending={processPayoutMutation.isPending}
        onClose={() => setRejectModalPayout(null)}
        onConfirm={(reason) => {
          if (!rejectModalPayout) return;
          processPayoutMutation.mutate({
            payoutId: rejectModalPayout._id,
            action: "reject",
            adminNotes: reason,
          });
        }}
      />

      {/* COMPREHENSIVE PARTNER APPLICATION REVIEW MODAL */}
      <ViewApplicationModal
        partner={viewApplicationPartner}
        isPending={updatePartnerStatusMutation.isPending}
        onClose={() => setViewApplicationPartner(null)}
        onAccept={(partner, adminNotes) => {
          updatePartnerStatusMutation.mutate({
            partnerId: partner._id,
            status: "active",
            adminNotes,
          });
        }}
        onReject={(partner, reason) => {
          updatePartnerStatusMutation.mutate({
            partnerId: partner._id,
            status: "rejected",
            adminNotes: reason,
          });
        }}
      />

      {/* SUSPEND PARTNER CONFIRMATION MODAL */}
      <SuspendPartnerModal
        partner={suspendModalPartner}
        isPending={updatePartnerStatusMutation.isPending}
        onClose={() => setSuspendModalPartner(null)}
        onConfirm={(reason) => {
          if (!suspendModalPartner) return;
          updatePartnerStatusMutation.mutate({
            partnerId: suspendModalPartner._id,
            status: "suspended",
            adminNotes: reason || undefined,
          });
        }}
      />

      {/* ACCEPT / APPROVE PARTNER APPLICATION MODAL */}
      <AcceptPartnerModal
        partner={acceptPartnerModal}
        isPending={updatePartnerStatusMutation.isPending}
        onClose={() => setAcceptPartnerModal(null)}
        onConfirm={() => {
          if (!acceptPartnerModal) return;
          updatePartnerStatusMutation.mutate({
            partnerId: acceptPartnerModal._id,
            status: "active",
          });
        }}
      />

      {/* REJECT PARTNER APPLICATION MODAL */}
      <RejectPartnerModal
        partner={rejectPartnerModal}
        isPending={updatePartnerStatusMutation.isPending}
        onClose={() => setRejectPartnerModal(null)}
        onConfirm={(reason) => {
          if (!rejectPartnerModal) return;
          updatePartnerStatusMutation.mutate({
            partnerId: rejectPartnerModal._id,
            status: "rejected",
            adminNotes: reason || undefined,
          });
        }}
      />
    </div>
  );
}
