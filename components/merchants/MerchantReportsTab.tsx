"use client";

import React from "react";
import {
  Mail,
  Bell,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Smartphone,
} from "lucide-react";

export interface ReportPreferencesData {
  enabled: boolean;
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  yearly: boolean;
  includeSales: boolean;
  includeInventory: boolean;
}

export interface ReportsSentData {
  lastDailyReport?: string | null;
  lastWeeklyReport?: string | null;
  lastMonthlyReport?: string | null;
  lastYearlyReport?: string | null;
}

interface MerchantReportsTabProps {
  reportPreferences?: ReportPreferencesData | null;
  reportsSent?: ReportsSentData | null;
  pushSubscriptionsCount?: number;
  plan: string;
  businessEmail?: string | null;
}

export function MerchantReportsTab({
  reportPreferences,
  reportsSent,
  pushSubscriptionsCount = 0,
  plan,
  businessEmail,
}: MerchantReportsTabProps) {
  const isPaidPlan = plan.toLowerCase() !== "free";
  const isReportMasterEnabled = Boolean(reportPreferences?.enabled);

  const cadences = [
    {
      id: "daily",
      label: "Daily Statement PDF",
      schedule: "Every night at 23:00 UTC",
      active: Boolean(reportPreferences?.daily),
      lastSent: reportsSent?.lastDailyReport,
    },
    {
      id: "weekly",
      label: "Weekly Executive PDF",
      schedule: "Sunday evenings",
      active: Boolean(reportPreferences?.weekly),
      lastSent: reportsSent?.lastWeeklyReport,
    },
    {
      id: "monthly",
      label: "Monthly Financial PDF",
      schedule: "Last calendar day of the month",
      active: Boolean(reportPreferences?.monthly),
      lastSent: reportsSent?.lastMonthlyReport,
    },
    {
      id: "yearly",
      label: "Yearly Audit PDF",
      schedule: "December 31st at 23:00 UTC",
      active: Boolean(reportPreferences?.yearly),
      lastSent: reportsSent?.lastYearlyReport,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Email Reporting Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Email Reports Status</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${
                isPaidPlan && isReportMasterEnabled
                  ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {isPaidPlan && isReportMasterEnabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Disabled
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block truncate">
            {businessEmail ? `Target: ${businessEmail}` : "No email configured"}
          </span>
        </div>

        {/* Real-time Web Push Devices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Web Push Alert Devices</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {pushSubscriptionsCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {pushSubscriptionsCount === 1 ? "1 active browser / device" : `${pushSubscriptionsCount} active browsers / devices`}
          </span>
        </div>

        {/* Content Modules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Included Documents</span>
          </div>
          <div className="text-xs space-y-1 font-medium text-slate-800 dark:text-slate-200 mt-1">
            <div className="flex items-center gap-1.5">
              {reportPreferences?.includeSales !== false ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Official Sales Statement</span>
            </div>
            <div className="flex items-center gap-1.5">
              {reportPreferences?.includeInventory !== false ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Inventory Stock Position</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cadence Schedule Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Automated PDF Delivery Cadences &amp; Audit Timestamps
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated vector PDF statements compiled from verified sales &amp; stock records.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium">
            ZeptoMail Attached
          </span>
        </div>

        {!isPaidPlan ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Automated PDF reporting is an exclusive benefit of paid subscription tiers. Merchant is currently on the Free plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cadences.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {c.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isReportMasterEnabled && c.active
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {isReportMasterEnabled && c.active ? "Enabled" : "Muted"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mb-2">{c.schedule}</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Last Sent:</span>
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {c.lastSent ? new Date(c.lastSent).toLocaleString() : "Never (Pending first sweep)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Web Push Subscriptions Detail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Web Push Real-Time Notifications Channel
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Instant alerts dispatched via VAPID standard web push for live counter sales, doorstep package disputes, and low stock warnings.
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-700 dark:text-slate-300">
          <div>
            Registered Endpoints: <strong className="text-slate-900 dark:text-white">{pushSubscriptionsCount}</strong>
          </div>
          <div>•</div>
          <div>
            Channel Status: <strong className="text-emerald-600 dark:text-emerald-400">{pushSubscriptionsCount > 0 ? "Listening" : "No devices subscribed"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
