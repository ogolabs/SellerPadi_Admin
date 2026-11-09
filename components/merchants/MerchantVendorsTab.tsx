"use client";

import React, { useState } from "react";
import {
  Briefcase,
  DollarSign,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";

export interface VendorItem {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  paymentTermsDays: number;
  notes?: string | null;
  totalPurchased: number;
  totalPaid: number;
  totalOwed: number;
  billsCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface VendorBillItem {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  branchId?: string | null;
  branchName?: string | null;
  itemsCount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: "unpaid" | "partially_paid" | "paid";
  billDate?: string;
  issueDate?: string;
  dueDate?: string | null;
  paymentsCount: number;
  createdAt: string;
}

function formatSafeDate(dateVal?: string | Date | null, fallbackVal?: string | Date | null): string {
  const target = dateVal || fallbackVal;
  if (!target) return "—";
  const d = new Date(target);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

interface MerchantVendorsTabProps {
  vendors: VendorItem[];
  vendorBills: VendorBillItem[];
  currency: string;
}

export function MerchantVendorsTab({
  vendors,
  vendorBills,
  currency,
}: MerchantVendorsTabProps) {
  const [subTab, setSubTab] = useState<"bills" | "vendors">("bills");

  const totalPayableDue = vendorBills.reduce((acc, b) => acc + (b.balanceDue || 0), 0);
  const unpaidBillsCount = vendorBills.filter((b) => b.status !== "paid").length;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <DollarSign className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Accounts Payable (AP)</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {formatMoney(totalPayableDue, currency)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {unpaidBillsCount} open {unpaidBillsCount === 1 ? "bill" : "bills"} pending settlement
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Active Suppliers</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {vendors.filter((v) => v.isActive).length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {vendors.length} total registered supplier profiles
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Procurement Bills</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {vendorBills.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Recent supplier purchase invoices
          </span>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubTab("bills")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            subTab === "bills"
              ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Vendor Bills ({vendorBills.length})
        </button>
        <button
          onClick={() => setSubTab("vendors")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            subTab === "vendors"
              ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Suppliers Directory ({vendors.length})
        </button>
      </div>

      {/* Tab Panels */}
      {subTab === "bills" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Procurement Bills &amp; Liabilities
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Real-time AP Ledger
            </span>
          </div>

          {vendorBills.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No vendor bills recorded by this store yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Bill Number</th>
                    <th className="py-2.5 px-3 font-medium">Supplier</th>
                    <th className="py-2.5 px-3 font-medium">Branch</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium text-right">Total Amount</th>
                    <th className="py-2.5 px-3 font-medium text-right">Balance Due</th>
                    <th className="py-2.5 px-3 font-medium">Bill Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vendorBills.map((b) => {
                    const isPaid = b.status === "paid";
                    const isPartial = b.status === "partially_paid";
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                          {b.billNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {b.vendorName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {b.branchName || "HQ / Main Store"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              isPaid
                                ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                                : isPartial
                                ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60"
                                : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                            }`}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span className="capitalize">{b.status.replace("_", " ")}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-slate-800 dark:text-slate-200">
                          {formatMoney(b.totalAmount, currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                          {formatMoney(b.balanceDue, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {formatSafeDate(b.billDate || b.issueDate, b.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Supplier Profiles &amp; Credit Ledger
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {vendors.length} Total Registered
            </span>
          </div>

          {vendors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No vendor suppliers registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Supplier Name</th>
                    <th className="py-2.5 px-3 font-medium">Contact</th>
                    <th className="py-2.5 px-3 font-medium">Payment Terms</th>
                    <th className="py-2.5 px-3 font-medium text-right">Total Purchased</th>
                    <th className="py-2.5 px-3 font-medium text-right">Total Paid</th>
                    <th className="py-2.5 px-3 font-medium text-right">Balance Owed</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {v.name}
                        </span>
                        {v.companyName && (
                          <span className="text-[11px] text-slate-500 block">{v.companyName}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{v.phone}</span>
                        </div>
                        {v.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{v.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {v.paymentTermsDays > 0 ? `Net ${v.paymentTermsDays} Days` : "Due on receipt"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-700 dark:text-slate-300">
                        {formatMoney(v.totalPurchased, currency)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400">
                        {formatMoney(v.totalPaid, currency)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                        {formatMoney(v.totalOwed, currency)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            v.isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {v.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
