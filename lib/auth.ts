import fs from "fs";
import path from "path";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "SellerPadi_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 180 * 24 * 60 * 60; // 6 months (~180 days = 15,552,000 seconds)

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET || "SellerPadi_admin_internal_secret_key_change_in_production_min_32_chars";
  return new TextEncoder().encode(secret);
}

export function getAuthorizedAdminEmails(): string[] {
  let raw = process.env.ADMIN_EMAILS || "";

  // In non-production or if empty, also read from .env.local on disk to catch live edits without requiring server restart
  if (process.env.NODE_ENV !== "production" || !raw) {
    const candidatePaths = [
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), "admin", ".env.local"),
      path.resolve(__dirname, "../../.env.local"),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          const match = content.match(/^ADMIN_EMAILS=(.+)$/m);
          if (match && match[1]) {
            const diskValue = match[1].trim();
            raw = raw ? `${raw},${diskValue}` : diskValue;
            break;
          }
        }
      } catch {
        // Skip disk read errors in restricted environments
      }
    }
  }

  if (!raw) {
    raw = "adesholatajudeen1@gmail.com,support@sellerpadi.com";
  }

  // Parse, strip surrounding quotes, trim, lowercase
  const emails = raw
    .split(/[,;\n]/)
    .map((e) => e.replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  return Array.from(new Set(emails));
}

export function isAuthorizedAdminEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.replace(/^["']|["']$/g, "").trim().toLowerCase();
  const authorized = getAuthorizedAdminEmails();
  return authorized.includes(normalized);
}

export interface AdminSessionPayload {
  email: string;
  role: "superadmin" | "operator";
  iat?: number;
  exp?: number;
}

export async function createAdminSessionToken(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const secretKey = getSecretKey();

  return new SignJWT({ email: normalized, role: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email || !isAuthorizedAdminEmail(email)) {
      return null;
    }
    return {
      email,
      role: payload.role === "operator" ? "operator" : "superadmin",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

interface PendingOtp {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, PendingOtp>();

export function saveAdminOtp(email: string, code: string): void {
  const normalized = email.trim().toLowerCase();
  otpStore.set(normalized, {
    code: code.trim(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyAdminOtp(email: string, code: string): boolean {
  const normalized = email.trim().toLowerCase();
  const entry = otpStore.get(normalized);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    return false;
  }
  if (entry.code !== code.trim()) {
    return false;
  }
  otpStore.delete(normalized);
  return true;
}
