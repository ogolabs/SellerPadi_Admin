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
          SellerPadi Infrastructure &bull; Electroneum Smart Chain Network
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

export async function sendTermiiAdminSms(cleanPhone: string, text: string): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const rawBaseUrl = process.env.TERMII_BASE_URL?.trim() || "https://v4.api.termii.com";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const senderId = process.env.TERMII_SENDER_ID?.trim() || "SellerPadi";
  const channel = process.env.TERMII_CHANNEL?.trim().toLowerCase() === "dnd" ? "dnd" : "generic";

  if (!apiKey || !cleanPhone) return false;

  const termiiTo = cleanPhone.replace(/[^0-9]/g, "").replace(/^0/, "234");

  try {
    const res = await fetch(`${baseUrl}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: termiiTo,
        from: senderId,
        sms: text,
        type: "plain",
        channel,
        api_key: apiKey,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface AdminPartnerApprovalNotificationDoc {
  _id: string;
  partnerCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  payoutCurrency?: string;
  application?: {
    welcomeNotificationSent?: boolean;
    welcomeNotificationSentAt?: Date | null;
  } | null;
}

export async function sendAdminPartnerApprovalNotification(
  partner: AdminPartnerApprovalNotificationDoc
): Promise<{ sent: boolean; channel?: "email" | "sms"; error?: string }> {
  try {
    if (partner.application?.welcomeNotificationSent) {
      return { sent: false };
    }

    const fullName = partner.fullName?.trim() || "Partner";
    const partnerCode = partner.partnerCode.trim().toUpperCase();
    const email = partner.email && partner.email.includes("@") ? partner.email.trim().toLowerCase() : null;
    const phone = partner.phone ? partner.phone.replace(/[^0-9+]/g, "") : null;

    // Dynamic country-localized withdrawal threshold (strictly separated)
    const country = (partner.country || "NG").toUpperCase();
    const isNigeria = country === "NG" || partner.payoutCurrency === "NGN";
    const minPayoutDisplay = isNigeria ? "₦5,000 NGN" : "$25 USD";

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.sellerpadi.com";
    const partnerPortalUrl = `${APP_URL}/partners/dashboard`;
    const referralLink = `${APP_URL}/onboarding?ref=${partnerCode}`;

    if (email) {
      const token = getZeptoToken();
      const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "no-reply@sellerpadi.com";
      const fromName = process.env.ZEPTOMAIL_FROM_NAME || "SellerPadi";

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Partner Application is Approved!</title>
</head>
<body style="margin: 0; padding: 36px 12px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    <tr>
      <td style="background-color: #0F172A; padding: 24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" align="left" style="line-height:1;">
              <span style="display:inline-block;background:#1E293B;color:#38BDF8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:4px 9px;border-radius:6px;border:1px solid #334155;line-height:14px;">
                PARTNER ACTIVE &bull; 20% RECURRING SHARE
              </span>
              <h1 style="margin: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">
                Your Partner Application is Approved!
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8;">
                Welcome to the official SellerPadi Partnership Program.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 32px 24px 32px; font-size: 14px; color: #334155; line-height: 1.6;">
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; font-weight: 600;">
          Dear ${fullName},
        </p>
        <p style="margin: 0 0 18px 0;">
          We are pleased to inform you that your <strong>SellerPadi Partnership Program</strong> application has been reviewed and <strong style="color: #059669;">Approved</strong>!
        </p>
        <p style="margin: 0 0 20px 0;">
          You are now officially authorized to earn recurring revenue recommending SellerPadi to retailers, boutiques, supermarkets, delivery networks, etc.
        </p>

        <!-- Promo Code Box -->
        <div style="background-color: #0B1220; border: 1px solid #1E293B; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center; color: #FFFFFF;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">
            Your Unique Partner Promo Code
          </p>
          <div style="font-size: 26px; font-weight: 800; font-family: monospace; letter-spacing: 3px; color: #38BDF8; margin-bottom: 12px;">
            ${partnerCode}
          </div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #94A3B8;">
            Direct Referral Link:
          </p>
          <div style="background-color: #1E293B; border-radius: 8px; padding: 10px 14px; font-family: monospace; font-size: 12px; color: #F8FAFC; word-break: break-all;">
            <a href="${referralLink}" style="color: #38BDF8; text-decoration: none;">${referralLink}</a>
          </div>
        </div>

        <!-- Commercial Terms -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Your Commission Share:</td>
              <td align="right" style="padding: 6px 0; color: #059669; font-weight: 700;">20% Passive Revenue</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Commission Duration:</td>
              <td align="right" style="padding: 6px 0; color: #0F172A; font-weight: 700;">24 Months (2 Full Years)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Merchant Incentive:</td>
              <td align="right" style="padding: 6px 0; color: #2563EB; font-weight: 600;">20% Off 1st Subscription</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Minimum Bank Withdrawal:</td>
              <td align="right" style="padding: 6px 0; color: #0F172A; font-weight: 700;">${minPayoutDisplay}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
          How to Succeed as a Partner:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; margin-bottom: 24px;">
          <tr>
            <td valign="top" style="padding: 8px 0; width: 24px; color: #2563EB; font-weight: 700;">1.</td>
            <td style="padding: 8px 0 8px 8px; color: #334155;">
              <strong>Share Your Code or Link:</strong> Share with retail stores, supermarkets, dispatch networks, and social vendors.
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding: 8px 0; width: 24px; color: #2563EB; font-weight: 700;">2.</td>
            <td style="padding: 8px 0 8px 8px; color: #334155;">
              <strong>Highlight Cost Savings:</strong> Show merchants how SellerPadi eliminates paper thermal rolls and protects parcel deliveries.
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding: 8px 0; width: 24px; color: #2563EB; font-weight: 700;">3.</td>
            <td style="padding: 8px 0 8px 8px; color: #334155;">
              <strong>Track Real-Time Analytics:</strong> Monitor click-throughs, signups, and commission balances on your dashboard.
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding: 8px 0; width: 24px; color: #2563EB; font-weight: 700;">4.</td>
            <td style="padding: 8px 0 8px 8px; color: #334155;">
              <strong>Fast Bank Payouts:</strong> Request direct bank withdrawals as soon as your available balance reaches <strong>${minPayoutDisplay}</strong>.
            </td>
          </tr>
        </table>

        <div style="text-align: center; padding: 12px 0 24px 0;">
          <a href="${partnerPortalUrl}" style="display: inline-block; background-color: #155EEF; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px;">
            Open Partner Portal &rarr;
          </a>
        </div>

        <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748B;">
          Have questions or enterprise partnership inquiries? Contact our partner desk at <a href="mailto:support@sellerpadi.com" style="color: #2563EB; text-decoration: none;">support@sellerpadi.com</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8;">
        &copy; ${new Date().getFullYear()} SellerPadi &bull; OGOLABS TECHNOLOGY LTD (RC: 10005885)
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const response = await fetch(ZEPTO_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          from: { address: fromEmail, name: fromName },
          to: [{ email_address: { address: email, name: fullName } }],
          subject: `Your SellerPadi Partner Application is Approved! (Code: ${partnerCode})`,
          htmlbody: htmlBody,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const readableError = parseZeptoMailError(response.status, errorText);
        throw new Error(readableError);
      }

      return { sent: true, channel: "email" };
    }

    if (phone) {
      const smsText = `Congratulations ${fullName}! Your SellerPadi Partner application is approved. Your promo code is ${partnerCode}. Start earning 20% recurring share at app.sellerpadi.com/partners/dashboard. Support: support@sellerpadi.com`;
      const sent = await sendTermiiAdminSms(phone, smsText);
      return { sent, channel: "sms" };
    }

    return { sent: false, error: "No email or phone found on partner record." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to dispatch partner approval notification";
    console.error("[Admin Partner Approval] Error:", errorMsg);
    return { sent: false, error: errorMsg };
  }
}

