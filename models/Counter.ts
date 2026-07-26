import { Schema, models, model } from "mongoose";

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = models.Counter || model("Counter", counterSchema);

/**
 * Atomically increments and returns the next sequence number for `name`.
 * findOneAndUpdate with upsert is a single atomic op, so concurrent callers
 * never receive the same seq value.
 */
export async function getNextSequence(name: string): Promise<number> {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq as number;
}

export async function generateSequentialCode(
  name: string,
  prefix: string,
  padLength = 6
): Promise<string> {
  const seq = await getNextSequence(name);
  return `${prefix}-${String(seq).padStart(padLength, "0")}`;
}
