import { Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/db";
import { facilities, clinicians, encounters, claimSubmissions, patients } from "../db/schema";

const updateFacilitySchema = z.object({
  name: z.string().min(2).optional(),
  emirate: z.enum(["DXB", "NE"]).optional(),
  licenseId: z.string().min(3).optional(),
  facilityType: z.enum(["CLINIC", "PHARMACY", "HOSPITAL"]).optional(),
  dispositionFlag: z.enum(["TEST", "PRODUCTION"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  hubUsername: z.string().optional(),
});

const createClinicianSchema = z.object({
  name: z.string().min(2, "Clinician name is required"),
  licenseNumber: z.string().min(3, "License number is required (e.g. MOH-DOC-XXXX)"),
  specialty: z.string().min(2, "Specialty is required"),
  department: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/facilities/current (Get Current Facility & Live Statistics)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCurrentFacility(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  try {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (!facility) {
      res.status(404).json({ success: false, message: "Facility not found." });
      return;
    }

    // Counts
    const [totalPatients, totalEncounters, totalClaims] = await Promise.all([
      db.select().from(patients).where(eq(patients.facilityId, facilityId)),
      db.select().from(encounters).where(eq(encounters.facilityId, facilityId)),
      db.select().from(claimSubmissions).where(eq(claimSubmissions.facilityId, facilityId)),
    ]);

    res.status(200).json({
      success: true,
      data: {
        facility: {
          ...facility,
          hubPasswordEnc: undefined, // Redact
        },
        stats: {
          patientsCount: totalPatients.length,
          encountersCount: totalEncounters.length,
          claimsCount: totalClaims.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[FACILITIES] 💥 Get facility error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/facilities/current (Update Facility Settings)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCurrentFacility(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = updateFacilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const [updated] = await db
      .update(facilities)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    res.status(200).json({
      success: true,
      message: "Facility configuration updated successfully.",
      data: { facility: updated },
    });
  } catch (error: any) {
    console.error("[FACILITIES] 💥 Update facility error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/facilities/clinicians (List Facility Clinicians)
// ─────────────────────────────────────────────────────────────────────────────
export async function getClinicians(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  try {
    const clinicianList = await db
      .select()
      .from(clinicians)
      .where(eq(clinicians.facilityId, facilityId))
      .orderBy(desc(clinicians.createdAt));

    res.status(200).json({
      success: true,
      data: { clinicians: clinicianList },
    });
  } catch (error: any) {
    console.error("[FACILITIES] 💥 Get clinicians error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/facilities/clinicians (Add New Clinician)
// ─────────────────────────────────────────────────────────────────────────────
export async function addClinician(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = createClinicianSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, licenseNumber, specialty, department } = parsed.data;

  try {
    const [newClinician] = await db
      .insert(clinicians)
      .values({
        facilityId,
        fullName: name,
        licenseNumber,
        specialty,
        department: department || null,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `Clinician ${name} (${licenseNumber}) added successfully.`,
      data: { clinician: newClinician },
    });
  } catch (error: any) {
    console.error("[FACILITIES] 💥 Add clinician error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
