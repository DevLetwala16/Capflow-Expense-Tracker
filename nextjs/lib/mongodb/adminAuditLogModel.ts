import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminAuditLog extends Document {
  action:
    | "ADMIN_LOGIN"
    | "ADMIN_LOGOUT"
    | "USER_DELETED"
    | "USER_UPDATED"
    | "EMAIL_DISPATCHED"
    | "TICKET_STATUS_UPDATED"
    | "TICKET_REPLIED"
    | "SYSTEM_CONFIG_UPDATED";
  adminEmail: string;
  targetType: "User" | "Ticket" | "Email" | "System" | "Auth";
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "ADMIN_LOGIN",
        "ADMIN_LOGOUT",
        "USER_DELETED",
        "USER_UPDATED",
        "EMAIL_DISPATCHED",
        "TICKET_STATUS_UPDATED",
        "TICKET_REPLIED",
        "SYSTEM_CONFIG_UPDATED",
      ],
      index: true,
    },
    adminEmail: { type: String, required: true, default: "capflow@softcapphyjas.com" },
    targetType: {
      type: String,
      required: true,
      enum: ["User", "Ticket", "Email", "System", "Auth"],
    },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "Unknown" },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });

const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);

export default AdminAuditLog;
