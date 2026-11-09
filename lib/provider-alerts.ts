import { connectAdminDb, AdminSystemConfig } from "@/lib/db";

export interface IProviderAlertsSettings {
  termiiMinBalanceNgn: number;
  relayerMinBalanceNative: number;
  diditMinChecksRemaining: number;
  alertWebhookUrl?: string | null;
  alertEmailRecipient?: string | null;
  lastAlertDispatchedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export const DEFAULT_ALERTS_CONFIG: IProviderAlertsSettings = {
  termiiMinBalanceNgn: 500, // ~125 SMS units at ₦4/SMS
  relayerMinBalanceNative: 0.5, // 0.5 AVAX / ETN
  diditMinChecksRemaining: 10, // 10 KYC checks remaining
  alertWebhookUrl: null,
  alertEmailRecipient: null,
  lastAlertDispatchedAt: null,
};

const CONFIG_KEY = "provider_alerts_config";

/** In-memory cooldown tracker to avoid spamming webhooks on frequent telemetry polls */
let lastWebhookDispatchedTimestamp = 0;
const WEBHOOK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between automated alert pings

export async function getProviderAlertsConfig(): Promise<IProviderAlertsSettings> {
  try {
    await connectAdminDb();
    const doc = await AdminSystemConfig.findOne({ key: CONFIG_KEY }).lean();

    if (!doc) {
      return {
        ...DEFAULT_ALERTS_CONFIG,
        alertWebhookUrl: process.env.PROVIDER_ALERT_WEBHOOK_URL?.trim() || null,
        alertEmailRecipient: process.env.PROVIDER_ALERT_EMAIL?.trim() || null,
      };
    }

    return {
      termiiMinBalanceNgn:
        typeof doc.termiiMinBalanceNgn === "number" ? doc.termiiMinBalanceNgn : DEFAULT_ALERTS_CONFIG.termiiMinBalanceNgn,
      relayerMinBalanceNative:
        typeof doc.relayerMinBalanceNative === "number"
          ? doc.relayerMinBalanceNative
          : DEFAULT_ALERTS_CONFIG.relayerMinBalanceNative,
      diditMinChecksRemaining:
        typeof doc.diditMinChecksRemaining === "number"
          ? doc.diditMinChecksRemaining
          : DEFAULT_ALERTS_CONFIG.diditMinChecksRemaining,
      alertWebhookUrl: doc.alertWebhookUrl || process.env.PROVIDER_ALERT_WEBHOOK_URL?.trim() || null,
      alertEmailRecipient: doc.alertEmailRecipient || process.env.PROVIDER_ALERT_EMAIL?.trim() || null,
      lastAlertDispatchedAt: doc.lastAlertDispatchedAt ? doc.lastAlertDispatchedAt.toISOString() : null,
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
      updatedBy: doc.updatedBy || null,
    };
  } catch (err) {
    console.error("[getProviderAlertsConfig] Error fetching config:", err);
    return DEFAULT_ALERTS_CONFIG;
  }
}

export async function updateProviderAlertsConfig(
  updates: Partial<IProviderAlertsSettings>,
  updatedBy: string
): Promise<IProviderAlertsSettings> {
  await connectAdminDb();

  const doc = await AdminSystemConfig.findOneAndUpdate(
    { key: CONFIG_KEY },
    {
      $set: {
        ...(typeof updates.termiiMinBalanceNgn === "number" && { termiiMinBalanceNgn: updates.termiiMinBalanceNgn }),
        ...(typeof updates.relayerMinBalanceNative === "number" && {
          relayerMinBalanceNative: updates.relayerMinBalanceNative,
        }),
        ...(typeof updates.diditMinChecksRemaining === "number" && {
          diditMinChecksRemaining: updates.diditMinChecksRemaining,
        }),
        ...(updates.alertWebhookUrl !== undefined && { alertWebhookUrl: updates.alertWebhookUrl }),
        ...(updates.alertEmailRecipient !== undefined && { alertEmailRecipient: updates.alertEmailRecipient }),
        updatedBy,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    termiiMinBalanceNgn: doc.termiiMinBalanceNgn ?? DEFAULT_ALERTS_CONFIG.termiiMinBalanceNgn,
    relayerMinBalanceNative: doc.relayerMinBalanceNative ?? DEFAULT_ALERTS_CONFIG.relayerMinBalanceNative,
    diditMinChecksRemaining: doc.diditMinChecksRemaining ?? DEFAULT_ALERTS_CONFIG.diditMinChecksRemaining,
    alertWebhookUrl: doc.alertWebhookUrl ?? null,
    alertEmailRecipient: doc.alertEmailRecipient ?? null,
    lastAlertDispatchedAt: doc.lastAlertDispatchedAt ? doc.lastAlertDispatchedAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    updatedBy: doc.updatedBy ?? updatedBy,
  };
}

export interface ProviderAlertPayload {
  serviceName: string;
  level: "warning" | "critical";
  message: string;
  currentValue?: string | number;
  threshold?: string | number;
  rechargeUrl?: string;
}

/**
 * Dispatches an alert to configured webhook URL (Discord / Slack / generic).
 * Deduplicates automated triggers by 60-minute window.
 */
export async function maybeDispatchProviderAlert(
  alert: ProviderAlertPayload,
  force = false
): Promise<{ dispatched: boolean; reason?: string }> {
  const now = Date.now();
  if (!force && now - lastWebhookDispatchedTimestamp < WEBHOOK_COOLDOWN_MS) {
    return { dispatched: false, reason: "Cooldown active" };
  }

  const config = await getProviderAlertsConfig();
  const webhookUrl = config.alertWebhookUrl;

  if (!webhookUrl) {
    return { dispatched: false, reason: "No webhook URL configured" };
  }

  try {
    const payload = {
      title: `[SellerPadi Operations] ${alert.level === "critical" ? "🚨 CRITICAL ALERT" : "⚠️ WARNING"}`,
      service: alert.serviceName,
      message: alert.message,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      rechargeUrl: alert.rechargeUrl,
      timestamp: new Date().toISOString(),
      // Slack / Discord compatibility formatting
      text: `*${alert.serviceName}* ${alert.level === "critical" ? "🚨 Critical" : "⚠️ Warning"}: ${alert.message} (Current: ${alert.currentValue ?? "N/A"}, Threshold: ${alert.threshold ?? "N/A"})`,
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Webhook endpoint returned HTTP ${res.status}`);
    }

    lastWebhookDispatchedTimestamp = now;

    // Record last dispatched timestamp in database
    await AdminSystemConfig.updateOne(
      { key: CONFIG_KEY },
      { $set: { lastAlertDispatchedAt: new Date() } }
    ).catch(() => {});

    return { dispatched: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Webhook dispatch failed";
    console.error("[maybeDispatchProviderAlert] Dispatch failed:", errorMsg);
    return { dispatched: false, reason: errorMsg };
  }
}

