import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import {
  getProviderAlertsConfig,
  updateProviderAlertsConfig,
  maybeDispatchProviderAlert,
  IProviderAlertsSettings,
} from "@/lib/provider-alerts";

async function authenticateAdmin(): Promise<{ authorized: boolean; email?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return { authorized: false };

  const session = await verifyAdminSessionToken(token);
  if (!session) return { authorized: false };

  return { authorized: true, email: session.email };
}

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getProviderAlertsConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[API/alerts-config] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve provider alert configurations" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth.authorized || !auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Partial<IProviderAlertsSettings> = {};

    if (body.termiiMinBalanceNgn !== undefined) {
      const termii = Number(body.termiiMinBalanceNgn);
      if (isNaN(termii) || termii < 0 || termii > 1_000_000) {
        return NextResponse.json(
          { error: "Termii balance threshold must be between ₦0 and ₦1,000,000." },
          { status: 400 }
        );
      }
      updates.termiiMinBalanceNgn = termii;
    }

    if (body.relayerMinBalanceNative !== undefined) {
      const relayer = Number(body.relayerMinBalanceNative);
      if (isNaN(relayer) || relayer < 0 || relayer > 1000) {
        return NextResponse.json(
          { error: "Relayer balance threshold must be between 0 and 1,000 native tokens." },
          { status: 400 }
        );
      }
      updates.relayerMinBalanceNative = relayer;
    }

    if (body.diditMinChecksRemaining !== undefined) {
      const didit = Number(body.diditMinChecksRemaining);
      if (isNaN(didit) || didit < 0 || didit > 10_000) {
        return NextResponse.json(
          { error: "Didit KYC checks threshold must be between 0 and 10,000." },
          { status: 400 }
        );
      }
      updates.diditMinChecksRemaining = didit;
    }

    if (body.alertWebhookUrl !== undefined) {
      const url = typeof body.alertWebhookUrl === "string" ? body.alertWebhookUrl.trim() : null;
      if (url && !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: "Webhook URL must begin with http:// or https://" },
          { status: 400 }
        );
      }
      updates.alertWebhookUrl = url || null;
    }

    if (body.alertEmailRecipient !== undefined) {
      const email = typeof body.alertEmailRecipient === "string" ? body.alertEmailRecipient.trim() : null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Alert email recipient must be a valid email address." },
          { status: 400 }
        );
      }
      updates.alertEmailRecipient = email || null;
    }

    const updatedConfig = await updateProviderAlertsConfig(updates, auth.email);
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error("[API/alerts-config] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update provider alert configuration" },
      { status: 500 }
    );
  }
}

/**
 * Test ping handler: verifies webhook reachability by sending a test payload.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth.authorized || !auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { webhookUrl?: string };
    const config = await getProviderAlertsConfig();
    const targetUrl = (body.webhookUrl || config.alertWebhookUrl || "").trim();

    if (!targetUrl) {
      return NextResponse.json(
        { error: "No alert webhook URL configured to test." },
        { status: 400 }
      );
    }

    const testPayload = {
      serviceName: "SellerPadi Alert Subsystem",
      level: "warning" as const,
      message: `Test ping dispatched by ${auth.email}. All provider alerts operational.`,
      currentValue: "Test OK",
      threshold: "N/A",
    };

    // Temporarily point to target URL if testing an unsaved URL
    const originalUrl = config.alertWebhookUrl;
    if (body.webhookUrl && body.webhookUrl !== originalUrl) {
      await updateProviderAlertsConfig({ alertWebhookUrl: targetUrl }, auth.email);
    }

    const dispatchResult = await maybeDispatchProviderAlert(testPayload, true);

    if (!dispatchResult.dispatched) {
      return NextResponse.json(
        { error: dispatchResult.reason || "Webhook dispatch failed. Check endpoint URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test alert dispatched successfully to webhook endpoint.",
    });
  } catch (error) {
    console.error("[API/alerts-config] POST test error:", error);
    return NextResponse.json(
      { error: "Test dispatch encountered an internal error" },
      { status: 500 }
    );
  }
}

