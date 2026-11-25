import { Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/db";
import {
  encounters,
  patients,
  patientPolicies,
  clinicians,
  facilities,
  prescriptions,
} from "../db/schema";
import {
  createEncounterSchema,
  updateEncounterSchema,
} from "../validators/encounter.validator";

// Helper to calculate financials enforcing: Gross = PatientShare + Net
function calculateFinancials(
  activities: any[],
  policy?: { copayPercent: number; copayCap: number; eligibilityStatus: string } | null
) {
  let totalGross = 0;
  let totalPatientShare = 0;
  let totalNet = 0;

  const isInsured = policy && policy.eligibilityStatus === "ACTIVE";
  const copayPercent = isInsured ? policy.copayPercent : 100;
  const copayCap = isInsured ? policy.copayCap : Infinity;

  const calculatedActivities = activities.map((act, index) => {
    const actId = act.id || `ACT-${String(index + 1).padStart(3, "0")}`;
    const qty = Math.max(1, Number(act.quantity) || 1);
    const unitPrice = Math.max(0, Number(act.unitPrice) || 0);
    const gross = Math.round(qty * unitPrice);

    let patientShare = 0;
    let net = 0;

    if (isInsured) {
      const calculatedShare = Math.round((gross * copayPercent) / 100);
      patientShare = Math.min(calculatedShare, copayCap);
      net = gross - patientShare;
    } else {
      // Self-Pay / Cash
      patientShare = gross;
      net = 0;
    }

    totalGross += gross;
    totalPatientShare += patientShare;
    totalNet += net;

    return {
      ...act,
      id: actId,
      quantity: qty,
      unitPrice,
      gross,
      patientShare,
      net,
    };
  });

  // Apply overall copay cap if specified
  if (isInsured && copayCap < Infinity && totalPatientShare > copayCap) {
    totalPatientShare = copayCap;
    totalNet = totalGross - totalPatientShare;
  }

  return {
    calculatedActivities,
    totalGross,
    totalPatientShare,
    totalNet,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/encounters (Start New Encounter)
// ─────────────────────────────────────────────────────────────────────────────
export async function createEncounter(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = createEncounterSchema.safeParse(req.body);
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
    // 1. Verify Patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, data.patientId), eq(patients.facilityId, facilityId)))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found in this facility." });
      return;
    }

    // 2. Resolve Policy
    let targetPolicyId = data.policyId;
    if (!targetPolicyId) {
      // Auto-assign latest active policy if available
      const [latestPolicy] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.patientId, data.patientId))
        .orderBy(desc(patientPolicies.createdAt))
        .limit(1);
      targetPolicyId = latestPolicy?.id || null;
    }

    // 3. Resolve Clinician
    let targetClinicianId = data.clinicianId;
    if (!targetClinicianId) {
      const [defaultClinician] = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.facilityId, facilityId))
        .limit(1);
      targetClinicianId = defaultClinician?.id || null;
    }

    // Default consultation activity (CPT 99213)
    const initialActivities = [
      {
        id: "ACT-001",
        type: "3",
        code: "99213",
        description: "Office visit, established patient, 15 min",
        quantity: 1,
        unitPrice: 150,
      },
    ];

    let policyRecord = null;
    if (targetPolicyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, targetPolicyId))
        .limit(1);
      policyRecord = pol;
    }

    const { calculatedActivities, totalGross, totalPatientShare, totalNet } =
      calculateFinancials(initialActivities, policyRecord);

    const [newEncounter] = await db
      .insert(encounters)
      .values({
        facilityId,
        patientId: data.patientId,
        policyId: targetPolicyId,
        clinicianId: targetClinicianId,
        encounterType: data.encounterType,
        startTime: new Date(),
        diagnoses: [],
        activities: calculatedActivities,
        grossAmount: totalGross,
        patientShare: totalPatientShare,
        netAmount: totalNet,
        paymentStatus: "UNPAID",
        claimStatus: "DRAFT",
        clinicalNotes: data.clinicalNotes || "",
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Encounter created successfully.",
      data: { encounter: newEncounter },
    });
  } catch (error: any) {
    console.error("[ENCOUNTERS] 💥 Create encounter error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/encounters (List Encounters)
// ─────────────────────────────────────────────────────────────────────────────
export async function getEncounters(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const status = req.query.status as string;
  const patientId = req.query.patient_id as string;

  try {
    let conditions = [];
    if (facilityId) conditions.push(eq(encounters.facilityId, facilityId));
    if (status) conditions.push(eq(encounters.claimStatus, status as any));
    if (patientId) conditions.push(eq(encounters.patientId, patientId));

    const encounterList = await db
      .select({
        id: encounters.id,
        encounterType: encounters.encounterType,
        startTime: encounters.startTime,
        endTime: encounters.endTime,
        grossAmount: encounters.grossAmount,
        patientShare: encounters.patientShare,
        netAmount: encounters.netAmount,
        claimStatus: encounters.claimStatus,
        paymentStatus: encounters.paymentStatus,
        diagnoses: encounters.diagnoses,
        activities: encounters.activities,
        patientId: encounters.patientId,
        policyId: encounters.policyId,
        clinicianId: encounters.clinicianId,
        createdAt: encounters.createdAt,
      })
      .from(encounters)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(encounters.startTime))
      .limit(50);

    // Fetch related patients & clinicians in batch
    const patientIds = Array.from(new Set(encounterList.map((e) => e.patientId)));
    const clinicianIds = Array.from(
      new Set(encounterList.map((e) => e.clinicianId).filter(Boolean) as string[])
    );
    const policyIds = Array.from(
      new Set(encounterList.map((e) => e.policyId).filter(Boolean) as string[])
    );

    let patientsMap: Record<string, any> = {};
    let cliniciansMap: Record<string, any> = {};
    let policiesMap: Record<string, any> = {};

    if (patientIds.length > 0) {
      const pats = await db.select().from(patients);
      for (const p of pats) patientsMap[p.id] = p;
    }
    if (clinicianIds.length > 0) {
      const clins = await db.select().from(clinicians);
      for (const c of clins) cliniciansMap[c.id] = c;
    }
    if (policyIds.length > 0) {
      const pols = await db.select().from(patientPolicies);
      for (const pol of pols) policiesMap[pol.id] = pol;
    }

    const hydrated = encounterList.map((e) => ({
      ...e,
      patient: patientsMap[e.patientId] || null,
      clinician: e.clinicianId ? cliniciansMap[e.clinicianId] || null : null,
      policy: e.policyId ? policiesMap[e.policyId] || null : null,
    }));

    res.status(200).json({ success: true, data: { encounters: hydrated } });
  } catch (error: any) {
    console.error("[ENCOUNTERS] 💥 List encounters error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/encounters/:id (Get Full Encounter Workspace)
// ─────────────────────────────────────────────────────────────────────────────
export async function getEncounterById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, id))
      .limit(1);

    if (!encounter) {
      res.status(404).json({ success: false, message: "Encounter not found." });
      return;
    }

    // Load Patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, encounter.patientId))
      .limit(1);

    // Load Policy
    let policy = null;
    if (encounter.policyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, encounter.policyId))
        .limit(1);
      policy = pol || null;
    }

    // Load Clinician
    let clinician = null;
    if (encounter.clinicianId) {
      const [clin] = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.id, encounter.clinicianId))
        .limit(1);
      clinician = clin || null;
    }

    // Load Linked Prescriptions
    const linkedPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.encounterId, id));

    res.status(200).json({
      success: true,
      data: {
        encounter: {
          ...encounter,
          patient,
          policy,
          clinician,
          prescriptions: linkedPrescriptions,
        },
      },
    });
  } catch (error: any) {
    console.error("[ENCOUNTERS] 💥 Get encounter error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/encounters/:id (Update Diagnoses, Activities, Clinical Notes)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateEncounter(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  const parsed = updateEncounterSchema.safeParse(req.body);
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
    const [existing] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, message: "Encounter not found." });
      return;
    }

    if (existing.claimStatus !== "DRAFT" && existing.claimStatus !== "READY") {
      res.status(400).json({
        success: false,
        message: `Cannot edit encounter in ${existing.claimStatus} status.`,
      });
      return;
    }

    let policy = null;
    if (existing.policyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, existing.policyId))
        .limit(1);
      policy = pol || null;
    }

    const currentActivities = data.activities !== undefined ? data.activities : (existing.activities as any[]);
    const { calculatedActivities, totalGross, totalPatientShare, totalNet } =
      calculateFinancials(currentActivities, policy);

    const [updated] = await db
      .update(encounters)
      .set({
        encounterType: data.encounterType || existing.encounterType,
        clinicianId: data.clinicianId !== undefined ? data.clinicianId : existing.clinicianId,
        diagnoses: data.diagnoses !== undefined ? data.diagnoses : existing.diagnoses,
        activities: calculatedActivities,
        grossAmount: totalGross,
        patientShare: totalPatientShare,
        netAmount: totalNet,
        clinicalNotes: data.clinicalNotes !== undefined ? data.clinicalNotes : existing.clinicalNotes,
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Encounter updated successfully.",
      data: { encounter: updated },
    });
  } catch (error: any) {
    console.error("[ENCOUNTERS] 💥 Update encounter error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/encounters/:id/finalize (Lock & Mark Ready for Billing Submission)
// ─────────────────────────────────────────────────────────────────────────────
export async function finalizeEncounter(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, id))
      .limit(1);

    if (!encounter) {
      res.status(404).json({ success: false, message: "Encounter not found." });
      return;
    }

    const diagnoses = (encounter.diagnoses as any[]) || [];
    const activities = (encounter.activities as any[]) || [];

    // Regulatory Validation: At least one Principal diagnosis is required by Riayati / DHPO
    const hasPrincipal = diagnoses.some((d) => d.type === "Principal");
    if (!hasPrincipal) {
      res.status(422).json({
        success: false,
        message: "A Principal diagnosis (ICD-10) is mandatory before finalizing an encounter.",
      });
      return;
    }

    if (activities.length === 0) {
      res.status(422).json({
        success: false,
        message: "At least one activity (CPT service code) must be recorded.",
      });
      return;
    }

    const [finalized] = await db
      .update(encounters)
      .set({
        claimStatus: "READY",
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Encounter finalized and queued for insurance claim submission.",
      data: { encounter: finalized },
    });
  } catch (error: any) {
    console.error("[ENCOUNTERS] 💥 Finalize encounter error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
