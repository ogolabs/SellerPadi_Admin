import { NextRequest, NextResponse } from "next/server";
import { connectAdminDb, AdminReceipt, AdminShipment, AdminUser, IShipmentDoc, IReceiptDoc } from "@/lib/db";
import {
  getAnchoredReceiptFilter,
  getAnchoredShipmentFilter,
  healDriftedAnchors,
} from "@/lib/ledger-queries";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptDetail {
  receiptNumber?: string;
  items: ReceiptItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: string;
  issuedByName?: string;
  issuedByRole?: string;
  branchName?: string;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
  receiptHash?: string | null;
  onChainTxHash?: string | null;
}

export interface ShipmentCheckpoint {
  event?: string;
  status?: string;
  location?: string;
  note?: string;
  timestamp?: string;
  onChainTxHash?: string | null;
}

export interface ShipmentDetail {
  trackingCode?: string;
  packageName?: string;
  destination?: string;
  receiverName?: string;
  receiverPhone?: string;
  senderName?: string;
  senderPhone?: string;
  branchName?: string;
  receiptNumber?: string;
  notes?: string;
  isDisputed: boolean;
  disputeReason?: string | null;
  disputeResolved: boolean;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  events: ShipmentCheckpoint[];
  onChainTxHash?: string | null;
}

export interface UnifiedRecordItem {
  id: string;
  rawId?: string;
  recordType: "receipt" | "shipment";
  merchantOrShipper: string;
  merchantName?: string;
  detail: string;
  status: string;
  isVoidedOrDisputed: boolean;
  onChainStatus: string;
  createdAt: Date | string;
  receipt?: ReceiptDetail;
  shipment?: ShipmentDetail;
}

