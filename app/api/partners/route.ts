import { NextRequest, NextResponse } from "next/server";
import {
  connectAdminDb,
  AdminPartner,
  AdminPartnerPayout,
  AdminSystemConfig,
} from "@/lib/db";
import { sendAdminPartnerApprovalNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectAdminDb();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { partnerCode: regex },
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [partners, totalCount, configDoc, pendingPayoutsCount, pendingApplicationsCount] = await Promise.all([
      AdminPartner.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminPartner.countDocuments(filter),
      AdminSystemConfig.findOne({ key: "pricing_config" }).lean(),
      AdminPartnerPayout.countDocuments({ status: "pending" }),
      AdminPartner.countDocuments({ status: "pending" }),
    ]);

    // Aggregate overall metrics
    const [aggregateMetrics] = await AdminPartner.aggregate([
      {
        $group: {
          _id: null,
          totalEarnedNgn: { $sum: "$earnings.totalEarnedNgn" },
          totalEarnedUsd: { $sum: "$earnings.totalEarnedUsd" },
          totalPaidNgn: { $sum: "$earnings.totalPaidNgn" },
          totalPaidUsd: { $sum: "$earnings.totalPaidUsd" },
          totalUnpaidNgn: { $sum: "$earnings.unpaidBalanceNgn" },
          totalUnpaidUsd: { $sum: "$earnings.unpaidBalanceUsd" },
          totalClicks: { $sum: "$metrics.clicksCount" },
          totalSignups: { $sum: "$metrics.signupsCount" },
          totalPaying: { $sum: "$metrics.payingCustomersCount" },
        },
      },
    ]);

    const activeConfig = {
      discountPercent: typeof configDoc?.partnerDiscountPercent === "number" ? configDoc.partnerDiscountPercent : 20,
      commissionPercent: typeof configDoc?.partnerCommissionPercent === "number" ? configDoc.partnerCommissionPercent : 20,
      commissionDurationMonths: typeof configDoc?.partnerCommissionDurationMonths === "number" ? configDoc.partnerCommissionDurationMonths : 24,
      minPayoutNgn: typeof configDoc?.partnerMinPayoutNgn === "number" ? configDoc.partnerMinPayoutNgn : 5000,
      minPayoutUsd: typeof configDoc?.partnerMinPayoutUsd === "number" ? configDoc.partnerMinPayoutUsd : 25,
      termsVersion: configDoc?.partnerTermsVersion || "v1.0",
      termsContent: configDoc?.partnerTermsContent || "",
      partnerRegistrationOpen: typeof configDoc?.partnerRegistrationOpen === "boolean" ? configDoc.partnerRegistrationOpen : true,
    };

    return NextResponse.json({
      partners,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalPartners: totalCount,
        pendingPayoutsCount,
        pendingApplicationsCount,
        metrics: aggregateMetrics || {
          totalEarnedNgn: 0,
          totalEarnedUsd: 0,
          totalPaidNgn: 0,
          totalPaidUsd: 0,
          totalUnpaidNgn: 0,
          totalUnpaidUsd: 0,
          totalClicks: 0,
          totalSignups: 0,
          totalPaying: 0,
        },
      },
      config: activeConfig,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Admin partners GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectAdminDb();
    const body = await req.json();

    const updateFields: Record<string, unknown> = {};

    if (typeof body.discountPercent === "number" && body.discountPercent >= 0 && body.discountPercent <= 100) {
      updateFields.partnerDiscountPercent = body.discountPercent;
    }
    if (typeof body.commissionPercent === "number" && body.commissionPercent >= 0 && body.commissionPercent <= 100) {
      updateFields.partnerCommissionPercent = body.commissionPercent;
    }
    if (typeof body.commissionDurationMonths === "number" && body.commissionDurationMonths > 0) {
      updateFields.partnerCommissionDurationMonths = body.commissionDurationMonths;
    }
    if (typeof body.minPayoutNgn === "number" && body.minPayoutNgn >= 0) {
      updateFields.partnerMinPayoutNgn = body.minPayoutNgn;
    }
    if (typeof body.minPayoutUsd === "number" && body.minPayoutUsd >= 0) {
      updateFields.partnerMinPayoutUsd = body.minPayoutUsd;
    }
    if (typeof body.termsContent === "string") {
      updateFields.partnerTermsContent = body.termsContent;
    }
    if (typeof body.termsVersion === "string" && body.termsVersion.trim()) {
      updateFields.partnerTermsVersion = body.termsVersion.trim();
    }
    if (typeof body.partnerRegistrationOpen === "boolean") {
      updateFields.partnerRegistrationOpen = body.partnerRegistrationOpen;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No valid configuration parameters provided" }, { status: 400 });
    }

    const updated = await AdminSystemConfig.findOneAndUpdate(
      { key: "pricing_config" },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Partner configuration updated successfully",
      config: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Admin partners PATCH error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectAdminDb();
    const body = await req.json();
    const { partnerId, status, adminNotes } = body;

    if (!partnerId || !["active", "rejected", "suspended"].includes(status)) {
      return NextResponse.json({ error: "Invalid partnerId or status" }, { status: 400 });
    }

    const setFields: Record<string, unknown> = {
      status,
      ...(adminNotes ? { "application.adminNotes": String(adminNotes).trim() } : {}),
      ...(status === "active" || status === "rejected"
        ? { "application.reviewedAt": new Date() }
        : {}),
    };

    const updated = await AdminPartner.findByIdAndUpdate(
      partnerId,
      { $set: setFields },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    if (status === "active" && updated && !updated.application?.welcomeNotificationSent) {
      sendAdminPartnerApprovalNotification(updated)
        .then((result) => {
          if (result.sent) {
            AdminPartner.findByIdAndUpdate(partnerId, {
              $set: {
                "application.welcomeNotificationSent": true,
                "application.welcomeNotificationSentAt": new Date(),
              },
            }).catch((err) => console.error("Error setting welcomeNotificationSent flag:", err));
          }
        })
        .catch((err) => console.error("Admin partner approval notification error:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Partner status changed to ${status}`,
      partner: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Admin partners PUT error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
