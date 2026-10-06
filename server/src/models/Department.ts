import { Schema, model, Document, Types } from "mongoose";
import { CATEGORIES, Category } from "../constants";

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  color: string;
  categories: Category[]; // issues in these categories are auto-routed here
  contactEmail?: string;
  head?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true },
    color: { type: String, default: "#16a34a" },
    categories: { type: [String], enum: CATEGORIES, default: [] },
    contactEmail: { type: String, trim: true, lowercase: true },
    head: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    ret.id = String(ret._id);
    return ret;
  },
});

export const Department = model<IDepartment>("Department", DepartmentSchema);
