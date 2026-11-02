"use client";

import React from "react";
import { History, ShieldAlert, ShieldCheck, Clock, User } from "lucide-react";

export interface AuditLogItem {
  id: string;
  adminEmail: string;
  action: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface MerchantAuditTrailTabProps {
  auditLogs: AuditLogItem[];
}

export function MerchantAuditTrailTab({ auditLogs }: MerchantAuditTrailTabProps) {
  if (auditLogs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs">
        <History className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Administrative Actions Logged</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No suspension toggles, manual verifications, or administrative overrides have been performed on this account.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Administrative Audit History ({auditLogs.length})
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          MongoDB: admin_audit_logs
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {auditLogs.map((log) => {
          const isSuspension = log.action.includes("suspend");
          const isVerification = log.action.includes("verification");

          return (
            <div
              key={log.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSuspension
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40"
                      : isVerification
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                      : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40"
                  }`}
                >
                  {isSuspension ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono">
                      {log.action}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{log.adminEmail}</span>
                    </span>
                  </div>

                  {log.details && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {typeof log.details.reason === "string" && log.details.reason
                        ? `Reason: ${log.details.reason}`
                        : typeof log.details.newStatus === "string"
                        ? `Status changed to: ${log.details.newStatus}`
                        : JSON.stringify(log.details)}
                    </p>
                  )}

                  {log.ipAddress && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block mt-1">
                      Source IP: {log.ipAddress}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 sm:self-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

