"use client";

import React from "react";
import { formatMoney } from "@/lib/currency";

export interface BranchItem {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  managerName?: string;
  managerAddress?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface TeamMemberItem {
  id: string;
  memberName: string;
  memberEmail: string;
  memberPhone?: string;
  branchId: string;
  branchName: string;
  role: string;
  status: string;
  invitedAt: string;
}

export interface RecentReceiptItem {
  id: string;
  total: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export interface RecentShipmentItem {
  id: string;
  trackingCode?: string;
  status: string;
  isDisputed: boolean;
  createdAt: string;
}

interface MerchantActivityTabsProps {
  tab: "branches" | "team" | "receipts" | "shipments";
  branches: BranchItem[];
  teamMembers: TeamMemberItem[];
  recentReceipts: RecentReceiptItem[];
  recentShipments: RecentShipmentItem[];
  currency: string;
}

export function MerchantActivityTabs({
  tab,
  branches,
  teamMembers,
  recentReceipts,
  recentShipments,
  currency,
}: MerchantActivityTabsProps) {
  if (tab === "branches") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        {branches.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No physical branches configured for this merchant.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">{b.name}</span>
                  {b.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      Primary
                    </span>
                  )}
                </div>
                {b.location && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{b.location}</p>
                )}
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-0.5">
                  <div>Manager: {b.managerName || "Unassigned"}</div>
                  {b.phone && <div>Phone: {b.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === "team") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {teamMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No staff members currently registered in this merchant workspace.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {teamMembers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{t.memberName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.memberEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[11px]">
                        {t.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{t.branchName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          t.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span className="capitalize">{t.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.invitedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (tab === "receipts") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {recentReceipts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No receipts issued by this merchant yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4">Receipt Number</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {recentReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{r.id}</td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-bold">
                      {formatMoney(r.total, r.currency || currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-sans">{r.paymentMethod}</td>
                    <td className="py-3 px-4">
                      {r.status.toLowerCase() === "voided" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                          VOIDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          ISSUED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (tab === "shipments") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {recentShipments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No dispatch shipments created by this merchant yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4">Package ID</th>
                  <th className="py-3 px-4">Tracking Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Disputed</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {recentShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{s.id}</td>
                    <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{s.trackingCode || "N/A"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 capitalize">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.isDisputed ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return null;
}

