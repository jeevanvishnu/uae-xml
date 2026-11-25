import "dotenv/config";
import { db } from "./db";
import {
  facilities,
  users,
  clinicians,
  patients,
  patientPolicies,
  icd10Codes,
  cptCodes,
} from "./schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  console.log("🌱 Starting UAE Healthcare & Claims Platform Database Seeding...");

  try {
    // 1. Seed Default Facility (Al Noor Medical Center - Northern Emirates / Riayati)
    const [existingFacility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.licenseId, "FAC-MOH-98765"))
      .limit(1);

    let facilityId: string;

    if (!existingFacility) {
      const [fac] = await db
        .insert(facilities)
        .values({
          name: "Al Noor Medical Center",
          emirate: "NE",
          licenseId: "FAC-MOH-98765",
          facilityType: "CLINIC",
          phone: "+971 6 555 1234",
          email: "info@alnoorclinic.ae",
          address: "King Faisal St, Sharjah, UAE",
          hubUsername: "ALNOOR_NE_01",
          hubPasswordEnc: "MOH_SECURE_TEST_CRED",
          dispositionFlag: "TEST",
        })
        .returning();
      facilityId = fac.id;
      console.log(`✅ Seeded Facility: ${fac.name} (SenderID: ${fac.licenseId})`);
    } else {
      facilityId = existingFacility.id;
      console.log(`ℹ️ Facility already exists: ${existingFacility.name}`);
    }

    const defaultPasswordHash = await bcrypt.hash("Password@123", 10);
    const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD || "testsuperadmin@2244";
    const superadminHash = await bcrypt.hash(superadminPassword, 10);

    // 2. Seed Users
    const usersToSeed = [
      {
        email: process.env.SEED_SUPERADMIN_EMAIL || "superadmin@gmail.com",
        password: superadminHash,
        name: "System Superadmin",
        role: "superadmin" as const,
        facilityId: null,
      },
      {
        email: "reception@alnoor.ae",
        password: defaultPasswordHash,
        name: "Sara Al Blooshi (Reception)",
        role: "reception" as const,
        facilityId,
      },
      {
        email: "doctor@alnoor.ae",
        password: defaultPasswordHash,
        name: "Dr. Tariq Al Hashimi",
        role: "doctor" as const,
        facilityId,
      },
      {
        email: "billing@alnoor.ae",
        password: defaultPasswordHash,
        name: "Omar Farooq (Billing Officer)",
        role: "billing" as const,
        facilityId,
      },
      {
        email: "pharmacy@alnoor.ae",
        password: defaultPasswordHash,
        name: "Laila Nader (Pharmacist)",
        role: "pharmacist" as const,
        facilityId,
      },
    ];

    let doctorUserId: string | null = null;

    for (const u of usersToSeed) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);

      if (!existing) {
        const [created] = await db.insert(users).values(u).returning();
        console.log(`✅ Seeded User: ${created.email} (${created.role})`);
        if (created.role === "doctor") doctorUserId = created.id;
      } else {
        await db
          .update(users)
          .set({ role: u.role, facilityId: u.facilityId, updatedAt: new Date() })
          .where(eq(users.id, existing.id));
        console.log(`ℹ️ Updated User: ${existing.email} (${u.role})`);
        if (existing.role === "doctor") doctorUserId = existing.id;
      }
    }

    // 3. Seed Clinician
    const [existingDoc] = await db
      .select()
      .from(clinicians)
      .where(eq(clinicians.licenseNumber, "MOH-DOC-4421"))
      .limit(1);

    if (!existingDoc) {
      await db.insert(clinicians).values({
        facilityId,
        userId: doctorUserId,
        fullName: "Dr. Tariq Al Hashimi",
        licenseNumber: "MOH-DOC-4421",
        specialty: "General Medicine",
        department: "Outpatient Clinic",
        isActive: true,
      });
      console.log("✅ Seeded Clinician: Dr. Tariq Al Hashimi (Lic: MOH-DOC-4421)");
    }

    // 4. Seed Sample Patients
    // Patient 1: Active Insurance
    const [p1] = await db
      .select()
      .from(patients)
      .where(eq(patients.emiratesId, "784-1988-1234567-1"))
      .limit(1);

    let patient1Id = p1?.id;
    if (!p1) {
      const [createdP1] = await db
        .insert(patients)
        .values({
          facilityId,
          emiratesId: "784-1988-1234567-1",
          fullName: "Ahmed Al Mansoori",
          dob: new Date("1988-05-12"),
          gender: "M",
          phone: "+971501234567",
          email: "ahmed.mansoori@example.ae",
          nationality: "United Arab Emirates",
          address: "Al Majaz 3, Sharjah",
          emergencyContact: "+971509988776 (Brother)",
        })
        .returning();
      patient1Id = createdP1.id;
      console.log(`✅ Seeded Patient 1: ${createdP1.fullName} (${createdP1.emiratesId})`);

      // Add Active Policy for Patient 1
      await db.insert(patientPolicies).values({
        patientId: patient1Id,
        facilityId,
        payerId: "INS-AXA-01",
        payerName: "AXA Gulf Insurance",
        memberId: "MEM-AXA-998811",
        policyNumber: "POL-776655",
        network: "Comprehensive Plus",
        copayPercent: 20,
        copayCap: 50,
        deductible: 0,
        expiryDate: new Date("2027-12-31"),
        eligibilityStatus: "ACTIVE",
        lastVerifiedAt: new Date(),
        eligibilityDetails: {
          coverage: "Active",
          benefits: ["General Consultation", "Pharmacy", "Laboratory", "Radiology"],
          copayNote: "20% up to 50 AED max per outpatient visit",
        },
      });
      console.log("✅ Seeded Active Policy for Ahmed Al Mansoori");
    }

    // Patient 2: Expired Policy (Testing Fallback / Self-Pay)
    const [p2] = await db
      .select()
      .from(patients)
      .where(eq(patients.emiratesId, "784-1995-7654321-2"))
      .limit(1);

    if (!p2) {
      const [createdP2] = await db
        .insert(patients)
        .values({
          facilityId,
          emiratesId: "784-1995-7654321-2",
          fullName: "Fatima Al Zaabi",
          dob: new Date("1995-10-20"),
          gender: "F",
          phone: "+971559876543",
          email: "fatima.zaabi@example.ae",
          nationality: "United Arab Emirates",
          address: "Al Taawun, Sharjah",
        })
        .returning();
      console.log(`✅ Seeded Patient 2: ${createdP2.fullName} (${createdP2.emiratesId})`);

      await db.insert(patientPolicies).values({
        patientId: createdP2.id,
        facilityId,
        payerId: "INS-DAMAN-01",
        payerName: "National Health Insurance (Daman)",
        memberId: "DAM-NE-10293",
        policyNumber: "POL-DAM-4422",
        network: "Silver",
        copayPercent: 20,
        copayCap: 50,
        deductible: 0,
        expiryDate: new Date("2026-01-01"), // Expired
        eligibilityStatus: "EXPIRED",
        lastVerifiedAt: new Date(),
        eligibilityDetails: {
          coverage: "Expired",
          reason: "Policy period ended on 01/01/2026",
        },
      });
      console.log("✅ Seeded Expired Policy for Fatima Al Zaabi");
    }

    // Patient 3: Passport (Tourist / Self-pay)
    const [p3] = await db
      .select()
      .from(patients)
      .where(eq(patients.passportNo, "N88921102"))
      .limit(1);

    if (!p3) {
      const [createdP3] = await db
        .insert(patients)
        .values({
          facilityId,
          passportNo: "N88921102",
          fullName: "Johnathan Doe",
          dob: new Date("1990-03-15"),
          gender: "M",
          phone: "+971523344556",
          email: "john.doe@example.com",
          nationality: "United Kingdom",
          address: "Corniche Hotel, Sharjah",
        })
        .returning();
      console.log(`✅ Seeded Tourist Patient: ${createdP3.fullName} (Passport: ${createdP3.passportNo})`);
    }

    // 5. Seed Core ICD-10 Diagnosis Codes
    const sampleICD10 = [
      { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory" },
      { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", category: "Digestive" },
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine" },
      { code: "I10", description: "Essential (primary) hypertension", category: "Circulatory" },
      { code: "M54.5", description: "Low back pain", category: "Musculoskeletal" },
      { code: "R50.9", description: "Fever, unspecified", category: "Symptoms & signs" },
      { code: "R05", description: "Cough", category: "Symptoms & signs" },
    ];

    for (const code of sampleICD10) {
      const [existing] = await db.select().from(icd10Codes).where(eq(icd10Codes.code, code.code)).limit(1);
      if (!existing) {
        await db.insert(icd10Codes).values(code);
      }
    }
    console.log(`✅ Seeded ${sampleICD10.length} Core ICD-10 codes`);

    // 6. Seed Core CPT Procedure Codes
    const sampleCPT = [
      { code: "99213", description: "Office or other outpatient visit, established patient, 15 minutes", category: "Evaluation & Management", defaultPrice: 150 },
      { code: "99214", description: "Office or other outpatient visit, established patient, 25 minutes", category: "Evaluation & Management", defaultPrice: 250 },
      { code: "99203", description: "Office or other outpatient visit, new patient, 30 minutes", category: "Evaluation & Management", defaultPrice: 300 },
      { code: "85025", description: "Complete Blood Count (CBC) with automated differential", category: "Laboratory", defaultPrice: 90 },
      { code: "80053", description: "Comprehensive Metabolic Panel (CMP)", category: "Laboratory", defaultPrice: 180 },
      { code: "71045", description: "Chest X-ray, single view", category: "Radiology", defaultPrice: 120 },
    ];

    for (const code of sampleCPT) {
      const [existing] = await db.select().from(cptCodes).where(eq(cptCodes.code, code.code)).limit(1);
      if (!existing) {
        await db.insert(cptCodes).values(code);
      }
    }
    console.log(`✅ Seeded ${sampleCPT.length} Core CPT codes`);

    console.log("✨ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

seedDatabase();
