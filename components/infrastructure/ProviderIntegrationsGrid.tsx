"use client";

import React from "react";
import { MessageSquare, Mail, ShieldCheck, UserCheck, Bell, Clock, ExternalLink, AlertCircle } from "lucide-react";
import type { ThirdPartyIntegrationsTelemetry } from "@/lib/integrations-telemetry";

interface ProviderIntegrationsGridProps {
  integrations?: ThirdPartyIntegrationsTelemetry;
}

export function ProviderIntegrationsGrid({ integrations }: ProviderIntegrationsGridProps) {
  const isTermiiLow = integrations?.termii.status === "low_balance";
  const isZeptoExhausted = integrations?.zeptoMail.status === "credit_exhausted";
  const hasProviderIssue = isTermiiLow || isZeptoExhausted || integrations?.termii.status === "error";

  return (
    <div className="space-y-4">
      {/* High-visibility provider operational banner if any provider requires top-up */}
      {hasProviderIssue && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-[11px] sm:text-xs leading-relaxed">
              <span className="font-semibold">Provider Attention Required: </span>
              {isTermiiLow && (
                <span>
                  Termii SMS balance ({integrations?.termii.balance ?? 0} NGN, ~{integrations?.termii.estimatedSmsRemaining ?? 0} SMS remaining) is below the configured safety threshold.
                </span>
              )}
              {isZeptoExhausted && (
                <span className={isTermiiLow ? "ml-1" : ""}>
                  ZeptoMail email dispatch credits are exhausted. Merchant statement dispatches are currently paused.
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
            {isTermiiLow && (
              <a
                href="https://accounts.termii.com/#/wallet"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[10px] sm:text-[11px] transition-colors"
              >
                <span>Recharge Termii</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {isZeptoExhausted && (
              <a
                href="https://mailadmin.zoho.com/cpanel/index.do"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[10px] sm:text-[11px] transition-colors"
              >
                <span>Recharge ZeptoMail</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Integrated Services &amp; Provider Gateways
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Termii SMS Gateway */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Termii SMS</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Phone OTP Gate</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.termii.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : integrations?.termii.status === "low_balance"
                      ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {integrations?.termii.status === "low_balance"
                    ? "low balance"
                    : integrations?.termii.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Account Balance</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">
                    {integrations?.termii.balance !== undefined
                      ? `${integrations.termii.balance} ${integrations.termii.currency || "NGN"}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Estimated Capacity</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {integrations?.termii.estimatedSmsRemaining !== undefined
                      ? `~${integrations.termii.estimatedSmsRemaining} SMS (~₦4/SMS)`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Safety Threshold</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.termii.thresholdNgn !== undefined
                      ? `₦${integrations.termii.thresholdNgn} NGN`
                      : "₦500 NGN"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Route / Channel</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono uppercase">
                    {integrations?.termii.channel || "generic"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Latency</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.termii.latencyMs !== undefined ? `${integrations.termii.latencyMs} ms` : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
              <span className="text-slate-500 dark:text-slate-400">Live API Probe: Connected</span>
              <a
                href="https://accounts.termii.com/#/wallet"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Recharge</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* ZeptoMail */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">ZeptoMail</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Email OTP &amp; Reports</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.zeptoMail.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : integrations?.zeptoMail.status === "credit_exhausted"
                      ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {integrations?.zeptoMail.status === "credit_exhausted"
                    ? "Credit Exhausted"
                    : integrations?.zeptoMail.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Token Status</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.zeptoMail.isTokenConfigured ? "Configured" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Sender Email</span>
                  <span
                    className="text-slate-900 dark:text-slate-200 font-mono truncate max-w-35"
                    title={integrations?.zeptoMail.senderEmail}
                  >
                    {integrations?.zeptoMail.senderEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Fallback Gate</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">Google Sign-In</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
              <span
                className="text-slate-500 dark:text-slate-400 truncate max-w-40"
                title={integrations?.zeptoMail.creditExhaustedNotice || integrations?.zeptoMail.error}
              >
                {integrations?.zeptoMail.status === "credit_exhausted"
                  ? "Credit limit reached"
                  : integrations?.zeptoMail.status === "error"
                  ? "Delivery error"
                  : "Ready for transactions"}
              </span>
              <a
                href="https://mailadmin.zoho.com/cpanel/index.do"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Recharge</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Google Identity Services */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Google Identity</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">OAuth &amp; JWKS Certs</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.googleIdentity.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {integrations?.googleIdentity.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Client ID</span>
                  <span
                    className="text-slate-900 dark:text-slate-200 font-mono truncate max-w-30"
                    title={integrations?.googleIdentity.clientIdMasked}
                  >
                    {integrations?.googleIdentity.clientIdMasked}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">JWKS Keyset</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.googleIdentity.keyCount
                      ? `${integrations.googleIdentity.keyCount} Public Keys`
                      : "Fresh"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Latency</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.googleIdentity.latencyMs !== undefined
                      ? `${integrations.googleIdentity.latencyMs} ms`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400">
              Clock Tolerance: 15 seconds
            </div>
          </div>

          {/* Didit v3 KYC Verification */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Didit v3 KYC</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Identity ($10/mo Free Credit)</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.diditKyc.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {integrations?.diditKyc.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Checks (Month)</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">
                    {integrations?.diditKyc.monthlyChecksUsed ?? 0} / {integrations?.diditKyc.monthlyCheckLimit ?? 30} used
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {integrations?.diditKyc.monthlyChecksRemaining ?? 30} left (~$10/mo credit)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Verified / Pending</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.diditKyc.verifiedMerchants ?? 0} / {integrations?.diditKyc.pendingMerchants ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Unit Rate</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.diditKyc.unitCost || "$0.33 USD"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
              <span className="truncate max-w-45 text-slate-500 dark:text-slate-400">
                {integrations?.diditKyc.workflowStatus ? `${integrations.diditKyc.workflowStatus} (Active)` : "Connected"}
              </span>
              <a
                href="https://admin.didit.me"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Console</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Web Push (VAPID) Gateway */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Web Push</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">VAPID Push Service</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.webPush.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {integrations?.webPush.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">VAPID Keys</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.webPush.isVapidConfigured ? "Configured" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Public Key</span>
                  <span
                    className="text-slate-900 dark:text-slate-200 font-mono truncate max-w-30"
                    title={integrations?.webPush.publicKeyMasked}
                  >
                    {integrations?.webPush.publicKeyMasked}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Registered Devices</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono font-medium">
                    {integrations?.webPush.totalSubscribers ?? 0} endpoints
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Protocol</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">RFC 8292 Standard</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400">
              Real-time sales &amp; dispute alerts
            </div>
          </div>

          {/* Automated Cron Sweeps */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Cron Automation</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Automated Sweeps</span>
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    integrations?.cron.status === "operational"
                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {integrations?.cron.status || "unconfigured"}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">CRON_SECRET</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {integrations?.cron.hasCronSecret ? "Configured" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">PDF Reports</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">23:00 UTC (Daily)</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Subscription Alerts</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">08:00 UTC (Daily)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Scheduled Jobs</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">2 Active Sweeps</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400">
              ZeptoMail PDF &amp; Renewal Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
