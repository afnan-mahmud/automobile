import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { JOB_CARD_STATUSES, TASK_STATUSES, PHOTO_TYPES } from "@/types/jobCard";

export { JOB_CARD_STATUSES, TASK_STATUSES, PHOTO_TYPES };
export type { JobCardStatus, TaskStatus, PhotoType } from "@/types/jobCard";

const taskSchema = new Schema({

    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    description: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    priority: { type: Number, default: 1 },
    status: { type: String, enum: TASK_STATUSES, default: "pending" },
    assignedDate: { type: Date, required: true },
    completedDate: { type: Date, default: null },
    carriedForwardFromDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const partUsedSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: PHOTO_TYPES, required: true },
    caption: { type: String, trim: true },
  },
  { timestamps: true }
);

const jobCardSchema = new Schema(
  {
    jobCardNumber: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    status: { type: String, enum: JOB_CARD_STATUSES, default: "open" },
    tasks: { type: [taskSchema], default: [] },
    partsUsed: { type: [partUsedSchema], default: [] },
    photos: { type: [photoSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

jobCardSchema.index({ vehicleId: 1 });
jobCardSchema.index({ customerId: 1 });

export type JobCardDoc = InferSchemaType<typeof jobCardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const JobCard = models.JobCard || model("JobCard", jobCardSchema);
