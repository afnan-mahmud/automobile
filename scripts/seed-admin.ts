import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

async function main() {
  loadEnv({ path: ".env.local", quiet: true });

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local before running this script"
    );
  }

  await connectToDatabase();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Admin user already exists for ${email}, skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    name: "Admin",
    email: email.toLowerCase(),
    passwordHash,
    role: "admin",
    active: true,
  });

  console.log(`Admin user created for ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
