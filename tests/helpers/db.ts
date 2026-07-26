import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | null = null;

export async function setupTestDatabase() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  // lib/db.ts caches its connection on globalThis for Next's dev hot-reload;
  // that cache can otherwise carry a dead connection over from a previous
  // test file's (already-stopped) in-memory server.
  const globalWithCache = globalThis as unknown as {
    _mongooseCache?: { conn: unknown; promise: unknown };
  };
  globalWithCache._mongooseCache = { conn: null, promise: null };

  await mongoose.connect(process.env.MONGODB_URI);
  globalWithCache._mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };
}

export async function teardownTestDatabase() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

export async function clearTestDatabase() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