export async function GET(req: NextRequest) {
  try {
    await connectAdminDb();
    void healDriftedAnchors();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const recordType = searchParams.get("type") || "all";
    const statusFilter = (searchParams.get("status") || "all").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const queryReceipts = recordType === "all" || recordType === "receipts";
    const queryShipments = recordType === "all" || recordType === "shipments";

    const receiptFilter: Record<string, unknown> = {};
    const shipmentFilter: Record<string, unknown> = {};

    // MongoDB Index-aware filter routing
    if (q) {
      if (q.startsWith("0x") && q.length === 42) {
        // Direct indexed lookup on merchantAddress / shipperAddress
        const lowerAddress = q.toLowerCase();
        receiptFilter.merchantAddress = lowerAddress;
        shipmentFilter.shipperAddress = lowerAddress;
      } else if (q.toUpperCase().startsWith("SP-REC-") || q.toUpperCase().startsWith("REC-")) {
        // Direct index lookup on receipts by receiptNumber or on-chain _id
        receiptFilter.$or = [
          { receiptNumber: q.toUpperCase() },
          { receiptNumber: q },
          { _id: q.toLowerCase() },
          { _id: q },
        ];
        shipmentFilter._id = { $exists: false };
      } else if (
        q.toUpperCase().startsWith("SHPT-") ||
        q.toUpperCase().startsWith("SP-") ||
        q.toUpperCase().startsWith("PKG-")
      ) {
        // Direct indexed lookup on shipment tracking code
        receiptFilter._id = { $exists: false };
        shipmentFilter.$or = [
          { trackingCode: q.toUpperCase() },
          { _id: q.toLowerCase() },
          { _id: q },
        ];
      } else {
        const regex = new RegExp(q, "i");
        // Also match merchants by updated companyName or fullName
        const matchingUsers = await AdminUser.find({
          $or: [{ companyName: regex }, { fullName: regex }, { displayName: regex }],
        })
          .select("_id eoaAddress walletPublicAddress cryptoIdentity")
          .lean();
        const userAddrs = matchingUsers
          .flatMap((u) => [
            u._id,
            u.eoaAddress,
            u.walletPublicAddress,
            u.cryptoIdentity?.mvpVirtualAddress,
            u.cryptoIdentity?.turnkeyWalletAddress,
            u.cryptoIdentity?.smartAccountAddress,
          ])
          .filter(Boolean)
          .map((a) => (a as string).toLowerCase());

        receiptFilter.$or = [
          { _id: regex },
          { merchantName: regex },
          { customerName: regex },
          { customerPhone: regex },
          ...(userAddrs.length > 0 ? [{ merchantAddress: { $in: userAddrs } }] : []),
        ];
        shipmentFilter.$or = [
          { _id: regex },
          { trackingCode: regex },
          { "createdBy.name": regex },
          { "metadata.name": regex },
          { "metadata.receiverName": regex },
          { "metadata.destination": regex },
          ...(userAddrs.length > 0 ? [{ shipperAddress: { $in: userAddrs } }] : []),
        ];
      }
    }

    if (statusFilter !== "all") {
      if (statusFilter === "issued") {
        receiptFilter.status = { $in: ["Issued", "issued"] };
        shipmentFilter.status = { $in: ["Created", "InTransit"] };
      } else if (statusFilter === "voided") {
        receiptFilter.status = { $in: ["Voided", "voided"] };
        shipmentFilter._id = { $exists: false };
      } else if (statusFilter === "delivered" || statusFilter === "verified") {
        receiptFilter._id = { $exists: false };
        shipmentFilter.status = { $in: ["Delivered", "Verified"] };
      } else if (statusFilter === "disputed") {
        receiptFilter._id = { $exists: false };
        shipmentFilter.$or = [{ status: "Disputed" }, { isDisputed: true }];
      }
    }

    // Parallel count queries for metrics and pagination
    const [receiptCount, shipmentCount, receiptAnchored, shipmentAnchored, receiptVoided, shipmentDisputed] =
      await Promise.all([
        queryReceipts ? AdminReceipt.countDocuments(receiptFilter) : 0,
        queryShipments ? AdminShipment.countDocuments(shipmentFilter) : 0,
        queryReceipts ? AdminReceipt.countDocuments({ ...receiptFilter, ...getAnchoredReceiptFilter() }) : 0,
        queryShipments ? AdminShipment.countDocuments({ ...shipmentFilter, ...getAnchoredShipmentFilter() }) : 0,
        queryReceipts ? AdminReceipt.countDocuments({ ...receiptFilter, status: { $in: ["Voided", "voided"] } }) : 0,
        queryShipments ? AdminShipment.countDocuments({ ...shipmentFilter, $or: [{ status: "Disputed" }, { isDisputed: true }] }) : 0,
      ]);

    const total = receiptCount + shipmentCount;
    const anchoredCount = receiptAnchored + shipmentAnchored;
    const voidedOrDisputedCount = receiptVoided + shipmentDisputed;

    // Lean projected queries to minimize database I/O & memory footprint
    let paginated: UnifiedRecordItem[] = [];

    if (recordType === "receipts") {
      const rawReceipts = await AdminReceipt.find(receiptFilter)
        .select("_id merchantAddress merchantName businessName total currency status onChainStatus onChainTxHash createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const receipts = rawReceipts as unknown as IReceiptDoc[];
      const merchantLookup = await buildMerchantLookupMap(receipts.map((r) => r.merchantAddress));
      paginated = receipts.map((r) => mapReceiptRecord(r, merchantLookup));
    } else if (recordType === "shipments") {
      const rawShipments = await AdminShipment.find(shipmentFilter)
        .select("_id shipperAddress trackingCode status isDisputed createdBy metadata onChainStatus onChainTxHash events createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const shipments = rawShipments as unknown as IShipmentDoc[];
      const merchantLookup = await buildMerchantLookupMap(shipments.map((s) => s.shipperAddress));
      paginated = shipments.map((s) => mapShipmentRecord(s, merchantLookup));
    } else {
      // Merged query: fetch up to skip + limit from both, sort, and slice
      const fetchDepth = skip + limit;
      const [rawReceipts, rawShipments] = await Promise.all([
        AdminReceipt.find(receiptFilter)
          .select("_id merchantAddress merchantName businessName total currency status onChainStatus onChainTxHash createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
        AdminShipment.find(shipmentFilter)
          .select("_id shipperAddress trackingCode status isDisputed createdBy metadata onChainStatus onChainTxHash events createdAt")
          .sort({ createdAt: -1 })
          .limit(fetchDepth)
          .lean(),
      ]);

      const receipts = rawReceipts as unknown as IReceiptDoc[];
      const shipments = rawShipments as unknown as IShipmentDoc[];
      const merchantLookup = await buildMerchantLookupMap([
        ...receipts.map((r) => r.merchantAddress),
        ...shipments.map((s) => s.shipperAddress),
      ]);

      const merged: UnifiedRecordItem[] = [];

      for (const r of receipts) {
        merged.push(mapReceiptRecord(r, merchantLookup));
      }

      for (const s of shipments) {
        merged.push(mapShipmentRecord(s, merchantLookup));
      }

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      paginated = merged.slice(skip, skip + limit);
    }

    return NextResponse.json({
      records: paginated,
      total,
      receiptCount,
      shipmentCount,
      anchoredCount,
      voidedOrDisputedCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildMerchantLookupMap(addresses: string[]): Promise<Map<string, string>> {
  const lookupMap = new Map<string, string>();
  const uniqueAddresses = Array.from(new Set(addresses.map((a) => (a || "").toLowerCase()))).filter(Boolean);
  if (uniqueAddresses.length === 0) return lookupMap;

  const users = await AdminUser.find({
    $or: [
      { _id: { $in: uniqueAddresses } },
      { eoaAddress: { $in: uniqueAddresses } },
      { "cryptoIdentity.mvpVirtualAddress": { $in: uniqueAddresses } },
      { "cryptoIdentity.turnkeyWalletAddress": { $in: uniqueAddresses } },
      { "cryptoIdentity.smartAccountAddress": { $in: uniqueAddresses } },
      { walletPublicAddress: { $in: uniqueAddresses } },
    ],
  })
    .select("_id eoaAddress walletPublicAddress cryptoIdentity companyName fullName displayName")
    .lean();

  for (const u of users) {
    const name = u.companyName || u.displayName || u.fullName;
    if (name) {
      if (u._id) lookupMap.set(u._id.toLowerCase(), name);
      if (u.eoaAddress) lookupMap.set(u.eoaAddress.toLowerCase(), name);
      if (u.cryptoIdentity?.mvpVirtualAddress) lookupMap.set(u.cryptoIdentity.mvpVirtualAddress.toLowerCase(), name);
      if (u.cryptoIdentity?.turnkeyWalletAddress) lookupMap.set(u.cryptoIdentity.turnkeyWalletAddress.toLowerCase(), name);
      if (u.cryptoIdentity?.smartAccountAddress) lookupMap.set(u.cryptoIdentity.smartAccountAddress.toLowerCase(), name);
      if (u.walletPublicAddress) lookupMap.set(u.walletPublicAddress.toLowerCase(), name);
    }
  }

  return lookupMap;
}

function mapReceiptRecord(
  r: IReceiptDoc,
  merchantLookupMap: Map<string, string>
): UnifiedRecordItem {
  const doc = r as unknown as Record<string, unknown>;
  const isVoided = (r.status || "").toLowerCase() === "voided";
  const merchantName =
    merchantLookupMap.get((r.merchantAddress || "").toLowerCase()) ||
    r.businessName ||
    r.merchantName ||
    undefined;

  const isAnchored = Boolean(
    r.onChainStatus === "anchored" ||
      (typeof r.onChainTxHash === "string" && r.onChainTxHash.startsWith("0x"))
  );

  const rawItems = Array.isArray(doc.items) ? doc.items : [];
  const items: ReceiptItem[] = rawItems.map((item) => {
    const it = item as Record<string, unknown>;
    const qty = typeof it.quantity === "number" ? it.quantity : 1;
    const price = typeof it.unitPrice === "number" ? it.unitPrice : 0;
    const tot = typeof it.total === "number" ? it.total : qty * price;
    return {
      name: (it.name as string) || "Item",
      quantity: qty,
      unitPrice: price,
      total: tot,
    };
  });

  const issuedByObj = doc.issuedBy as Record<string, unknown> | undefined;
  const voidedByObj = doc.voidedBy as Record<string, unknown> | string | undefined;
  const voidedByStr =
    typeof voidedByObj === "object" && voidedByObj !== null
      ? ((voidedByObj.name as string) || (voidedByObj.address as string) || null)
      : typeof voidedByObj === "string"
      ? voidedByObj
      : null;

  const receiptDetail: ReceiptDetail = {
    receiptNumber: (doc.receiptNumber as string) || r._id,
    items,
    customerName: (doc.customerName as string) || undefined,
    customerPhone: (doc.customerPhone as string) || undefined,
    customerEmail: (doc.customerEmail as string) || undefined,
    subtotal: typeof doc.subtotal === "number" ? doc.subtotal : undefined,
    tax: typeof doc.tax === "number" ? doc.tax : undefined,
    discount: typeof doc.discount === "number" ? doc.discount : undefined,
    total: r.total,
    currency: r.currency || "NGN",
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    issuedByName: (issuedByObj?.name as string) || undefined,
    issuedByRole: (issuedByObj?.role as string) || undefined,
    branchName: (doc.branchName as string) || undefined,
    voidReason: (doc.voidReason as string) || (doc.void_reason as string) || null,
    voidedAt: doc.voidedAt ? new Date(doc.voidedAt as string | Date).toISOString() : null,
    voidedBy: voidedByStr,
    receiptHash: (doc.receiptHash as string) || (doc.hash as string) || null,
    onChainTxHash: r.onChainTxHash || (doc.txHash as string) || null,
  };

  return {
    id: r._id,
    rawId: r._id,
    recordType: "receipt",
    merchantOrShipper: r.merchantAddress,
    merchantName,
    detail: `${r.currency || "NGN"} ${r.total.toLocaleString()}`,
    status: isVoided ? "Voided" : "Issued",
    isVoidedOrDisputed: isVoided,
    onChainStatus: isAnchored ? "anchored" : (r.onChainStatus || "pending"),
    createdAt: r.createdAt,
    receipt: receiptDetail,
  };
}

function mapShipmentRecord(
  s: IShipmentDoc,
  merchantLookupMap: Map<string, string>
): UnifiedRecordItem {
  const doc = s as unknown as Record<string, unknown>;
  const isDisputed = Boolean(s.isDisputed) || (s.status || "").toLowerCase() === "disputed";
  const normalId =
    s.trackingCode ||
    (s._id.startsWith("0x") ? `SHPT-${s._id.slice(2, 14).toUpperCase()}` : s._id);

  const merchantName =
    merchantLookupMap.get((s.shipperAddress || "").toLowerCase()) ||
    s.createdBy?.name ||
    (s.metadata?.merchantName as string | undefined) ||
    undefined;

  const meta = s.metadata as Record<string, unknown> | undefined;
  let detail = "Package Dispatch";
  if (meta) {
    const pkgName = (meta.name as string) || "Package";
    const destination = (meta.destination as string) || "";
    if (destination) {
      detail = `${pkgName} → ${destination}`;
    } else if (meta.receiptNumber) {
      detail = `${pkgName} (${meta.receiptNumber})`;
    } else {
      detail = pkgName;
    }
  } else if (s.trackingCode) {
    detail = "Tracked Parcel";
  }

  const rawEvents = Array.isArray(s.events) ? s.events : [];
  const events: ShipmentCheckpoint[] = rawEvents.map((e) => {
    const ev = e as Record<string, unknown>;
    return {
      event: (ev.event as string) || (ev.status as string) || "Status Update",
      status: (ev.status as string) || undefined,
      location: (ev.location as string) || undefined,
      note: (ev.note as string) || (ev.resolutionNotes as string) || undefined,
      timestamp: ev.timestamp ? new Date(ev.timestamp as string | Date).toISOString() : undefined,
      onChainTxHash: (ev.onChainTxHash as string) || null,
    };
  });

  const hasEventTx = Boolean(
    events.some(
      (e) => typeof e?.onChainTxHash === "string" && e.onChainTxHash.startsWith("0x")
    )
  );
  const isAnchored = Boolean(
    s.onChainStatus === "anchored" ||
      (typeof s.onChainTxHash === "string" && s.onChainTxHash.startsWith("0x")) ||
      hasEventTx
  );

  const shipmentDetail: ShipmentDetail = {
    trackingCode: normalId,
    packageName: (meta?.name as string) || "Tracked Package",
    destination: (meta?.destination as string) || undefined,
    receiverName: (meta?.receiverName as string) || undefined,
    receiverPhone: (meta?.receiverPhone as string) || undefined,
    senderName: (meta?.senderName as string) || s.createdBy?.name || undefined,
    senderPhone: (meta?.senderPhone as string) || undefined,
    branchName: s.createdBy?.branchName || (meta?.branchName as string) || undefined,
    receiptNumber: (meta?.receiptNumber as string) || undefined,
    notes: (meta?.notes as string) || undefined,
    isDisputed,
    disputeReason: (doc.disputeReason as string) || (meta?.disputeReason as string) || null,
    disputeResolved: Boolean(s.disputeResolved),
    resolutionNotes: s.resolutionNotes || null,
    resolvedAt: s.resolvedAt ? new Date(s.resolvedAt).toISOString() : null,
    resolvedBy: s.resolvedBy || null,
    events,
    onChainTxHash: s.onChainTxHash || (doc.txHash as string) || null,
  };

  return {
    id: normalId,
    rawId: s._id,
    recordType: "shipment",
    merchantOrShipper: s.shipperAddress,
    merchantName,
    detail,
    status: s.status,
    isVoidedOrDisputed: isDisputed,
    onChainStatus: isAnchored ? "anchored" : (s.onChainStatus || "pending"),
    createdAt: s.createdAt,
    shipment: shipmentDetail,
  };
}
