import { AdminUser, AdminPushSubscription } from "@/lib/db";
import { getZeptoMailDispatchState } from "@/lib/email";
import { getProviderAlertsConfig, maybeDispatchProviderAlert } from "@/lib/provider-alerts";

export interface TermiiTelemetry {
  status: "operational" | "low_balance" | "unconfigured" | "error";
  balance?: number;
  currency?: string;
  channel: string;
  senderId: string;
  latencyMs?: number;
  error?: string;
  estimatedSmsRemaining?: number;
  thresholdNgn?: number;
}

export interface ZeptoMailTelemetry {
  status: "operational" | "credit_exhausted" | "unconfigured" | "error";
  senderEmail: string;
  senderName: string;
  isTokenConfigured: boolean;
  creditExhaustedNotice?: string;
  error?: string;
  lastDispatchedAt?: string;
  lastFailedAt?: string;
}

export interface GoogleIdentityTelemetry {
  status: "operational" | "unconfigured" | "error";
  clientIdMasked: string;
  jwksFresh: boolean;
  keyCount?: number;
  latencyMs?: number;
  error?: string;
}

export interface DiditKycTelemetry {
  status: "operational" | "unconfigured" | "error";
  workflowIdMasked: string;
  workflowLabel?: string;
  workflowStatus?: string;
  features?: string;
  balance?: string;
  monthlyCreditAllowance?: string;
  unitCost?: string;
  monthlyChecksUsed: number;
  monthlyCheckLimit: number;
  monthlyChecksRemaining: number;
  verifiedMerchants: number;
  pendingMerchants: number;
  declinedMerchants: number;
  unverifiedMerchants: number;
  totalSubmissions: number;
  latencyMs?: number;
  detail?: string;
  error?: string;
}

export interface WebPushTelemetry {
  status: "operational" | "unconfigured";
  isVapidConfigured: boolean;
  publicKeyMasked: string;
  totalSubscribers: number;
}

export interface CronTelemetry {
  status: "operational" | "unconfigured";
  hasCronSecret: boolean;
  jobs: Array<{ name: string; schedule: string; endpoint: string }>;
}

export interface ThirdPartyIntegrationsTelemetry {
  termii: TermiiTelemetry;
  zeptoMail: ZeptoMailTelemetry;
  googleIdentity: GoogleIdentityTelemetry;
  diditKyc: DiditKycTelemetry;
  webPush: WebPushTelemetry;
  cron: CronTelemetry;
  alertsConfig?: {
    termiiMinBalanceNgn: number;
    relayerMinBalanceNative: number;
    diditMinChecksRemaining: number;
    hasWebhook: boolean;
    hasEmail: boolean;
    lastAlertDispatchedAt?: string | null;
  };
}

/**
 * Probes Termii SMS Token API for account balance & channel status.
 */
