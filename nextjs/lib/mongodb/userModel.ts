import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
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
    avatar: { type: String },
    googleId: { type: String, sparse: true },
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
