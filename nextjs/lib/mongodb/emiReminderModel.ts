import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IEmiReminder extends Document {
  userId: string;
  clientEmiId: number; // Dexie EMI id — mirrors the client-side record
  name: string;
  monthlyCost: number;
  dueDay: number; // 1–31
  reminderLeadDays: number;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const emiReminderSchema = new Schema<IEmiReminder>({
  userId: { type: String, required: true, index: true },
  clientEmiId: { type: Number, required: true }, // Dexie EMI id
  name: { type: String, required: true },
  monthlyCost: { type: Number, required: true },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  reminderLeadDays: { type: Number, default: 3 },
  updatedAt: { type: Date, default: Date.now },
});

// Compound unique index: one record per user per client EMI id
emiReminderSchema.index({ userId: 1, clientEmiId: 1 }, { unique: true });

// ─── Model (safe for hot-reload in Next.js dev) ───────────────────────────────
const EmiReminder: Model<IEmiReminder> =
  mongoose.models.EmiReminder ||
  mongoose.model<IEmiReminder>("EmiReminder", emiReminderSchema);

export default EmiReminder;
