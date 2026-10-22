import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionDoc extends Document {
  endpoint: string;
  userId?: string;
  email?: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDoc>(
  {
    endpoint: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    email: { type: String, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const PushSubscription: Model<IPushSubscriptionDoc> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDoc>("PushSubscription", PushSubscriptionSchema);
