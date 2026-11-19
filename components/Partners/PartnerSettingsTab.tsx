"use client";

import React from "react";
import { CheckCircle2, Percent, Save } from "lucide-react";

export interface PartnerSettingsData {
  discountPercent: number;
  commissionPercent: number;
  commissionDurationMonths: number;
  minPayoutNgn: number;
  minPayoutUsd: number;
  partnerRegistrationOpen: boolean;
}

interface PartnerSettingsTabProps {
  settingsForm: PartnerSettingsData;
  setSettingsForm: React.Dispatch<React.SetStateAction<PartnerSettingsData>>;
  onSave: (data: Partial<PartnerSettingsData>) => void;
  isPending: boolean;
  savedMessage?: string | null;
}

export default function PartnerSettingsTab({
  settingsForm,
  setSettingsForm,
  onSave,
  isPending,
  savedMessage,
}: PartnerSettingsTabProps) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Partner Program Rates &amp; Intake Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Changes apply instantly across checkout discounts, referral tracking, and commission calculations.
        </p>
      </div>

      {/* Registration Intake Toggle */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Partner Registrations &amp; Applications Intake
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white block mt-0.5">
            Status: {settingsForm.partnerRegistrationOpen ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Open (Accepting Applications)</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-bold">Paused (Registration Stopped)</span>
            )}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
            Stop or resume taking partner applications anytime. When paused, the public join form is disabled.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextState = !settingsForm.partnerRegistrationOpen;
            setSettingsForm((prev) => ({ ...prev, partnerRegistrationOpen: nextState }));
            onSave({ partnerRegistrationOpen: nextState });
          }}
          disabled={isPending}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap ${
            settingsForm.partnerRegistrationOpen
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {settingsForm.partnerRegistrationOpen ? "Stop Taking Registrations" : "Resume Taking Registrations"}
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Buyer Discount (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={settingsForm.discountPercent}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Applied to first 3 months or 1 year (annual)</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Partner Commission Share (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={settingsForm.commissionPercent}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, commissionPercent: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Recurring cut credited to partner wallet</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Commission Duration (Months)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={settingsForm.commissionDurationMonths}
            onChange={(e) =>
              setSettingsForm((prev) => ({
                ...prev,
                commissionDurationMonths: Number(e.target.value),
              }))
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">e.g. 24 months = 2 years</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Min Payout Threshold (NGN ₦)
          </label>
          <input
            type="number"
            min="500"
            step="500"
            value={settingsForm.minPayoutNgn}
            onChange={(e) =>
              setSettingsForm((prev) => ({ ...prev, minPayoutNgn: Number(e.target.value) }))
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Min Payout Threshold (USD $)
          </label>
          <input
            type="number"
            min="5"
            step="5"
            value={settingsForm.minPayoutUsd}
            onChange={(e) =>
              setSettingsForm((prev) => ({ ...prev, minPayoutUsd: Number(e.target.value) }))
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          type="button"
          onClick={() => onSave(settingsForm)}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving changes..." : "Save Program Rates"}
        </button>
      </div>
    </div>
  );
}
