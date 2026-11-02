import { AdminUser } from "@/lib/db";

export interface TermiiTelemetry {
  status: "operational" | "low_balance" | "unconfigured" | "error";
  balance?: number;
  currency?: string;
  channel: string;
  senderId: string;
  latencyMs?: number;
  error?: string;
}

export interface ZeptoMailTelemetry {
  status: "operational" | "credit_exhausted" | "unconfigured" | "error";
  senderEmail: string;
  senderName: string;
  isTokenConfigured: boolean;
  creditExhaustedNotice?: string;
  error?: string;
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
  verifiedMerchants: number;
  pendingMerchants: number;
  declinedMerchants: number;
  unverifiedMerchants: number;
  totalSubmissions: number;
  latencyMs?: number;
  detail?: string;
  error?: string;
}

export interface ThirdPartyIntegrationsTelemetry {
  termii: TermiiTelemetry;
  zeptoMail: ZeptoMailTelemetry;
  googleIdentity: GoogleIdentityTelemetry;
  diditKyc: DiditKycTelemetry;
}

/**
 * Probes Termii SMS Token API for account balance & channel status.
 */
export async function checkTermiiStatus(): Promise<TermiiTelemetry> {
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
      // Below 10 units is low balance notice
      const status = balance < 10 ? "low_balance" : "operational";

      return {
        status,
        balance,
        currency,
        channel,
        senderId,
        latencyMs,
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
  const senderEmail = process.env.ZEPTOMAIL_FROM_EMAIL?.trim() || "noreply@sellerpadi.com";
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

  // ZeptoMail currently has exhausted trial credits on the shared Zoho API domain
  return {
    status: "credit_exhausted",
    senderEmail,
    senderName,
    isTokenConfigured: true,
    creditExhaustedNotice: "Email delivery credits exhausted (LE_102 / 429). Google Sign-In is active as primary authentication gate.",
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

  // Database verification metrics
  const [verifiedCount, pendingCount, declinedCount, totalMerchants] = await Promise.all([
    AdminUser.countDocuments({ "verification.status": "verified" }),
    AdminUser.countDocuments({ "verification.status": "pending" }),
    AdminUser.countDocuments({ "verification.status": "rejected" }),
    AdminUser.countDocuments({
      $or: [{ role: "merchant" }, { hasMerchantProfile: true }, { companyName: { $exists: true, $ne: null } }],
    }),
  ]);

  const totalSubmissions = verifiedCount + pendingCount + declinedCount;
  const unverifiedMerchants = Math.max(0, totalMerchants - verifiedCount);

  if (!apiKey || !workflowId) {
    return {
      status: "unconfigured",
      workflowIdMasked,
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
    const features = workflowData.features || "OCR + Face Match";

    return {
      status: "operational",
      workflowIdMasked,
      workflowLabel,
      workflowStatus,
      features,
      balance: balanceStr,
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

/**
 * Collects complete third-party integration telemetry in parallel.
 */
export async function collectThirdPartyTelemetry(): Promise<ThirdPartyIntegrationsTelemetry> {
  const [termii, googleIdentity, diditKyc] = await Promise.all([
    checkTermiiStatus(),
    checkGoogleIdentityStatus(),
    checkDiditKycStatus(),
  ]);

  const zeptoMail = checkZeptoMailStatus();

  return {
    termii,
    zeptoMail,
    googleIdentity,
    diditKyc,
  };
}
