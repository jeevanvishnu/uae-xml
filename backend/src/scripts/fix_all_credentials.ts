import "dotenv/config";
import { db } from "../db/db";
import { users, facilities } from "../db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function fixAllCredentials() {
  console.log("🔑 Synchronizing and fixing all credentials...");

  const hash = await bcrypt.hash("Password@123", 10);

  // 1. Get facility
  const [fac] = await db.select().from(facilities).limit(1);
  const facilityId = fac ? fac.id : null;

  const accounts = [
    { email: "superadmin@gmail.com", role: "superadmin" as const, name: "System Superadmin", facilityId: null },
    { email: "admin@alnoor.ae", role: "admin" as const, name: "Clinic Admin (Al Noor)", facilityId },
    { email: "admin@gmail.com", role: "admin" as const, name: "Admin", facilityId },
    { email: "reception@alnoor.ae", role: "reception" as const, name: "Sara Al Blooshi (Reception)", facilityId },
    { email: "doctor@alnoor.ae", role: "doctor" as const, name: "Dr. Tariq Al Hashimi", facilityId },
    { email: "billing@alnoor.ae", role: "billing" as const, name: "Omar Farooq (Billing)", facilityId },
    { email: "pharmacy@alnoor.ae", role: "pharmacist" as const, name: "Laila Nader (Pharmacist)", facilityId },
  ];

  for (const acc of accounts) {
    const [existing] = await db.select().from(users).where(eq(users.email, acc.email)).limit(1);
    if (existing) {
      await db
        .update(users)
        .set({
          password: hash,
          isBlocked: false,
          role: acc.role,
          facilityId: acc.facilityId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
      console.log(`✅ Updated password for ${acc.email} -> Password@123 (role: ${acc.role})`);
    } else {
      await db.insert(users).values({
        email: acc.email,
        password: hash,
        name: acc.name,
        role: acc.role,
        facilityId: acc.facilityId,
        isBlocked: false,
      });
      console.log(`✅ Created ${acc.email} with Password@123 (role: ${acc.role})`);
    }
  }

  console.log("\n🎉 ALL accounts now share the standard password: Password@123");
  process.exit(0);
}

fixAllCredentials().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
