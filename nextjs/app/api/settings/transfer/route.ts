import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongoDB } from "@/lib/mongodb/connection";
import Transfer from "@/lib/mongodb/transferModel";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Encryption helpers — AES-256-GCM
// ---------------------------------------------------------------------------

const TRANSFER_SECRET = process.env.TRANSFER_SECRET ?? "capflow-dev-secret-do-not-use-in-prod!!";

/** Derives a 32-byte key from the secret using SHA-256 so any length secret works. */
function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(TRANSFER_SECRET).digest();
}

function encrypt(plaintext: string): { encryptedPayload: string; iv: string } {
  const key = deriveKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag

  // Store as: base64(encrypted || authTag) so we can verify integrity on decrypt
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encryptedPayload: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

function decrypt(encryptedPayload: string, ivBase64: string): string {
  const key = deriveKey();
  const iv = Buffer.from(ivBase64, "base64");
  const combined = Buffer.from(encryptedPayload, "base64");

  // Split off the 16-byte GCM auth tag appended during encrypt
  const authTag = combined.subarray(combined.length - 16);
  const encrypted = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

/** Generates an 8-character alphanumeric token (uppercase + digits). */
function generateTokenId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

// ---------------------------------------------------------------------------
// POST /api/settings/transfer — Push backup (create token)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload, userId } = body as { payload?: string; userId?: string };

    if (!payload || typeof payload !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'payload' field." },
        { status: 400 }
      );
    }
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'userId' field." },
        { status: 400 }
      );
    }

    const { encryptedPayload, iv } = encrypt(payload);
    const tokenId = generateTokenId();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    await connectMongoDB();

    await Transfer.create({
      tokenId,
      encryptedPayload,
      iv,
      userId,
      expiresAt,
    });

    return NextResponse.json({ tokenId, expiresAt }, { status: 201 });
  } catch (err) {
    console.error("[transfer/POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to create transfer token." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings/transfer?tokenId=XXX — Pull / restore (one-time use)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json(
        { error: "Missing 'tokenId' query parameter." },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const transfer = await Transfer.findOne({ tokenId });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer token not found." },
        { status: 404 }
      );
    }

    // Guard against documents that MongoDB TTL hasn't cleaned up yet
    if (transfer.expiresAt < new Date()) {
      await Transfer.deleteOne({ tokenId });
      return NextResponse.json(
        { error: "Transfer token has expired." },
        { status: 404 }
      );
    }

    // Check-only query parameter for source device polling to detect invalidation
    if (searchParams.get("check") === "true") {
      return NextResponse.json({ exists: true, expired: false });
    }

    const decryptedPayload = decrypt(transfer.encryptedPayload, transfer.iv);
    const originalUserId = transfer.userId;

    // One-time use — delete immediately after successful decrypt
    await Transfer.deleteOne({ tokenId });

    return NextResponse.json({ payload: decryptedPayload, originalUserId });
  } catch (err) {
    console.error("[transfer/GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve or decrypt transfer data." },
      { status: 500 }
    );
  }
}
