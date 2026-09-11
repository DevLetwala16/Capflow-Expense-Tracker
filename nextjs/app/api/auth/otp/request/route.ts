import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import { sendOTPEmail } from "@/lib/email/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await connectMongoDB();

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp + process.env.JWT_SECRET).digest("hex");
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: { otpHash, otpExpiry },
        $setOnInsert: {
          email: email.toLowerCase(),
          name: email.split("@")[0],
          preferences: {
            emailNotifications: {
              emiReminders: false,
              monthlyStatement: false,
              emiEmailSync: false,
            },
          },
        },
      },
      { upsert: true, new: true }
    );

    const sendResult = await sendOTPEmail(email, otp, user.name);

    return NextResponse.json({
      success: true,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error: any) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
