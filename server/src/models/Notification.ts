import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "status"
  | "assignment"
  | "verification"
  | "reward"
  | "feedback"
  | "community"
  | "system";

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  issue?: Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    issue: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

NotificationSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.__v;
    ret.id = String(ret._id);
    return ret;
  },
});

export const Notification = model<INotification>("Notification", NotificationSchema);
