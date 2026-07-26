import mongoose, { Schema, type InferSchemaType, models, model } from "mongoose";

const salaryRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalHoursWorked: { type: Number, required: true },
    requiredHours: { type: Number, required: true },
    deduction: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

salaryRecordSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

export type SalaryRecordDoc = InferSchemaType<typeof salaryRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SalaryRecord = models.SalaryRecord || model("SalaryRecord", salaryRecordSchema);
