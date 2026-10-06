import { Schema, model, Document, Types } from "mongoose";
import {
  CATEGORIES,
  Category,
  ISSUE_STATUSES,
  IssueStatus,
  URGENCIES,
  Urgency,
} from "../constants";

export interface IAttachment {
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  publicId?: string; // Cloudinary public id when stored remotely
}

export interface ITimelineEntry {
  status: IssueStatus;
  note?: string;
  by?: Types.ObjectId | null;
  byName?: string;
  at: Date;
}

export interface ICommunityVote {
  user: Types.ObjectId;
  verdict: "confirm" | "dispute";
  severity?: Urgency;
  at: Date;
}

export interface IIssue extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category: Category;
  status: IssueStatus;
  urgency: Urgency;
  location?: string; // human readable address
  ward?: string;
  coordinates?: { lat: number; lng: number };
  geo?: { type: "Point"; coordinates: [number, number] }; // [lng, lat] for 2dsphere queries
  reporter?: { name?: string; email?: string; phone?: string };
  reporterUser?: Types.ObjectId | null;
  attachments: IAttachment[];

  assignedDepartment?: Types.ObjectId | null;
  assignedTo?: Types.ObjectId | null;

  upvotes: Types.ObjectId[];
  upvoteCount: number;
  communityVotes: ICommunityVote[];
  communityVerified: boolean;

  possibleDuplicateOf?: Types.ObjectId | null;
  duplicateCount: number; // how many later reports were flagged as duplicates of this one

  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId | null;
  resolvedAt?: Date;
  rejectionReason?: string;
  resolutionNote?: string;

  feedback?: { satisfied: boolean; rating?: number; comment?: string; at: Date };
  timeline: ITimelineEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    publicId: { type: String },
  },
  { _id: false }
);

const TimelineSchema = new Schema<ITimelineEntry>(
  {
    status: { type: String, enum: ISSUE_STATUSES, required: true },
    note: String,
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    byName: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommunityVoteSchema = new Schema<ICommunityVote>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verdict: { type: String, enum: ["confirm", "dispute"], required: true },
    severity: { type: String, enum: URGENCIES },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const IssueSchema = new Schema<IIssue>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: "other", index: true },
    status: { type: String, enum: ISSUE_STATUSES, default: "pending", index: true },
    urgency: { type: String, enum: URGENCIES, default: "medium", index: true },
    location: { type: String, trim: true },
    ward: { type: String, trim: true, index: true },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    geo: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined },
    },
    reporter: { name: String, email: String, phone: String },
    reporterUser: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    attachments: { type: [AttachmentSchema], default: [] },

    assignedDepartment: { type: Schema.Types.ObjectId, ref: "Department", index: true, default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    upvotes: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    upvoteCount: { type: Number, default: 0, index: true },
    communityVotes: { type: [CommunityVoteSchema], default: [] },
    communityVerified: { type: Boolean, default: false },

    possibleDuplicateOf: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
    duplicateCount: { type: Number, default: 0 },

    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: Date,
    rejectionReason: String,
    resolutionNote: String,

    feedback: {
      satisfied: Boolean,
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      at: Date,
    },
    timeline: { type: [TimelineSchema], default: [] },
  },
  { timestamps: true }
);

// Keep the GeoJSON point in sync with the lat/lng pair the clients send.
IssueSchema.pre("validate", function (next) {
  const c = this.coordinates;
  if (c && typeof c.lat === "number" && typeof c.lng === "number") {
    this.geo = { type: "Point", coordinates: [c.lng, c.lat] };
  } else {
    this.geo = undefined;
  }
  next();
});

IssueSchema.index({ geo: "2dsphere" });
IssueSchema.index({ title: "text", description: "text", location: "text" });
IssueSchema.index({ createdAt: -1 });

IssueSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    delete ret.__v;
    delete ret.geo;
    ret.id = String(ret._id);
    return ret;
  },
});

export const Issue = model<IIssue>("Issue", IssueSchema);
