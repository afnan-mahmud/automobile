/**
 * Enum-like constants shared between the JobCard Mongoose model and client
 * components. Kept dependency-free (no mongoose import) so client bundles
 * that need these values don't accidentally pull the Node-only Mongoose
 * driver into the browser bundle.
 */
export const JOB_CARD_STATUSES = ["open", "in_progress", "completed", "delivered"] as const;
export type JobCardStatus = (typeof JOB_CARD_STATUSES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "carried_forward"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PHOTO_TYPES = ["before", "after"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
