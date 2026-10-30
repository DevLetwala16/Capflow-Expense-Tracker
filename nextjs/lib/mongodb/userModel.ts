import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  paymentQrCode?: string;
  paymentQrPublicId?: string;
  upiId?: string;
  googleId?: string;
  facebookId?: string;
  appleId?: string;
  otpHash?: string;
  otpExpiry?: Date;
  preferences: {
    emailNotifications: {
      emiReminders: boolean;
      monthlyStatement: boolean;
      emiEmailSync: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phone: { type: String, default: "" },
    avatar: { type: String },
    paymentQrCode: { type: String },
    paymentQrPublicId: { type: String },
    upiId: { type: String },
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },
    otpHash: { type: String },
    otpExpiry: { type: Date },
    preferences: {
      emailNotifications: {
        emiReminders: { type: Boolean, default: false },
        monthlyStatement: { type: Boolean, default: false },
        emiEmailSync: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
