import { Schema, models, model } from "mongoose";

const systemSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SystemSetting =
  models.SystemSetting || model("SystemSetting", systemSettingSchema);
