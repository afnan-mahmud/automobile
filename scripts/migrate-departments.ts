import "dotenv/config";
import { mongoose } from "mongoose";
import { connectToDatabase } from "../lib/db";
import { Employee } from "../models/Employee";

async function main() {
  await connectToDatabase();
  console.log("Connected to DB.");

  const employees = await Employee.find({});
  console.log(`Found ${employees.length} employees to migrate.`);

  let migrated = 0;
  for (const emp of employees) {
    if (emp.get("department") && (!emp.departments || emp.departments.length === 0)) {
      const dept = emp.get("department");
      emp.departments = [dept];
      await emp.save();
      migrated++;
    }
  }

  // To cleanly remove the old `department` field:
  await Employee.updateMany({}, { $unset: { department: "" } }, { strict: false });

  console.log(`Successfully migrated ${migrated} employees.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
