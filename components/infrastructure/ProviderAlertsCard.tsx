"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Save,
  RotateCcw,
  Shield,
  MessageSquare,
  Cpu,
} from "lucide-react";
import type { IProviderAlertsSettings } from "@/lib/provider-alerts";
import { QUERY_TIMINGS } from "@/lib/query-config";

export function ProviderAlertsCard() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery<IProviderAlertsSettings>({
    queryKey: ["admin-provider-alerts-config"],
    queryFn: async () => {
      const res = await fetch("/api/infrastructure/alerts-config");
      if (!res.ok) throw new Error("Failed to load provider alert configuration");
      return res.json();
    },
    staleTime: QUERY_TIMINGS.CONFIG_STALE_MS,
  });

  const [termiiThreshold, setTermiiThreshold] = useState<number>(500);
  const [relayerThreshold, setRelayerThreshold] = useState<number>(0.5);
  const [diditThreshold, setDiditThreshold] = useState<number>(10);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [emailRecipient, setEmailRecipient] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (config) {
      setTermiiThreshold(config.termiiMinBalanceNgn ?? 500);
      setRelayerThreshold(config.relayerMinBalanceNative ?? 0.5);
      setDiditThreshold(config.diditMinChecksRemaining ?? 10);
      setWebhookUrl(config.alertWebhookUrl ?? "");
      setEmailRecipient(config.alertEmailRecipient ?? "");
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<IProviderAlertsSettings>) => {
      const res = await fetch("/api/infrastructure/alerts-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update configuration");
      return data;
    },
    onSuccess: () => {
      setStatusMessage({ type: "success", text: "Provider alert thresholds saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-provider-alerts-config"] });
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure"] });
      setTimeout(() => setStatusMessage(null), 4000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error saving thresholds";
      setStatusMessage({ type: "error", text: msg });
    },
  });

  const testPingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/infrastructure/alerts-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch test ping");
      return data;
    },
    onSuccess: (data: { message?: string }) => {
      setStatusMessage({
        type: "success",
        text: data.message || "Test alert ping delivered to webhook.",
      });
      setTimeout(() => setStatusMessage(null), 5000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to deliver test ping";
      setStatusMessage({ type: "error", text: msg });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    saveMutation.mutate({
      termiiMinBalanceNgn: Number(termiiThreshold),
      relayerMinBalanceNative: Number(relayerThreshold),
      diditMinChecksRemaining: Number(diditThreshold),
      alertWebhookUrl: webhookUrl.trim() || null,
      alertEmailRecipient: emailRecipient.trim() || null,
    });
  };

  const handleResetDefaults = () => {
    setTermiiThreshold(500);
    setRelayerThreshold(0.5);
    setDiditThreshold(10);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center justify-center min-h-40">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading provider guardrail configurations...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4" />
          <span>Could not retrieve provider guardrails.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Provider Guardrails &amp; Low-Balance Alerts
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Configure proactive warning margins and webhook dispatch triggers for 3rd-party services.
            </p>
          </div>
        </div>

        {config?.lastAlertDispatchedAt && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Last alert: {new Date(config.lastAlertDispatchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="pt-4 space-y-5">
        {/* Threshold Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Termii SMS Safety Threshold */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Termii SMS Margin</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">~₦4/SMS</span>
            </div>
            <div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₦</span>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={50}
                  value={termiiThreshold}
                  onChange={(e) => setTermiiThreshold(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-6 pr-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {[200, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTermiiThreshold(preset)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      termiiThreshold === preset
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    ₦{preset}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Triggers when capacity drops below ~{Math.floor(termiiThreshold / 4)} SMS units.
            </p>
          </div>

          {/* Relayer Native Token Margin */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Relayer Gas Wallet</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Native</span>
            </div>
            <div>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={relayerThreshold}
                onChange={(e) => setRelayerThreshold(Math.max(0, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {[0.2, 0.5, 1.0, 2.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRelayerThreshold(preset)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      relayerThreshold === preset
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Alerts if anchor relayer balance drops below {relayerThreshold} tokens.
            </p>
          </div>

          {/* Didit KYC Checks Margin */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Didit KYC Allowance</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Checks</span>
            </div>
            <div>
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={diditThreshold}
                onChange={(e) => setDiditThreshold(Math.max(0, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {[5, 10, 15, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDiditThreshold(preset)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      diditThreshold === preset
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Alerts if remaining monthly free tier checks drop under {diditThreshold}.
            </p>
          </div>
        </div>

        {/* Webhook & Notification Routing */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Incident Webhook URL (Slack / Discord / Webhook)
              </label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Alert Email Recipient (Optional)
              </label>
              <input
                type="email"
                placeholder="ops-alerts@sellerpadi.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Notification Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] sm:text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center sm:justify-start gap-1.5 order-2 sm:order-1 cursor-pointer py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Recommended Defaults</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              disabled={!webhookUrl.trim() || testPingMutation.isPending}
              onClick={() => testPingMutation.mutate()}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {testPingMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Test Ping</span>
            </button>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Guardrails</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
