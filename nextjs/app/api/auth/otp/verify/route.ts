import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = otp.toString().trim();

    await connectMongoDB();

    // SPECIAL ADMIN BYPASS CHECK: capflow@softcapphyjas.com with master OTP 100283
    if (normalizedEmail === "capflow@softcapphyjas.com" && normalizedOtp === "100283") {
      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        user = await User.create({
          email: normalizedEmail,
          name: "CapFlow Master Admin",
          role: "admin",
          preferences: {
            emailNotifications: {
              emiReminders: false,
              monthlyStatement: false,
              emiEmailSync: false,
            },
          },
        });
      } else if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }

      // Clear any OTP fields
      user.otpHash = undefined;
      user.otpExpiry = undefined;
      await user.save();

      // Issue admin session JWT containing { role: 'admin', email: 'capflow@softcapphyjas.com' }
      const secret = process.env.JWT_SECRET || "capflow-fallback-admin-secret-2026";
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, role: "admin" },
        secret,
        { expiresIn: (process.env.JWT_EXPIRY || "90d") as `${number}d` }
      );

      const response = NextResponse.json({
        success: true,
        role: "admin",
        redirectUrl: "/admin/dashboard",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: "admin",
          phone: user.phone || "",
          avatar: user.avatar,
        },
      });

      // Secure HTTP-only cookies
      response.cookies.set("capflow_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      });

      response.cookies.set("capflow_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.otpHash || !user.otpExpiry) {
      return NextResponse.json({ error: "No OTP requested. Please request a new code." }, { status: 400 });
    }

    if (new Date() > user.otpExpiry) {
      return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    const hash = crypto.createHash("sha256").update(otp + process.env.JWT_SECRET).digest("hex");

    if (hash !== user.otpHash) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // Clear OTP
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRY || "90d") as `${number}d` }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        avatar: user.avatar,
      },
    });

    response.cookies.set("capflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
