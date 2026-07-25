/**
 * Server Actions can only return plain JSON-serializable values across the
 * server/client boundary. Mongoose `.lean()` documents still contain
 * ObjectId and Date instances, so this converts them to plain
 * strings/primitives before returning from an action.
 */
export function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
