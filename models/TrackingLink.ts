import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const trackingLinkSchema = new Schema(
  {
    jobCardId: { type: Schema.Types.ObjectId, ref: "JobCard", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type TrackingLinkDoc = InferSchemaType<typeof trackingLinkSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TrackingLink =
  models.TrackingLink || model("TrackingLink", trackingLinkSchema);
