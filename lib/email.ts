const ZEPTO_API_URL = "https://api.zeptomail.com/v1.1/email";

export interface ZeptoMailDispatchState {
  lastDispatchedAt?: string;
  lastFailedAt?: string;
  lastError?: string;
  isCreditExhausted?: boolean;
}

declare global {
  var __zeptoMailTelemetryState: ZeptoMailDispatchState | undefined;
}

export function getZeptoMailDispatchState(): ZeptoMailDispatchState {
  if (!globalThis.__zeptoMailTelemetryState) {
    globalThis.__zeptoMailTelemetryState = {};
  }
  return globalThis.__zeptoMailTelemetryState;
}

export function recordZeptoMailSuccess(): void {
  const state = getZeptoMailDispatchState();
  state.lastDispatchedAt = new Date().toISOString();
  state.lastError = undefined;
  state.isCreditExhausted = false;
}

export function recordZeptoMailFailure(errorMsg: string, isCreditExhausted: boolean): void {
  const state = getZeptoMailDispatchState();
  state.lastFailedAt = new Date().toISOString();
  state.lastError = errorMsg;
  state.isCreditExhausted = isCreditExhausted;
}

function getZeptoToken(): string {
  const rawToken = process.env.ZEPTOMAIL_SEND_TOKEN || "";
  let token = rawToken.trim();
  if (!token.startsWith("Zoho-enczapikey ") && !token.startsWith("Zoho-enczapikey")) {
    token = `Zoho-enczapikey ${token}`;
  } else if (token.startsWith("Zoho-enczapikey") && !token.startsWith("Zoho-enczapikey ")) {
    token = token.replace("Zoho-enczapikey", "Zoho-enczapikey ");
  }
  return token;
}

function parseZeptoMailError(status: number, rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as {
      error?: {
        code?: string;
        message?: string;
        details?: Array<{ code?: string; message?: string }>;
      };
    };

    const details = parsed?.error?.details || [];
    const detailCode = details[0]?.code;
    const detailMsg = details[0]?.message;
    const errorCode = parsed?.error?.code;
    const mainMsg = parsed?.error?.message;

    // Credit Exhaustion / Rate limit (TM_5001, LE_102, 429)
    if (
      status === 429 ||
      errorCode === "TM_5001" ||
      detailCode === "LE_102" ||
      detailMsg?.toLowerCase().includes("credit exhausted") ||
      mainMsg?.toLowerCase().includes("resource limit exhausted")
    ) {
      return "Email delivery limit reached: ZeptoMail credits are exhausted on this account. Please top up ZeptoMail credits or sign in with Google.";
    }

    // Invalid Token / Auth failure
    if (status === 401 || errorCode === "TM_4001") {
      return "ZeptoMail authentication failed: Invalid or expired API token. Please sign in with Google or verify ZEPTOMAIL_SEND_TOKEN.";
    }

    // Unverified Sender Domain
    if (
      detailMsg?.toLowerCase().includes("sender") ||
      detailMsg?.toLowerCase().includes("unverified") ||
      detailMsg?.toLowerCase().includes("domain")
    ) {
      return `Sender email address (${process.env.ZEPTOMAIL_FROM_EMAIL || "no-reply@sellerpadi.com"}) is not verified in ZeptoMail.`;
    }

    if (detailMsg) {
      return `Email dispatch error: ${detailMsg}`;
    }

    if (mainMsg) {
      return `Email dispatch error: ${mainMsg}`;
    }
  } catch {
    // If response was not valid JSON, fall back to status code message
  }

  if (status === 429) {
    return "Email delivery limit reached: ZeptoMail credits are exhausted. Please sign in with Google.";
  }

  return `Email dispatch failed (ZeptoMail HTTP ${status}). Please sign in with Google.`;
}

export async function sendAdminOtpEmail(toEmail: string, code: string): Promise<void> {
  const token = getZeptoToken();
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "no-reply@sellerpadi.com";
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "SellerPadi Mission Control";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SellerPadi Mission Control Access Code</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 32px;">
    <tr>
      <td style="padding-bottom: 24px; border-bottom: 1px solid #1E293B;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: -0.02em;">
          SellerPadi Mission Control
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">
          Internal Platform Security Passcode
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 0 20px 0;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 1.5;">
          Use the 6-digit passcode below to authenticate your administrative session:
        </p>
        <div style="background-color: #090D16; border: 1px solid #2563EB; border-radius: 8px; padding: 18px; text-align: center; letter-spacing: 8px; font-size: 28px; font-weight: 700; font-family: monospace; color: #FFFFFF;">
          ${code}
        </div>
        <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          This security code expires in <strong>10 minutes</strong>. If you did not initiate this authentication request, please inspect server audit logs immediately.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 24px; border-top: 1px solid #1E293B; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #64748B;">
          SellerPadi Infrastructure &bull; Avalanche C-Chain Network
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await fetch(ZEPTO_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: toEmail, name: "Admin" } }],
        subject: `SellerPadi Admin Passcode: ${code}`,
        htmlbody: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const readableError = parseZeptoMailError(response.status, errorText);
      const isCreditExhausted =
        response.status === 429 ||
        errorText.includes("TM_5001") ||
        errorText.includes("LE_102") ||
        errorText.toLowerCase().includes("credit exhausted") ||
        errorText.toLowerCase().includes("resource limit exhausted");

      recordZeptoMailFailure(readableError, isCreditExhausted);
      throw new Error(readableError);
    }

    recordZeptoMailSuccess();
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      // If error was already parsed and recorded above, it will match.
      const state = getZeptoMailDispatchState();
      if (!state.lastError) {
        recordZeptoMailFailure(err.message, false);
      }
    }
    throw err;
  }
}
