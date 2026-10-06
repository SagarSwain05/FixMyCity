import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, Role } from "../constants";

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  role: Role;
  department?: Types.ObjectId | null; // staff members belong to a department
  isActive: boolean;
  isPhoneVerified: boolean;
  address: IAddress;
  avatarUrl?: string;
  points: number;
  emailNotifications: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+91[0-9]{10}$/, "Please provide a valid Indian phone number starting with +91"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: "citizen", index: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    isActive: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    address: { type: AddressSchema, default: () => ({}) },
    avatarUrl: { type: String, trim: true },
    points: { type: Number, default: 0, min: 0, index: true },
    emailNotifications: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    delete ret.password;
    delete ret.__v;
    ret.id = String(ret._id);
    return ret;
  },
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
