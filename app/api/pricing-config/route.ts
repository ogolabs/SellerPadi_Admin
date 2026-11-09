import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { connectAdminDb, AdminSystemConfig } from "@/lib/db";
import { getTierPricing } from "@/lib/pricing-config";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyAdminSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectAdminDb();

    const config = await AdminSystemConfig.findOne({ key: "pricing_config" }).lean();
    const yearlyDiscountPercent =
      typeof config?.yearlyDiscountPercent === "number" ? config.yearlyDiscountPercent : 5;

    return NextResponse.json({
      yearlyDiscountPercent,
      tierPricing: getTierPricing(yearlyDiscountPercent),
      updatedAt: config?.updatedAt || null,
      updatedBy: config?.updatedBy || null,
    });
  } catch (error) {
    console.error("[API/pricing-config] Error fetching pricing config:", error);
    return NextResponse.json(
      { error: "Failed to retrieve pricing configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyAdminSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { yearlyDiscountPercent?: unknown };
    const rawDiscount = body.yearlyDiscountPercent;

    if (
      typeof rawDiscount !== "number" ||
      isNaN(rawDiscount) ||
      rawDiscount < 0 ||
      rawDiscount > 50
    ) {
      return NextResponse.json(
        { error: "Discount percentage must be a valid number between 0% and 50%." },
        { status: 400 }
      );
    }

    await connectAdminDb();

    const updated = await AdminSystemConfig.findOneAndUpdate(
      { key: "pricing_config" },
      {
        $set: {
          yearlyDiscountPercent: Math.round(rawDiscount * 10) / 10,
          updatedBy: session.email,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    const yearlyDiscountPercent = updated.yearlyDiscountPercent;

    return NextResponse.json({
      success: true,
      yearlyDiscountPercent,
      tierPricing: getTierPricing(yearlyDiscountPercent),
      updatedAt: updated.updatedAt || new Date().toISOString(),
      updatedBy: session.email,
    });
  } catch (error) {
    console.error("[API/pricing-config] Error updating pricing config:", error);
    return NextResponse.json(
      { error: "Failed to update pricing configuration" },
      { status: 500 }
    );
  }
}

