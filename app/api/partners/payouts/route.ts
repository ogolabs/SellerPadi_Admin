import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectAdminDb, AdminPartnerPayout, AdminPartner, AdminNotification, AdminUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectAdminDb();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const [payouts, total] = await Promise.all([
      AdminPartnerPayout.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminPartnerPayout.countDocuments(filter),
    ]);

    return NextResponse.json({
      payouts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Admin payouts GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectAdminDb();
    const body = await req.json();
    const { payoutId, action, transferReference, adminNotes, adminEmail } = body;

    if (!payoutId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "payoutId and valid action ('approve' | 'reject') are required" }, { status: 400 });
    }

    const payout = await AdminPartnerPayout.findById(payoutId);
    if (!payout) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    if (payout.status !== "pending") {
      return NextResponse.json({ error: `Cannot process payout that is already ${payout.status}` }, { status: 400 });
    }

    const partner = await AdminPartner.findById(payout.partnerId);
    if (!partner) {
      return NextResponse.json({ error: "Linked partner not found" }, { status: 404 });
    }

    const now = new Date();
    const isNgn = payout.currency === "NGN";

    if (action === "approve") {
      if (!transferReference || !String(transferReference).trim()) {
        return NextResponse.json({ error: "Transfer reference is required to approve manual payout" }, { status: 400 });
      }

      payout.status = "paid";
      payout.transferReference = String(transferReference).trim();
      payout.adminNotes = adminNotes?.trim() || null;
      payout.processedAt = now;
      payout.processedBy = {
        email: adminEmail?.trim() || "admin@sellerpadi.com",
        name: "Mission Control Admin",
      };
      await payout.save();

      // Update partner ledger: increment totalPaid
      const incUpdate = isNgn
        ? { "earnings.totalPaidNgn": payout.amount }
        : { "earnings.totalPaidUsd": payout.amount };

      await AdminPartner.updateOne({ _id: partner._id }, { $inc: incUpdate });

      // Dispatch in-app notification to partner
      try {
        let recipientAddress = (partner.userId || String(partner._id)).toLowerCase();
        if (partner.userId) {
          const userDoc = await AdminUser.findOne({
            $or: [{ _id: partner.userId }, { eoaAddress: partner.userId }],
          }).lean();
          if (userDoc?.eoaAddress) recipientAddress = userDoc.eoaAddress.toLowerCase();
          else if (userDoc?._id) recipientAddress = String(userDoc._id).toLowerCase();
        } else if (partner.email) {
          const cleanEmail = partner.email.toLowerCase().trim();
          const userDoc = await AdminUser.findOne({
            $or: [{ businessEmail: cleanEmail }, { email: cleanEmail }],
          }).lean();
          if (userDoc?.eoaAddress) recipientAddress = userDoc.eoaAddress.toLowerCase();
          else if (userDoc?._id) recipientAddress = String(userDoc._id).toLowerCase();
        }

        await AdminNotification.create({
          _id: crypto.randomUUID(),
          ownerAddress: recipientAddress,
          registrationId: String(payout._id),
          type: "partner_payout_processed",
          title: `Payout Disbursed: ${payout.currency} ${payout.amount.toLocaleString()}`,
          message: `Your payout of ${payout.currency} ${payout.amount.toLocaleString()} has been approved and sent to your bank account (Ref: ${String(transferReference).trim()}).`,
          url: "/partners/dashboard",
          read: false,
          createdAt: now,
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch partner payout notification:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: `Payout of ${payout.currency} ${payout.amount.toLocaleString()} approved and marked as Paid.`,
        payout,
      });
    }

    if (action === "reject") {
      payout.status = "rejected";
      payout.adminNotes = adminNotes?.trim() || "Rejected by administrator";
      payout.processedAt = now;
      payout.processedBy = {
        email: adminEmail?.trim() || "admin@sellerpadi.com",
        name: "Mission Control Admin",
      };
      await payout.save();

      // Restore partner unpaid balance accurately (respecting multi-currency converted amounts if present)
      const incUpdate: Record<string, number> = {};
      if (typeof payout.originalUnpaidNgn === "number" && payout.originalUnpaidNgn > 0) {
        incUpdate["earnings.unpaidBalanceNgn"] = payout.originalUnpaidNgn;
      } else if (isNgn) {
        incUpdate["earnings.unpaidBalanceNgn"] = payout.amount;
      }

      if (typeof payout.originalUnpaidUsd === "number" && payout.originalUnpaidUsd > 0) {
        incUpdate["earnings.unpaidBalanceUsd"] = payout.originalUnpaidUsd;
      } else if (!isNgn) {
        incUpdate["earnings.unpaidBalanceUsd"] = payout.amount;
      }

      await AdminPartner.updateOne({ _id: partner._id }, { $inc: incUpdate });

      return NextResponse.json({
        success: true,
        message: `Payout request rejected and balance restored to partner wallet.`,
        payout,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Admin payouts POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
