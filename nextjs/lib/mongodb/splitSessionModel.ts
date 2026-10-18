import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  SplitMember,
  SplitExpenseItem,
  SplitSettlement,
  SplitAuditLog,
  SplitTemplate,
} from '@/types/splitter';

export interface ISplitSessionDoc extends Document {
  sessionId: string;
  userId: string;
  name: string;
  description?: string;
  template: SplitTemplate;
  startDate: string;
  endDate: string;
  currency: string;
  budgetCap?: number;
  status: 'active' | 'settled';
  members: SplitMember[];
  expenses: SplitExpenseItem[];
  settlements: SplitSettlement[];
  auditLogs: SplitAuditLog[];
  createdAt: Date;
  updatedAt: Date;
}

const SplitMemberSchema = new Schema<SplitMember>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    handle: { type: String, required: true },
    color: { type: String, required: true },
    avatar: { type: String },
    isDependent: { type: Boolean, default: false },
    primaryPayerMemberId: { type: String },
    familyCount: { type: Number, default: 1 },
    userId: { type: String },
  },
  { _id: false }
);

const SplitExpenseItemSchema = new Schema<SplitExpenseItem>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    createdBy: {
      memberId: { type: String, required: true },
      name: { type: String, required: true },
    },
    paidBy: [
      {
        memberId: { type: String, required: true },
        amount: { type: Number, required: true },
        _id: false,
      },
    ],
    splitMode: { type: String, enum: ['equal', 'exact'], required: true },
    splits: [
      {
        memberId: { type: String, required: true },
        amount: { type: Number, required: true },
        _id: false,
      },
    ],
    considerFamilyMembers: { type: Boolean, default: true },
    memberWeights: { type: Map, of: Number },
    receiptImage: { type: String },
    notes: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { _id: false }
);

const SplitSettlementSchema = new Schema<SplitSettlement>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true },
    fromMemberId: { type: String, required: true },
    toMemberId: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    notes: { type: String },
    recordedBy: {
      memberId: { type: String, required: true },
      name: { type: String, required: true },
    },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const SplitAuditLogSchema = new Schema<SplitAuditLog>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true },
    timestamp: { type: String, required: true },
    memberId: { type: String },
    memberName: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const SplitSessionSchema = new Schema<ISplitSessionDoc>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    template: {
      type: String,
      enum: ['solo', 'family', 'group'],
      default: 'group',
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    currency: { type: String, default: 'INR' },
    budgetCap: { type: Number },
    status: { type: String, enum: ['active', 'settled'], default: 'active' },
    members: { type: [SplitMemberSchema], default: [] },
    expenses: { type: [SplitExpenseItemSchema], default: [] },
    settlements: { type: [SplitSettlementSchema], default: [] },
    auditLogs: { type: [SplitAuditLogSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes for fast lookup
SplitSessionSchema.index({ sessionId: 1, userId: 1 });
SplitSessionSchema.index({ 'members.userId': 1 });

const SplitSessionModel: Model<ISplitSessionDoc> =
  mongoose.models.SplitSession ||
  mongoose.model<ISplitSessionDoc>('SplitSession', SplitSessionSchema);

export default SplitSessionModel;
