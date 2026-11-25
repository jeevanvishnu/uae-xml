import { Request, Response } from "express";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/db";
import {
  prescriptions,
  encounters,
  patients,
  patientPolicies,
  clinicians,
  facilities,
  paymentTransactions,
} from "../db/schema";
import {
  createPrescriptionSchema,
  dispensePrescriptionSchema,
} from "../validators/prescription.validator";
import { buildErxXml } from "../services/xml/erxBuilder.service";

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/prescriptions (Generate & Issue eRx from Encounter)
// ─────────────────────────────────────────────────────────────────────────────
export async function createPrescription(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = createPrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const data = parsed.data;

  try {
    // 1. Fetch Encounter
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(and(eq(encounters.id, data.encounterId), eq(encounters.facilityId, facilityId)))
      .limit(1);

    if (!encounter) {
      res.status(404).json({ success: false, message: "Encounter not found." });
      return;
    }

    // 2. Fetch Patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, encounter.patientId))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    // 3. Fetch Facility
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    // 4. Fetch Policy if any
    let policy = null;
    if (encounter.policyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, encounter.policyId))
        .limit(1);
      policy = pol || null;
    }

    // 5. Fetch Clinician
    let clinician = null;
    const clinicianId = data.clinicianId || encounter.clinicianId;
    if (clinicianId) {
      const [clin] = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.id, clinicianId))
        .limit(1);
      clinician = clin || null;
    }

    // 6. Generate Reference Number: ERX-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const erxRefNo = `ERX-${dateStr}-${randomSuffix}`;

    // 7. Build XML Document
    const erxXml = buildErxXml({
      erxRefNo,
      senderId: facility?.licenseId || "FAC-MOH-98765",
      receiverId: policy?.payerId || "MOHAP-POST-OFFICE",
      dispositionFlag: facility?.dispositionFlag || "TEST",
      clinicianLicense: clinician?.licenseNumber || "MOH-DOC-4421",
      patient: {
        memberId: policy?.memberId,
        emiratesId: patient.emiratesId || undefined,
        fullName: patient.fullName,
      },
      medications: data.medications,
    });

    // 8. Insert Prescription into Database
    const [newPrescription] = await db
      .insert(prescriptions)
      .values({
        facilityId,
        encounterId: data.encounterId,
        patientId: patient.id,
        clinicianId: clinician?.id || null,
        erxRefNo,
        medications: data.medications,
        dispenseStatus: "PENDING",
        erxXmlKey: erxXml, // Store generated XML payload directly
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "e-Prescription created and published successfully.",
      data: {
        prescription: newPrescription,
        xml: erxXml,
      },
    });
  } catch (error: any) {
    console.error("[PRESCRIPTIONS] 💥 Create prescription error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/prescriptions (List Prescriptions)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPrescriptions(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const status = req.query.status as string;
  const patientId = req.query.patient_id as string;
  const encounterId = req.query.encounter_id as string;

  try {
    let conditions = [];
    if (facilityId) conditions.push(eq(prescriptions.facilityId, facilityId));
    if (status) conditions.push(eq(prescriptions.dispenseStatus, status));
    if (patientId) conditions.push(eq(prescriptions.patientId, patientId));
    if (encounterId) conditions.push(eq(prescriptions.encounterId, encounterId));

    const list = await db
      .select()
      .from(prescriptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prescriptions.createdAt))
      .limit(50);

    // Hydrate with Patient & Clinician
    const patientIds = Array.from(new Set(list.map((p) => p.patientId)));
    let patientsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const pats = await db.select().from(patients);
      for (const p of pats) patientsMap[p.id] = p;
    }

    const hydrated = list.map((p) => ({
      ...p,
      patient: patientsMap[p.patientId] || null,
    }));

    res.status(200).json({ success: true, data: { prescriptions: hydrated } });
  } catch (error: any) {
    console.error("[PRESCRIPTIONS] 💥 List prescriptions error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/prescriptions/lookup (Pharmacy eRx Lookup by Reference or EID)
// ─────────────────────────────────────────────────────────────────────────────
export async function lookupPrescriptions(req: Request, res: Response): Promise<void> {
  const ref = req.query.ref as string;
  const emiratesId = req.query.emirates_id as string;

  try {
    if (!ref && !emiratesId) {
      res.status(400).json({
        success: false,
        message: "Please provide either eRx reference number or Emirates ID to lookup.",
      });
      return;
    }

    let foundPatientIds: string[] = [];
    if (emiratesId) {
      const cleanEid = emiratesId.replace(/-/g, "");
      const matchedPatients = await db
        .select()
        .from(patients)
        .where(
          or(
            ilike(patients.emiratesId, `%${emiratesId}%`),
            ilike(patients.emiratesId, `%${cleanEid}%`)
          )
        );
      foundPatientIds = matchedPatients.map((p) => p.id);
    }

    let queryConditions = [];
    if (ref) {
      queryConditions.push(ilike(prescriptions.erxRefNo, `%${ref.trim()}%`));
    }
    if (foundPatientIds.length > 0) {
      for (const pid of foundPatientIds) {
        queryConditions.push(eq(prescriptions.patientId, pid));
      }
    }

    if (queryConditions.length === 0) {
      res.status(200).json({ success: true, data: { prescriptions: [] } });
      return;
    }

    const results = await db
      .select()
      .from(prescriptions)
      .where(or(...queryConditions))
      .orderBy(desc(prescriptions.createdAt))
      .limit(20);

    // Hydrate
    const patientIds = Array.from(new Set(results.map((p) => p.patientId)));
    let patientsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const pats = await db.select().from(patients);
      for (const p of pats) patientsMap[p.id] = p;
    }

    const hydrated = results.map((p) => ({
      ...p,
      patient: patientsMap[p.patientId] || null,
    }));

    res.status(200).json({ success: true, data: { prescriptions: hydrated } });
  } catch (error: any) {
    console.error("[PRESCRIPTIONS] 💥 Lookup prescription error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/prescriptions/:id (Get Single Prescription Details)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPrescriptionById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id))
      .limit(1);

    if (!prescription) {
      res.status(404).json({ success: false, message: "Prescription not found." });
      return;
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, prescription.patientId))
      .limit(1);

    let clinician = null;
    if (prescription.clinicianId) {
      const [c] = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.id, prescription.clinicianId))
        .limit(1);
      clinician = c || null;
    }

    let policy = null;
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, prescription.encounterId))
      .limit(1);

    if (encounter?.policyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, encounter.policyId))
        .limit(1);
      policy = pol || null;
    }

    res.status(200).json({
      success: true,
      data: {
        prescription: {
          ...prescription,
          patient,
          clinician,
          policy,
          encounter,
        },
      },
    });
  } catch (error: any) {
    console.error("[PRESCRIPTIONS] 💥 Get prescription error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/prescriptions/:id/dispense (Pharmacist Dispenses Medications)
// ─────────────────────────────────────────────────────────────────────────────
export async function dispensePrescription(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const facilityId = req.user?.facilityId;
  const userId = req.user?.id;

  const parsed = dispensePrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { copayCollected, paymentMethod, notes } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, message: "Prescription not found." });
      return;
    }

    if (existing.dispenseStatus === "DISPENSED") {
      res.status(400).json({
        success: false,
        message: "Prescription has already been dispensed.",
      });
      return;
    }

    // 1. Mark as DISPENSED
    const [updated] = await db
      .update(prescriptions)
      .set({
        dispenseStatus: "DISPENSED",
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();

    // 2. Record Payment Transaction if copay was collected
    let receiptNumber = null;
    if (copayCollected && copayCollected > 0 && facilityId) {
      receiptNumber = `REC-PHARM-${Date.now().toString(36).toUpperCase()}`;
      await db.insert(paymentTransactions).values({
        facilityId,
        encounterId: existing.encounterId,
        patientId: existing.patientId,
        collectedBy: userId || null,
        paymentMethod: paymentMethod,
        amount: Math.round(copayCollected),
        receiptNumber,
        notes: `Pharmacy copay collection for eRx ${existing.erxRefNo}. ${notes || ""}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Prescription ${existing.erxRefNo} successfully dispensed.`,
      data: {
        prescription: updated,
        receiptNumber,
      },
    });
  } catch (error: any) {
    console.error("[PRESCRIPTIONS] 💥 Dispense error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
