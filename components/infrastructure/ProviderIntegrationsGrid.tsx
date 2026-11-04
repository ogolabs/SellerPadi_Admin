"use client";

import React from "react";
import { MessageSquare, Mail, ShieldCheck, UserCheck } from "lucide-react";
import type { ThirdPartyIntegrationsTelemetry } from "@/lib/integrations-telemetry";

interface ProviderIntegrationsGridProps {
  integrations?: ThirdPartyIntegrationsTelemetry;
}

export function ProviderIntegrationsGrid({ integrations }: ProviderIntegrationsGridProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        Integrated Services &amp; Provider Gateways
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                    : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                }`}
              >
                {integrations?.termii.status || "unconfigured"}
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
                <span className="text-slate-500 dark:text-slate-400">Route Channel</span>
                <span className="text-slate-900 dark:text-slate-200 font-mono uppercase">
                  {integrations?.termii.channel || "generic"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Sender ID</span>
                <span className="text-slate-900 dark:text-slate-200 font-mono">
                  {integrations?.termii.senderId || "SellerPadi"}
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
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400">
            Live API Probe: Connected
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
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Email OTP Dispatch</span>
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  integrations?.zeptoMail.status === "operational"
                    ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                    : integrations?.zeptoMail.status === "credit_exhausted"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                    : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
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
                  className="text-slate-900 dark:text-slate-200 font-mono truncate max-w-30"
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
          <div
            className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 truncate"
            title={integrations?.zeptoMail.creditExhaustedNotice || integrations?.zeptoMail.error}
          >
            {integrations?.zeptoMail.status === "credit_exhausted"
              ? integrations?.zeptoMail.creditExhaustedNotice || "Credit limit reached"
              : integrations?.zeptoMail.status === "error"
              ? integrations?.zeptoMail.error || "Delivery error"
              : "Ready for transactions"}
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
          <div
            className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between"
            title={integrations?.diditKyc.features || integrations?.diditKyc.detail || "Didit Free Tier: $10/mo credit (~30 checks at $0.33/check)"}
          >
            <span className="truncate">
              Status: {integrations?.diditKyc.workflowStatus ? `${integrations.diditKyc.workflowStatus} (Active)` : "Connected"}
            </span>
            <span className="font-mono text-slate-400 dark:text-slate-500">
              Bal: {integrations?.diditKyc.balance || "$0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

