import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import SplitSessionModel from "@/lib/mongodb/splitSessionModel";
import {
  uploadPaymentQRToCloudinary,
  deletePaymentQRFromCloudinary,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

function getAuthenticatedUser(req: NextRequest): { userId: string; email?: string } | null {
  try {
    const token = req.cookies.get("capflow_token")?.value;
    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: string;
        email?: string;
      };
      return decoded;
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && process.env.JWT_SECRET) {
      const decoded = jwt.verify(
        authHeader.substring(7),
        process.env.JWT_SECRET
      ) as { userId: string; email?: string };
      return decoded;
    }
  } catch {
    // ignore jwt error
  }

  // Fallback for custom client header if available
  const headerUserId = req.headers.get("x-user-id");
  if (headerUserId) {
    return { userId: headerUserId };
  }

  return null;
}

// GET: Retrieve payment QR details for current user or requested user/member
export async function GET(req: NextRequest) {
  try {
    await connectMongoDB();
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId");

    // If a specific userId is queried (e.g. from Splitter receiver lookup)
    if (targetUserId) {
      const user = await User.findById(targetUserId).select(
        "name email avatar paymentQrCode upiId"
      );
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        userId: user._id.toString(),
        name: user.name,
        paymentQrCode: user.paymentQrCode || "",
        upiId: user.upiId || "",
      });
    }

    // Otherwise, retrieve for the authenticated user
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await User.findById(auth.userId).select(
      "name email avatar paymentQrCode paymentQrPublicId upiId"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      userId: user._id.toString(),
      name: user.name,
      paymentQrCode: user.paymentQrCode || "",
      paymentQrPublicId: user.paymentQrPublicId || "",
      upiId: user.upiId || "",
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/payment-qr:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment QR", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Upload or update payment QR code to Cloudinary and sync user profile
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { qrImage, upiId } = body;

    if (!qrImage || typeof qrImage !== "string") {
      return NextResponse.json(
        { error: "Valid QR code image (base64/data URL) is required" },
        { status: 400 }
      );
    }

    // Delete existing old QR from Cloudinary if replacing
    if (user.paymentQrPublicId) {
      deletePaymentQRFromCloudinary(user.paymentQrPublicId).catch(() => {});
    }

    // Upload new image to Cloudinary
    const uploadResult = await uploadPaymentQRToCloudinary(
      qrImage,
      user.name,
      user._id.toString()
    );

    // Save in user profile
    user.paymentQrCode = uploadResult.url;
    user.paymentQrPublicId = uploadResult.publicId;
    if (upiId !== undefined) {
      user.upiId = upiId.trim();
    }
    await user.save();

    // Propagate updated payment QR to all split sessions where user is a member
    try {
      await SplitSessionModel.updateMany(
        {
          $or: [
            { "members.userId": user._id.toString() },
            { "members.email": user.email.toLowerCase() },
          ],
        },
        {
          $set: {
            "members.$[elem].paymentQrCode": uploadResult.url,
            "members.$[elem].upiId": user.upiId || "",
          },
        },
        {
          arrayFilters: [
            {
              $or: [
                { "elem.userId": user._id.toString() },
                { "elem.email": user.email.toLowerCase() },
              ],
            },
          ],
        }
      );
    } catch (syncErr) {
      console.warn("Could not sync payment QR to existing split sessions:", syncErr);
    }

    return NextResponse.json({
      success: true,
      paymentQrCode: uploadResult.url,
      paymentQrPublicId: uploadResult.publicId,
      upiId: user.upiId || "",
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/payment-qr:", error);
    return NextResponse.json(
      { error: "Failed to upload payment QR", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove payment QR code from Cloudinary and clear user profile
export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.paymentQrPublicId) {
      await deletePaymentQRFromCloudinary(user.paymentQrPublicId);
    }

    user.paymentQrCode = "";
    user.paymentQrPublicId = "";
    user.upiId = "";
    await user.save();

    // Clear from split sessions where user is a member
    try {
      await SplitSessionModel.updateMany(
        {
          $or: [
            { "members.userId": user._id.toString() },
            { "members.email": user.email.toLowerCase() },
          ],
        },
        {
          $set: {
            "members.$[elem].paymentQrCode": "",
            "members.$[elem].upiId": "",
          },
        },
        {
          arrayFilters: [
            {
              $or: [
                { "elem.userId": user._id.toString() },
                { "elem.email": user.email.toLowerCase() },
              ],
            },
          ],
        }
      );
    } catch (syncErr) {
      console.warn("Could not clear payment QR from split sessions:", syncErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/user/payment-qr:", error);
    return NextResponse.json(
      { error: "Failed to remove payment QR", details: error.message },
      { status: 500 }
    );
  }
}
