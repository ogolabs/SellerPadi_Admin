import mongoose, { Schema, Model } from "mongoose";

export function getMongoUri(): { uri: string; isTestnet: boolean } {
  const isNetTestnet = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== "mainnet";
  const uri = (process.env.MONGODB_URI || "").trim();
  return { uri, isTestnet: isNetTestnet };
}

declare global {
  var adminMongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

export async function connectAdminDb(): Promise<typeof mongoose> {
  const { uri } = getMongoUri();

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  const currentCache = globalThis.adminMongooseConnection || { conn: null, promise: null };
  if (!globalThis.adminMongooseConnection) {
    globalThis.adminMongooseConnection = currentCache;
  }

  if (currentCache.conn && currentCache.conn.connection.readyState === 1) {
    return currentCache.conn;
  }

  if (!currentCache.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    currentCache.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    currentCache.conn = await currentCache.promise;
  } catch (e) {
    currentCache.promise = null;
    throw e;
  }

  return currentCache.conn;
}

// Schemas & Models (Read & Telemetry optimized)

export interface IReceiptDoc {
  _id: string;
  receiptNumber?: string;
  merchantAddress: string;
  merchantName?: string;
  businessName?: string;
  total: number;
  currency: string;
  status: "Issued" | "Voided" | "issued" | "voided";
  paymentMethod: string;
  paymentStatus: string;
  onChainStatus?: "pending" | "anchored" | "failed";
  onChainTxHash?: string | null;
  items?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceiptDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, index: true },
    merchantName: { type: String, default: null },
    total: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    status: { type: String, default: "Issued", index: true },
    paymentMethod: { type: String, default: "Cash" },
    paymentStatus: { type: String, default: "paid" },
    onChainStatus: { type: String, default: "anchored", index: true },
    onChainTxHash: { type: String, default: null, index: true },
    items: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ReceiptSchema.virtual("receiptNumber").get(function (this: { _id: string }) {
  return this._id;
});

ReceiptSchema.virtual("businessName").get(function (this: { merchantName?: string }) {
  return this.merchantName || "Unnamed Store";
});

export interface IShipmentDoc {
  _id: string;
  shipperAddress: string;
  trackingCode?: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  isDisputed?: boolean;
  disputeResolved?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  createdBy?: {
    address?: string;
    name?: string;
    branchName?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  onChainStatus?: "pending" | "anchored" | "failed";
  onChainTxHash?: string | null;
  events?: Array<{
    event?: string;
    onChainTxHash?: string | null;
    timestamp?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipmentDoc>(
  {
    _id: { type: String, required: true },
    shipperAddress: { type: String, required: true, index: true },
    trackingCode: { type: String, default: null, index: true },
    status: { type: String, required: true },
    isDisputed: { type: Boolean, default: false },
    disputeResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolutionNotes: { type: String, default: null },
    createdBy: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    onChainStatus: { type: String, default: "anchored", index: true },
    onChainTxHash: { type: String, default: null, index: true },
    events: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, strict: false }
);

export type AuthProviderType = "google" | "email_otp" | "phone";

export interface IAuthenticator {
  providerType: AuthProviderType;
  providerKey: string;
  linkedAt: Date;
}

export type AccountAbstractionStandard = "ERC-4337" | "EIP-7702" | null;

export interface ICryptoIdentity {
  /** Our current $0 MVP tracking address */
  mvpVirtualAddress: string;
  /** Turnkey Sub-Organization ID (AWS Nitro Enclave) */
  turnkeySubOrgId?: string | null;
  /** Turnkey EVM Address: serves as EOA Signer (4337) or Target Account (7702) */
  turnkeyWalletAddress?: string | null;
  /** Account Abstraction designation */
  aaStandard?: AccountAbstractionStandard;
  /** Required explicitly for ERC-4337 (where Smart Account address != Turnkey address) */
  smartAccountAddress?: string | null;
}

export interface IMerchantVerification {
  status: "unverified" | "pending" | "verified" | "rejected";
  provider?: "didit" | string | null;
  sessionId?: string | null;
  verifiedAt?: Date | string | null;
  documentType?: string | null;
  fullName?: string | null;
  documentNumberMasked?: string | null;
  issuingCountry?: string | null;
  expirationDate?: string | null;
  dateOfBirth?: string | null;
  rejectionReason?: string | null;
}

export interface IUserDoc {
  _id: string;
  eoaAddress?: string;
  walletPublicAddress?: string;
  displayName?: string | null;
  fullName: string;
  companyName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessHandle?: string;
  role: "user" | "merchant";
  authenticators?: IAuthenticator[];
  cryptoIdentity?: ICryptoIdentity | null;
  country?: string;
  currency?: string;
  plan?: string;
  operatingMode?: "sales" | "dispatch" | "hybrid" | null;
  subscriptionActive?: boolean;
  operationsThisMonth?: number;
  rolloverQuota?: number;
  overageCharges?: number;
  billingCycle?: "monthly" | "yearly";
  billingInterval?: "monthly" | "yearly";
  billingCycleStart?: Date | null;
  billingCycleEnd?: Date | null;
  queuedSubscription?: {
    plan: string;
    billingInterval: "monthly" | "yearly";
    operationsLimit: number;
    startsAt: Date;
    endsAt: Date;
  } | null;
  reportPreferences?: {
    enabled: boolean;
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    yearly: boolean;
    includeSales: boolean;
    includeInventory: boolean;
  } | null;
  reportsSent?: {
    lastDailyReport?: Date | null;
    lastWeeklyReport?: Date | null;
    lastMonthlyReport?: Date | null;
    lastYearlyReport?: Date | null;
  } | null;
  isSuspended?: boolean;
  businessAddress?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  verification?: IMerchantVerification | null;
  authProvider?: string | null;
  createdAt: Date;
}

const AuthenticatorSchema = new Schema<IAuthenticator>(
  {
    providerType: {
      type: String,
      enum: ["google", "email_otp", "phone"],
      required: true,
    },
    providerKey: {
      type: String,
      required: true,
      trim: true,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const CryptoIdentitySchema = new Schema<ICryptoIdentity>(
  {
    mvpVirtualAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    turnkeySubOrgId: {
      type: String,
      default: null,
      trim: true,
    },
    turnkeyWalletAddress: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    aaStandard: {
      type: String,
      enum: ["ERC-4337", "EIP-7702", null],
      default: null,
    },
    smartAccountAddress: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    eoaAddress: { type: String, default: null, lowercase: true, index: true },
    walletPublicAddress: { type: String, default: null, lowercase: true },
    displayName: { type: String, default: null },
    fullName: { type: String, required: true },
    companyName: { type: String, default: null },
    businessEmail: { type: String, default: null },
    businessPhone: { type: String, default: null },
    businessHandle: { type: String, default: null },
    authProvider: { type: String, default: null },
    role: { type: String, default: "user", index: true },
    authenticators: {
      type: [AuthenticatorSchema],
      default: [],
    },
    cryptoIdentity: {
      type: CryptoIdentitySchema,
      default: null,
    },
    country: { type: String, default: null },
    currency: { type: String, default: null },
    plan: { type: String, default: "free" },
    operatingMode: { type: String, default: null },
    subscriptionActive: { type: Boolean, default: false },
    operationsThisMonth: { type: Number, default: 0 },
    rolloverQuota: { type: Number, default: 0 },
    overageCharges: { type: Number, default: 0 },
    billingCycle: { type: String, default: "monthly" },
    billingInterval: { type: String, default: "monthly" },
    billingCycleStart: { type: Date, default: null },
    billingCycleEnd: { type: Date, default: null },
    queuedSubscription: { type: Schema.Types.Mixed, default: null },
    reportPreferences: { type: Schema.Types.Mixed, default: null },
    reportsSent: { type: Schema.Types.Mixed, default: null },
    isSuspended: { type: Boolean, default: false },
    businessAddress: { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    verification: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

UserSchema.index(
  { "authenticators.providerType": 1, "authenticators.providerKey": 1 },
  { sparse: true }
);

UserSchema.index(
  { "cryptoIdentity.mvpVirtualAddress": 1 },
  { sparse: true }
);

UserSchema.index(
  { "cryptoIdentity.turnkeyWalletAddress": 1 },
  { sparse: true }
);

UserSchema.index(
  { "cryptoIdentity.smartAccountAddress": 1 },
  { sparse: true }
);

export interface IBranchDoc {
  _id: string;
  merchantAddress: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  managedBy?: string | null;
  managerName?: string | null;
  managerAddress?: string | null;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranchDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    location: { type: String, default: null },
    phone: { type: String, default: null },
    managedBy: { type: String, default: null },
    managerName: { type: String, default: null },
    managerAddress: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export interface ITeamMemberDoc {
  _id: string;
  merchantAddress: string;
  branchId: string;
  branchName: string;
  memberEmail: string;
  memberPhone?: string | null;
  memberAddress?: string | null;
  memberName: string;
  role: "manager" | "sales_rep";
  status: "active" | "suspended";
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date | null;
  suspendedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMemberDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    branchId: { type: String, required: true, index: true },
    branchName: { type: String, required: true },
    memberEmail: { type: String, required: true, lowercase: true, index: true },
    memberPhone: { type: String, default: null },
    memberAddress: { type: String, default: null },
    memberName: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: "active" },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AdminReceipt: Model<IReceiptDoc> =
  mongoose.models.AdminReceipt || mongoose.model<IReceiptDoc>("AdminReceipt", ReceiptSchema, "receipts");

export const AdminShipment: Model<IShipmentDoc> =
  mongoose.models.AdminShipment || mongoose.model<IShipmentDoc>("AdminShipment", ShipmentSchema, "shipments");

export const AdminUser: Model<IUserDoc> =
  mongoose.models.AdminUser || mongoose.model<IUserDoc>("AdminUser", UserSchema, "users");

export const AdminBranch: Model<IBranchDoc> =
  mongoose.models.AdminBranch || mongoose.model<IBranchDoc>("AdminBranch", BranchSchema, "branches");

export const AdminTeamMember: Model<ITeamMemberDoc> =
  mongoose.models.AdminTeamMember || mongoose.model<ITeamMemberDoc>("AdminTeamMember", TeamMemberSchema, "teammembers");

export interface IInventoryProductDoc {
  _id: string;
  merchantAddress: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  costPrice?: number | null;
  sellingPrice: number;
  trackStock: boolean;
  totalStock: number;
  lowStockAlert: number;
  salesCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const InventoryProductSchema = new Schema<IInventoryProductDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    sku: { type: String, default: null },
    category: { type: String, default: null },
    costPrice: { type: Number, default: null },
    sellingPrice: { type: Number, required: true },
    trackStock: { type: Boolean, default: true },
    totalStock: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 5 },
    salesCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, strict: false }
);

export const AdminInventoryProduct: Model<IInventoryProductDoc> =
  mongoose.models.AdminInventoryProduct ||
  mongoose.model<IInventoryProductDoc>("AdminInventoryProduct", InventoryProductSchema, "inventoryproducts");

export interface IAdminAuditLogDoc {
  _id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLogDoc>(
  {
    _id: { type: String, required: true },
    adminEmail: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "admin_audit_logs" }
);

export const AdminAuditLog: Model<IAdminAuditLogDoc> =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLogDoc>("AdminAuditLog", AdminAuditLogSchema, "admin_audit_logs");

export interface IPushSubscriptionDoc {
  _id: string;
  ownerAddress: string;
  endpoint: string;
  keys: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDoc>(
  {
    _id: { type: String, required: true },
    ownerAddress: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, index: true },
    keys: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "pushsubscriptions" }
);

export const AdminPushSubscription: Model<IPushSubscriptionDoc> =
  mongoose.models.AdminPushSubscription ||
  mongoose.model<IPushSubscriptionDoc>("AdminPushSubscription", PushSubscriptionSchema, "pushsubscriptions");

export interface IAdminVendorDoc {
  _id: string;
  merchantAddress: string;
  name: string;
  companyName?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  paymentTermsDays?: number;
  notes?: string | null;
  totalPurchased: number;
  totalPaid: number;
  totalOwed: number;
  billsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminVendorSchema = new Schema<IAdminVendorDoc>(
  {
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, default: null, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    address: { type: String, default: null, trim: true },
    paymentTermsDays: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null },
    totalPurchased: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    totalOwed: { type: Number, default: 0, min: 0 },
    billsCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "vendors" }
);

export const AdminVendor: Model<IAdminVendorDoc> =
  mongoose.models.AdminVendor ||
  mongoose.model<IAdminVendorDoc>("AdminVendor", AdminVendorSchema, "vendors");

export interface IAdminVendorBillDoc {
  _id: string;
  billNumber: string;
  merchantAddress: string;
  vendorId: string;
  vendorName: string;
  branchId?: string | null;
  branchName?: string | null;
  items: Array<{
    productName: string;
    sku?: string | null;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    sellingPrice?: number | null;
  }>;
  subtotal: number;
  tax: number;
  shippingFee: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: "unpaid" | "partially_paid" | "paid";
  issueDate?: Date;
  billDate?: Date;
  dueDate?: Date | null;
  notes?: string | null;
  paymentHistory?: Array<{
    paymentId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    reference?: string | null;
    recordedBy: {
      address: string;
      name: string;
      role?: string | null;
    };
    createdAt: Date;
  }>;
  payments?: Array<{
    paymentId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    reference?: string | null;
    recordedBy: {
      address: string;
      name: string;
      role?: string | null;
    };
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminVendorBillItemSubSchema = new Schema(
  {
    productName: { type: String, required: true },
    sku: { type: String, default: null },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    sellingPrice: { type: Number, default: null },
  },
  { _id: false }
);

const AdminVendorBillPaymentSubSchema = new Schema(
  {
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: "Bank Transfer" },
    reference: { type: String, default: null },
    recordedBy: {
      address: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, default: null },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AdminVendorBillSchema = new Schema<IAdminVendorBillDoc>(
  {
    billNumber: { type: String, required: true, trim: true, index: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    vendorId: { type: String, required: true, index: true },
    vendorName: { type: String, required: true, trim: true },
    branchId: { type: String, default: null, index: true },
    branchName: { type: String, default: null },
    items: { type: [AdminVendorBillItemSubSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "partially_paid", "paid"], default: "unpaid", index: true },
    issueDate: { type: Date, default: Date.now },
    billDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: null },
    paymentHistory: { type: [AdminVendorBillPaymentSubSchema], default: [] },
    payments: { type: [AdminVendorBillPaymentSubSchema], default: [] },
  },
  { timestamps: true, collection: "vendorbills" }
);

export const AdminVendorBill: Model<IAdminVendorBillDoc> =
  mongoose.models.AdminVendorBill ||
  mongoose.model<IAdminVendorBillDoc>("AdminVendorBill", AdminVendorBillSchema, "vendorbills");



