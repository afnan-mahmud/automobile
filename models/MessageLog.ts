import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

export const MESSAGE_CHANNELS = ["sms"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_STATUSES = ["sent", "failed", "pending"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

const messageLogSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    channel: { type: String, enum: MESSAGE_CHANNELS, default: "sms" },
    message: { type: String, required: true },
    status: { type: String, enum: MESSAGE_STATUSES, required: true },
    relatedJobCardId: { type: Schema.Types.ObjectId, ref: "JobCard", default: null },
    sentBy: { type: Schema.Types.ObjectId, ref: "User" },
    sentAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

messageLogSchema.index({ customerId: 1 });

export type MessageLogDoc = InferSchemaType<typeof messageLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessageLog = models.MessageLog || model("MessageLog", messageLogSchema);
