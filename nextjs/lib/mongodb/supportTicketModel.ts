import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISupportMessage {
  sender: "user" | "admin";
  senderEmail: string;
  senderName: string;
  message: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  subject: string;
  category:
    | "Account & Access"
    | "Splitter & Groups"
    | "EMI & Reminders"
    | "Transactions & Analytics"
    | "Bug Report"
    | "General";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
  messages: ISupportMessage[];
  lastRepliedBy?: "user" | "admin";
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    sender: { type: String, enum: ["user", "admin"], required: true },
    senderEmail: { type: String, required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: String },
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userPhone: { type: String, default: "" },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "Account & Access",
        "Splitter & Groups",
        "EMI & Reminders",
        "Transactions & Analytics",
        "Bug Report",
        "General",
      ],
      default: "General",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      index: true,
    },
    messages: [SupportMessageSchema],
    lastRepliedBy: { type: String, enum: ["user", "admin"], default: "user" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
