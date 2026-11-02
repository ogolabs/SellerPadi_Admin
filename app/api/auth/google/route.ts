import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";
import {
  isAuthorizedAdminEmail,
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_SECONDS,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      credential?: string;
      token?: string;
    };
    const rawCredential = body.credential || body.token;

    if (!rawCredential || typeof rawCredential !== "string") {
      return NextResponse.json(
        { error: "Google authentication credential token is required." },
        { status: 400 }
      );
    }

    // Cryptographically verify Google ID token against official Google JWKS
    let payload;
    try {
      const result = await jwtVerify(rawCredential, GOOGLE_JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        clockTolerance: 15, // 15s clock drift leeway
      });
      payload = result.payload;
    } catch (verifyErr: unknown) {
      const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      console.error("[Google Auth Error] Token verification failed:", msg);
      return NextResponse.json(
        { error: `Google credential verification failed: ${msg}` },
        { status: 401 }
      );
    }

    const rawEmail = String(payload.email || "").trim().toLowerCase();

    if (!rawEmail) {
      return NextResponse.json(
        { error: "Unable to retrieve verified email from Google account payload." },
        { status: 400 }
      );
    }

    // Verify email against authorized admin whitelist
    if (!isAuthorizedAdminEmail(rawEmail)) {
      return NextResponse.json(
        {
          error: `Access Denied: "${rawEmail}" is not recognized on the admin whitelist.`,
          code: "UNAUTHORIZED_ADMIN_EMAIL",
          email: rawEmail,
        },
        { status: 403 }
      );
    }

    // Generate authenticated admin session token
    const token = await createAdminSessionToken(rawEmail);

    const response = NextResponse.json({
      success: true,
      email: rawEmail,
      message: "Admin authenticated successfully via Google.",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Auth Unhandled Exception]:", msg);
    return NextResponse.json(
      { error: `An unexpected authentication error occurred: ${msg}` },
      { status: 500 }
    );
  }
}
