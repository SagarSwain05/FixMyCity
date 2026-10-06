import { Schema, model, Document, Types } from "mongoose";

export type RewardReason =
  | "ISSUE_REPORTED"
  | "ISSUE_VERIFIED"
  | "ISSUE_RESOLVED"
  | "ISSUE_REJECTED"
  | "COMMUNITY_VERIFICATION"
  | "WEEKLY_BONUS"
  | "ADJUSTMENT";

export interface IRewardTransaction extends Document {
  user: Types.ObjectId;
  points: number; // positive or negative
  reason: RewardReason;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const RewardTransactionSchema = new Schema<IRewardTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RewardTransactionSchema.index({ user: 1, createdAt: -1 });

export const RewardTransaction = model<IRewardTransaction>(
  "RewardTransaction",
  RewardTransactionSchema
);