export async function checkTermiiStatus(minBalanceThresholdNgn = 500): Promise<TermiiTelemetry> {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const rawBaseUrl = process.env.TERMII_BASE_URL?.trim() || "https://v4.api.termii.com";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const senderId = process.env.TERMII_SENDER_ID?.trim() || "SellerPadi";
  const channel = process.env.TERMII_CHANNEL?.trim().toLowerCase() === "dnd" ? "dnd" : "generic";

  if (!apiKey) {
    return {
      status: "unconfigured",
      channel,
      senderId,
      error: "TERMII_API_KEY is not defined in environment.",
    };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/get-balance?api_key=${encodeURIComponent(apiKey)}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.ok && typeof data.balance === "number") {
      const balance = data.balance;
      const currency = typeof data.currency === "string" ? data.currency : "NGN";
      const status = balance < minBalanceThresholdNgn ? "low_balance" : "operational";
      const estimatedSmsRemaining = Math.max(0, Math.floor(balance / 4.0)); // ~₦4.00 per Termii SMS

      return {
        status,
        balance,
        currency,
        channel,
        senderId,
        latencyMs,
        estimatedSmsRemaining,
        thresholdNgn: minBalanceThresholdNgn,
      };
    }

    const rawError = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
    return {
      status: "error",
      channel,
      senderId,
      latencyMs,
      error: rawError,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Connection timeout";
    return {
      status: "error",
      channel,
      senderId,
      latencyMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Checks ZeptoMail transactional email configuration & quota state.
 */
export function checkZeptoMailStatus(): ZeptoMailTelemetry {
  const token = process.env.ZEPTOMAIL_SEND_TOKEN?.trim() || "";
  const senderEmail = process.env.ZEPTOMAIL_FROM_EMAIL?.trim() || "no-reply@sellerpadi.com";
  const senderName = process.env.ZEPTOMAIL_FROM_NAME?.trim() || "SellerPadi Mission Control";

  if (!token) {
    return {
      status: "unconfigured",
      senderEmail,
      senderName,
      isTokenConfigured: false,
      error: "ZEPTOMAIL_SEND_TOKEN is not defined in environment.",
    };
  }

  const dispatchState = getZeptoMailDispatchState();

  if (dispatchState.isCreditExhausted) {
    return {
      status: "credit_exhausted",
      senderEmail,
      senderName,
      isTokenConfigured: true,
      creditExhaustedNotice:
        dispatchState.lastError ||
        "Email delivery credits exhausted (LE_102 / 429). Google Sign-In is active as primary authentication gate.",
      lastFailedAt: dispatchState.lastFailedAt,
    };
  }

  if (dispatchState.lastError) {
    return {
      status: "error",
      senderEmail,
      senderName,
      isTokenConfigured: true,
      error: dispatchState.lastError,
      lastFailedAt: dispatchState.lastFailedAt,
    };
  }

  return {
    status: "operational",
    senderEmail,
    senderName,
    isTokenConfigured: true,
    lastDispatchedAt: dispatchState.lastDispatchedAt,
  };
}

/**
 * Probes Google Identity Services (GIS) JWKS cryptographic endpoint for key validity & latency.
 */
export async function checkGoogleIdentityStatus(): Promise<GoogleIdentityTelemetry> {
  const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const clientIdMasked =
    rawClientId.length > 16
      ? `${rawClientId.slice(0, 12)}...apps.googleusercontent.com`
      : rawClientId || "unconfigured";

  if (!rawClientId) {
    return {
      status: "unconfigured",
      clientIdMasked,
      jwksFresh: false,
      error: "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.",
    };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const data = (await res.json().catch(() => ({}))) as { keys?: unknown[] };

    if (res.ok && Array.isArray(data.keys) && data.keys.length > 0) {
      return {
        status: "operational",
        clientIdMasked,
        jwksFresh: true,
        keyCount: data.keys.length,
        latencyMs,
      };
    }

    return {
      status: "error",
      clientIdMasked,
      jwksFresh: false,
      latencyMs,
      error: `Google JWKS returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Connection timeout";
    return {
      status: "error",
      clientIdMasked,
      jwksFresh: false,
      latencyMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Aggregates Didit KYC statistics from MongoDB & validates the live workflow & billing status via Didit Management API.
 */
export async function checkDiditKycStatus(): Promise<DiditKycTelemetry> {
  const apiKey = process.env.DIDIT_API_KEY?.trim() || "";
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim() || "";
  const workflowIdMasked =
    workflowId.length > 12 ? `${workflowId.slice(0, 8)}...${workflowId.slice(-4)}` : workflowId || "unconfigured";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Database verification metrics & current calendar month check usage
  const [
    verifiedCount,
    pendingCount,
    declinedCount,
    totalMerchants,
    monthlyChecksUsedDb,
  ] = await Promise.all([
    AdminUser.countDocuments({ "verification.status": "verified" }),
    AdminUser.countDocuments({ "verification.status": "pending" }),
    AdminUser.countDocuments({ "verification.status": "rejected" }),
    AdminUser.countDocuments({
      $or: [{ role: "merchant" }, { hasMerchantProfile: true }, { companyName: { $exists: true, $ne: null } }],
    }),
    AdminUser.countDocuments({
      "verification.provider": "didit",
      $or: [
        { "verification.verifiedAt": { $gte: startOfMonth } },
        {
          "verification.status": { $in: ["verified", "pending", "rejected"] },
          updatedAt: { $gte: startOfMonth },
        },
      ],
    }),
  ]);

  const totalSubmissions = verifiedCount + pendingCount + declinedCount;
  const unverifiedMerchants = Math.max(0, totalMerchants - verifiedCount);

  // Configurable monthly check allowance (defaults to 30 on Didit developer free tier, based on the $10/mo credit allowance at $0.33/check)
  const configuredLimit = parseInt(process.env.DIDIT_MONTHLY_CHECK_LIMIT || "", 10);
  const monthlyCheckLimit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 30;
  const monthlyChecksUsed = monthlyChecksUsedDb;
  const monthlyChecksRemaining = Math.max(0, monthlyCheckLimit - monthlyChecksUsed);
  const creditAllowance = process.env.DIDIT_MONTHLY_CREDIT_ALLOWANCE?.trim() || "$10.00";

  if (!apiKey || !workflowId) {
    return {
      status: "unconfigured",
      workflowIdMasked,
      monthlyCreditAllowance: creditAllowance,
      monthlyChecksUsed,
      monthlyCheckLimit,
      monthlyChecksRemaining,
      verifiedMerchants: verifiedCount,
      pendingMerchants: pendingCount,
      declinedMerchants: declinedCount,
      unverifiedMerchants,
      totalSubmissions,
      error: "DIDIT_API_KEY or DIDIT_WORKFLOW_ID is not configured.",
    };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    // Concurrently fetch the specific published workflow and account billing balance
    const [workflowRes, balanceRes] = await Promise.all([
      fetch(`https://verification.didit.me/v3/workflows/${encodeURIComponent(workflowId)}/`, {
        method: "GET",
        signal: controller.signal,
        headers: { "x-api-key": apiKey, Accept: "application/json" },
      }),
      fetch("https://verification.didit.me/v3/billing/balance/", {
        method: "GET",
        signal: controller.signal,
        headers: { "x-api-key": apiKey, Accept: "application/json" },
      }),
    ]);
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (workflowRes.status === 401 || workflowRes.status === 403) {
      return {
        status: "error",
        workflowIdMasked,
        monthlyChecksUsed,
        monthlyCheckLimit,
        monthlyChecksRemaining,
        verifiedMerchants: verifiedCount,
        pendingMerchants: pendingCount,
        declinedMerchants: declinedCount,
        unverifiedMerchants,
        totalSubmissions,
        latencyMs,
        error: "Didit API authorization failed (invalid API key).",
      };
    }

    if (!workflowRes.ok) {
      return {
        status: "error",
        workflowIdMasked,
        monthlyChecksUsed,
        monthlyCheckLimit,
        monthlyChecksRemaining,
        verifiedMerchants: verifiedCount,
        pendingMerchants: pendingCount,
        declinedMerchants: declinedCount,
        unverifiedMerchants,
        totalSubmissions,
        latencyMs,
        error: `Workflow returned HTTP ${workflowRes.status}`,
      };
    }

    const workflowData = (await workflowRes.json().catch(() => ({}))) as {
      workflow_label?: string;
      status?: string;
      features?: string;
      total_price?: number;
      price_currency?: string;
    };

    let balanceStr = "$0.00";
    if (balanceRes.ok) {
      const balanceData = (await balanceRes.json().catch(() => ({}))) as { balance?: string };
      if (typeof balanceData.balance === "string") {
        const num = parseFloat(balanceData.balance);
        balanceStr = `$${num.toFixed(2)}`;
      }
    }

    const workflowLabel = workflowData.workflow_label || "Compliance workflow";
    const workflowStatus = workflowData.status || "published";
    const features = workflowData.features || "ID + Liveness + Face Match + IP/Device ($0.33/check)";
    const totalPrice = typeof workflowData.total_price === "number" ? workflowData.total_price : null;
    const currency = workflowData.price_currency || "USD";
    const unitCost = totalPrice !== null ? `$${totalPrice.toFixed(2)} ${currency}` : "$0.33 USD";

    return {
      status: "operational",
      workflowIdMasked,
      workflowLabel,
      workflowStatus,
      features,
      balance: balanceStr,
      monthlyCreditAllowance: creditAllowance,
      unitCost,
      monthlyChecksUsed,
      monthlyCheckLimit,
      monthlyChecksRemaining,
      verifiedMerchants: verifiedCount,
      pendingMerchants: pendingCount,
      declinedMerchants: declinedCount,
      unverifiedMerchants,
      totalSubmissions,
      latencyMs,
      detail: `${workflowLabel} (${workflowStatus})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Connection timeout";
    return {
      status: "error",
      workflowIdMasked,
      monthlyChecksUsed,
      monthlyCheckLimit,
      monthlyChecksRemaining,
      verifiedMerchants: verifiedCount,
      pendingMerchants: pendingCount,
      declinedMerchants: declinedCount,
      unverifiedMerchants,
      totalSubmissions,
      latencyMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

export async function checkWebPushStatus(): Promise<WebPushTelemetry> {
  const pubKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim();
  const privKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const isVapidConfigured = Boolean(pubKey && privKey);
  const totalSubscribers = await AdminPushSubscription.countDocuments().catch(() => 0);

  return {
    status: isVapidConfigured ? "operational" : "unconfigured",
    isVapidConfigured,
    publicKeyMasked: pubKey ? `${pubKey.slice(0, 8)}...${pubKey.slice(-6)}` : "Missing",
    totalSubscribers,
  };
}

export function checkCronStatus(): CronTelemetry {
  const hasCronSecret = Boolean((process.env.CRON_SECRET || "").trim());
  return {
    status: hasCronSecret ? "operational" : "unconfigured",
    hasCronSecret,
    jobs: [
      { name: "Merkle Batch Anchor", schedule: "Every 60s / On-demand", endpoint: "/api/cron/batch-anchor" },
      { name: "Merchant Reports PDF", schedule: "Daily at 23:00 UTC", endpoint: "/api/cron/merchant-reports" },
      { name: "Subscription Reminders", schedule: "Daily at 08:00 UTC", endpoint: "/api/cron/subscription-reminders" },
    ],
  };
}

/**
 * Collects complete third-party integration telemetry in parallel.
 */
export async function collectThirdPartyTelemetry(): Promise<ThirdPartyIntegrationsTelemetry> {
  const alertsConfig = await getProviderAlertsConfig();

  const [termii, googleIdentity, diditKyc, webPush] = await Promise.all([
    checkTermiiStatus(alertsConfig.termiiMinBalanceNgn),
    checkGoogleIdentityStatus(),
    checkDiditKycStatus(),
    checkWebPushStatus(),
  ]);

  const zeptoMail = checkZeptoMailStatus();
  const cron = checkCronStatus();

  // If Termii balance is below safety threshold, trigger webhook alert (subject to cooldown)
  if (termii.status === "low_balance" && termii.balance !== undefined) {
    void maybeDispatchProviderAlert({
      serviceName: "Termii SMS Gateway",
      level: "warning",
      message: `Termii balance (${termii.balance} NGN, ~${termii.estimatedSmsRemaining ?? 0} SMS remaining) has dropped below the safety threshold of ${alertsConfig.termiiMinBalanceNgn} NGN.`,
      currentValue: `${termii.balance} NGN`,
      threshold: `${alertsConfig.termiiMinBalanceNgn} NGN`,
      rechargeUrl: "https://accounts.termii.com/#/wallet",
    });
  }

  // If ZeptoMail credit is exhausted, trigger critical alert
  if (zeptoMail.status === "credit_exhausted") {
    void maybeDispatchProviderAlert({
      serviceName: "ZeptoMail Email Dispatch",
      level: "critical",
      message: "ZeptoMail transactional email credits are exhausted. Merchant email OTP and statements are failing.",
      currentValue: "Credit Exhausted",
      rechargeUrl: "https://mailadmin.zoho.com/cpanel/index.do",
    });
  }

  return {
    termii,
    zeptoMail,
    googleIdentity,
    diditKyc,
    webPush,
    cron,
    alertsConfig: {
      termiiMinBalanceNgn: alertsConfig.termiiMinBalanceNgn,
      relayerMinBalanceNative: alertsConfig.relayerMinBalanceNative,
      diditMinChecksRemaining: alertsConfig.diditMinChecksRemaining,
      hasWebhook: Boolean(alertsConfig.alertWebhookUrl),
      hasEmail: Boolean(alertsConfig.alertEmailRecipient),
      lastAlertDispatchedAt: alertsConfig.lastAlertDispatchedAt,
    },
  };
}
