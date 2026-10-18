export type SplitTemplate = 'solo' | 'family' | 'group';

export type SplitMode = 'equal' | 'exact';

export interface SplitMember {
  id: string; // unique internal identifier (e.g. member_1, uuid)
  name: string;
  phone?: string;
  email?: string;
  handle: string; // e.g. @rahul
  color: string; // hex color for avatar/badge
  avatar?: string;
  isDependent: boolean; // if true, financial liability is routed to primaryPayerMemberId
  primaryPayerMemberId?: string; // id of independent member who covers their dues
  familyCount?: number; // Number of family members represented (default 1, e.g. 4 for family of 4)
  userId?: string; // optional linked CapFlow user account ID
}

export interface SplitPayerEntry {
  memberId: string;
  amount: number;
}

export interface SplitShareEntry {
  memberId: string;
  amount: number;
}

export interface SplitExpenseItem {
  id: string;
  sessionId: string;
  title: string;
  amount: number; // 2-decimal rounded
  currency: string;
  category: string;
  date: string; // ISO string
  createdBy: {
    memberId: string;
    name: string;
  };
  paidBy: SplitPayerEntry[]; // Supports single payer or multi-payer
  splitMode: SplitMode;
  splits: SplitShareEntry[]; // Exact breakdown allocated per participant
  considerFamilyMembers?: boolean; // Whether family headcount is factored into splitting
  memberWeights?: Record<string, number>; // Custom headcount weights applied for this expense
  receiptImage?: string; // Base64 data URL
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitSettlement {
  id: string;
  sessionId: string;
  fromMemberId: string; // who paid
  toMemberId: string;   // who received
  amount: number;
  date: string;
  notes?: string;
  recordedBy: {
    memberId: string;
    name: string;
  };
  createdAt: string;
}

export interface SplitAuditLog {
  id: string;
  sessionId: string;
  timestamp: string;
  memberId?: string;
  memberName: string;
  action: string;
  details?: string;
}

export interface SplitSession {
  id?: number; // local Dexie autoincrement ID
  sessionId: string; // Globally unique identifier, e.g. CAP-SPLIT-9821-X
  userId: string; // creator user ID
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
  createdAt: string;
  updatedAt: string;
}

export interface MemberNetPosition {
  memberId: string;
  memberName: string;
  handle: string;
  color: string;
  isDependent: boolean;
  primaryPayerMemberId?: string;
  primaryPayerName?: string;
  
  // Consumption: total value of items consumed/participated in
  individualSpend: number;
  
  // Direct amount out-of-pocket paid towards group expenses
  totalPaid: number;
  
  // Total liabilities assigned directly to this member (before routing)
  directOwed: number;
  
  // Total liabilities absorbed from dependents (if this member is a primary payer)
  dependentLiabilitiesAbsorbed: number;
  
  // Settlements: amounts paid to others and received from others
  settlementsPaid: number;
  settlementsReceived: number;
  
  // Final Net Balance: Total Paid + Settlements Paid - Total Effective Liability - Settlements Received
  // Positive (> 0) => Gets back (Creditor)
  // Negative (< 0) => Owes (Debtor)
  // Zero (0) => Settled up
  netBalance: number;
}

export interface SettlementTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}
