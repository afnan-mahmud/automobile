import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";
import { ATTENDANCE_STATUSES } from "@/types/attendance";

export { ATTENDANCE_STATUSES };
export type { AttendanceStatus } from "@/types/attendance";

const attendanceRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    hoursWorked: { type: Number, default: 0 },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: "present" },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export type AttendanceRecordDoc = InferSchemaType<typeof attendanceRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AttendanceRecord =
  models.AttendanceRecord || model("AttendanceRecord", attendanceRecordSchema);
