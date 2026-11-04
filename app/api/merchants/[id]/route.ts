import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import {
  connectAdminDb,
  AdminUser,
  AdminReceipt,
  AdminBranch,
  AdminTeamMember,
  AdminShipment,
  AdminInventoryProduct,
  AdminAuditLog,
} from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  starter: 500,
  starter_500: 500,
  growth: 1000,
  growth_1000: 1000,
  business: 2500,
  business_2500: 2500,
  scale: 5000,
  scale_5000: 5000,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectAdminDb();
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    // Find user by _id, eoaAddress, cryptoIdentity addresses, or legacy walletPublicAddress
    const user = await AdminUser.findOne({
      $or: [
        { _id: decodedId },
        { eoaAddress: decodedId.toLowerCase() },
        { "cryptoIdentity.mvpVirtualAddress": decodedId.toLowerCase() },
        { "cryptoIdentity.turnkeyWalletAddress": decodedId.toLowerCase() },
        { "cryptoIdentity.smartAccountAddress": decodedId.toLowerCase() },
        { walletPublicAddress: decodedId.toLowerCase() },
      ],
    }).lean();

    if (!user) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantAddress = (user.eoaAddress || user._id).toLowerCase();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch branches, team members, and recent activity concurrently
    const [
      branches,
      teamMembers,
      recentReceipts,
      receiptStats,
      recentShipments,
      shipmentCount,
      inventoryProducts,
      auditLogs,
      monthReceiptsCount,
      monthShipmentsCount,
    ] = await Promise.all([
      AdminBranch.find({ merchantAddress })
        .select("_id name location phone managerName managerAddress isDefault createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      AdminTeamMember.find({ merchantAddress })
        .select("_id memberName memberEmail memberPhone branchId branchName role status invitedAt")
        .sort({ createdAt: -1 })
        .lean(),
      AdminReceipt.find({ merchantAddress })
        .select("_id total currency status paymentMethod paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      AdminReceipt.aggregate<{
        _id: null;
        totalCount: number;
        issuedCount: number;
        voidedCount: number;
        totalGmv: number;
        voidedGmv: number;
      }>([
        { $match: { merchantAddress } },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            issuedCount: {
              $sum: {
                $cond: [{ $in: ["$status", ["Issued", "issued"]] }, 1, 0],
              },
            },
            voidedCount: {
              $sum: {
                $cond: [{ $in: ["$status", ["Voided", "voided"]] }, 1, 0],
              },
            },
            totalGmv: {
              $sum: {
                $cond: [{ $in: ["$status", ["Issued", "issued"]] }, "$total", 0],
              },
            },
            voidedGmv: {
              $sum: {
                $cond: [{ $in: ["$status", ["Voided", "voided"]] }, "$total", 0],
              },
            },
          },
        },
      ]),
      AdminShipment.find({ shipperAddress: merchantAddress })
        .select("_id trackingCode status isDisputed createdAt")
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      AdminShipment.countDocuments({ shipperAddress: merchantAddress }),
      AdminInventoryProduct.find({ merchantAddress })
        .select("_id name sku category costPrice sellingPrice trackStock totalStock lowStockAlert salesCount isActive createdAt")
        .sort({ salesCount: -1, totalStock: 1 })
        .limit(50)
        .lean(),
      AdminAuditLog.find({ targetId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      AdminReceipt.countDocuments({ merchantAddress, createdAt: { $gte: startOfMonth } }),
      AdminShipment.countDocuments({ shipperAddress: merchantAddress, createdAt: { $gte: startOfMonth } }),
    ]);

    const stats = receiptStats[0] || {
      totalCount: 0,
      issuedCount: 0,
      voidedCount: 0,
      totalGmv: 0,
      voidedGmv: 0,
    };

    // Calculate real-time SaaS quota metrics
    const planKey = (user.plan || "free").toLowerCase().replace(/[\s-]/g, "_");
    const baseLimit = PLAN_LIMITS[planKey] || 100;
    const currentMonthOps =
      (monthReceiptsCount + monthShipmentsCount) || (user.operationsThisMonth || 0);
    const rolloverQuota = user.rolloverQuota || 0;
    const effectiveLimit = baseLimit + rolloverQuota;
    const overageCount = Math.max(0, currentMonthOps - effectiveLimit);
    const isDomestic = (user.currency || "NGN").toUpperCase() === "NGN" || (user.country || "NG").toUpperCase() === "NG";
    const overageRate = isDomestic ? 10 : 0.003;
    const accruedOverageCharge = user.overageCharges || (overageCount * overageRate);

    return NextResponse.json({
      merchant: {
        id: user._id,
        merchantAddress,
        displayName: user.displayName || null,
        fullName: user.fullName,
        companyName: user.companyName || user.displayName || user.fullName || "Unnamed Store",
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        businessHandle: user.businessHandle,
        businessAddress: user.businessAddress,
        country: user.country || "NG",
        currency: user.currency || "NGN",
        plan: user.plan || "free",
        operatingMode: user.operatingMode || "hybrid",
        subscriptionActive: Boolean(user.subscriptionActive),
        isSuspended: Boolean(user.isSuspended),
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        authProvider: user.authProvider || null,
        authenticators: user.authenticators || [],
        cryptoIdentity: user.cryptoIdentity || null,
        verification: user.verification || null,
        createdAt: user.createdAt,
      },
      stats: {
        receipts: {
          total: stats.totalCount,
          issued: stats.issuedCount,
          voided: stats.voidedCount,
          gmv: stats.totalGmv,
          voidedGmv: stats.voidedGmv,
        },
        shipments: {
          total: shipmentCount,
        },
        branchesCount: branches.length,
        teamCount: teamMembers.length,
      },
      quota: {
        plan: user.plan || "free",
        baseLimit,
        rolloverQuota,
        effectiveLimit,
        currentMonthOperations: currentMonthOps,
        monthReceiptsCount,
        monthShipmentsCount,
        overageCount,
        overageRate,
        accruedOverageCharge,
        billingCycle: user.billingCycle || "monthly",
        isDomestic,
      },
      inventory: inventoryProducts.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku || "—",
        category: p.category || "General",
        costPrice: p.costPrice ?? null,
        sellingPrice: p.sellingPrice,
        trackStock: Boolean(p.trackStock),
        totalStock: p.totalStock ?? 0,
        lowStockAlert: p.lowStockAlert ?? 5,
        salesCount: p.salesCount ?? 0,
        isActive: Boolean(p.isActive),
        createdAt: p.createdAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log._id,
        adminEmail: log.adminEmail,
        action: log.action,
        details: log.details || null,
        ipAddress: log.ipAddress || null,
        createdAt: log.createdAt,
      })),
      branches: branches.map((b) => ({
        id: b._id,
        name: b.name,
        location: b.location,
        phone: b.phone,
        managerName: b.managerName,
        managerAddress: b.managerAddress,
        isDefault: Boolean(b.isDefault),
        createdAt: b.createdAt,
      })),
      teamMembers: teamMembers.map((t) => ({
        id: t._id,
        memberName: t.memberName,
        memberEmail: t.memberEmail,
        memberPhone: t.memberPhone,
        branchId: t.branchId,
        branchName: t.branchName,
        role: t.role,
        status: t.status,
        invitedAt: t.invitedAt,
      })),
      recentReceipts: recentReceipts.map((r) => ({
        id: r._id,
        total: r.total,
        currency: r.currency || "NGN",
        status: r.status,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      })),
      recentShipments: recentShipments.map((s) => ({
        id: s._id,
        trackingCode: s.trackingCode,
        status: s.status,
        isDisputed: Boolean(s.isDisputed),
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectAdminDb();
    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    // Authenticate admin from session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const session = sessionToken ? await verifyAdminSessionToken(sessionToken) : null;
    const adminEmail = session?.email || "system_admin";
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const body = (await req.json()) as {
      isSuspended?: boolean;
      verificationStatus?: "verified" | "rejected" | "pending" | "unverified";
      rejectionReason?: string;
    };

    const updateFields: Record<string, unknown> = {};

    const existingUser = await AdminUser.findOne({
      $or: [
        { _id: decodedId },
        { eoaAddress: decodedId.toLowerCase() },
        { "cryptoIdentity.mvpVirtualAddress": decodedId.toLowerCase() },
        { "cryptoIdentity.turnkeyWalletAddress": decodedId.toLowerCase() },
        { "cryptoIdentity.smartAccountAddress": decodedId.toLowerCase() },
        { walletPublicAddress: decodedId.toLowerCase() },
      ],
    }).lean();

    if (!existingUser) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    if (typeof body.isSuspended === "boolean") {
      updateFields.isSuspended = body.isSuspended;
    }

    if (body.verificationStatus) {
      const validStatuses = ["verified", "rejected", "pending", "unverified"];
      if (!validStatuses.includes(body.verificationStatus)) {
        return NextResponse.json(
          { error: "Invalid verificationStatus. Must be 'verified', 'rejected', 'pending', or 'unverified'" },
          { status: 400 }
        );
      }

      updateFields["verification.status"] = body.verificationStatus;
      if (body.verificationStatus === "verified") {
        updateFields["verification.verifiedAt"] = new Date();
        updateFields["verification.rejectionReason"] = null;
      } else if (body.verificationStatus === "rejected") {
        updateFields["verification.rejectionReason"] = body.rejectionReason || "Verification rejected by compliance administrator";
      } else {
        updateFields["verification.rejectionReason"] = null;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided (expected 'isSuspended' or 'verificationStatus')" },
        { status: 400 }
      );
    }

    const updatedUser = await AdminUser.findOneAndUpdate(
      { _id: existingUser._id },
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Record immutable audit logs for mutations
    if (typeof body.isSuspended === "boolean" && body.isSuspended !== existingUser.isSuspended) {
      await AdminAuditLog.create({
        _id: new mongoose.Types.ObjectId().toString(),
        adminEmail,
        action: body.isSuspended ? "merchant.suspend" : "merchant.unsuspend",
        targetType: "merchant",
        targetId: existingUser._id,
        details: {
          previousState: { isSuspended: Boolean(existingUser.isSuspended) },
          newState: { isSuspended: body.isSuspended },
          reason: body.rejectionReason || (body.isSuspended ? "Manual admin suspension" : "Manual admin reinstatement"),
        },
        ipAddress,
        createdAt: new Date(),
      });
    }

    if (body.verificationStatus && body.verificationStatus !== existingUser.verification?.status) {
      await AdminAuditLog.create({
        _id: new mongoose.Types.ObjectId().toString(),
        adminEmail,
        action: "merchant.verification_change",
        targetType: "merchant",
        targetId: existingUser._id,
        details: {
          previousStatus: existingUser.verification?.status || "unverified",
          newStatus: body.verificationStatus,
          rejectionReason: body.rejectionReason || null,
        },
        ipAddress,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      merchant: {
        id: updatedUser._id,
        isSuspended: Boolean(updatedUser.isSuspended),
        verification: updatedUser.verification,
      },
      message: "Merchant record updated and administrative audit log recorded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
