import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransfer extends Document {
  tokenId: string;        // Short alphanumeric ID — used as the handoff token
  encryptedPayload: string; // Base64-encoded AES-256-GCM encrypted JSON blob
  iv: string;             // Initialization vector for AES-256-GCM decryption
  userId: string;         // Owner of the transfer session
  createdAt: Date;
  expiresAt: Date;        // TTL field — MongoDB auto-removes the doc at this time
}

const TransferSchema = new Schema<ITransfer>(
  {
    tokenId: { type: String, required: true, unique: true },
    encryptedPayload: { type: String, required: true },
    iv: { type: String, required: true },
    userId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB deletes the document when the current time surpasses expiresAt.
// expireAfterSeconds: 0 means "expire exactly at the value stored in expiresAt".
// The expiresAt value itself is set to Date.now() + 30 minutes at creation time.
TransferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Transfer: Model<ITransfer> =
  mongoose.models.Transfer || mongoose.model<ITransfer>('Transfer', TransferSchema);

export default Transfer;
