import { Request, Response } from "express";
import { eq, or, and, ilike, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/db";
import {
  patients,
  patientPolicies,
  facilities,
  hubTransactions,
} from "../db/schema";
import {
  createPatientSchema,
  updatePatientSchema,
  createPolicySchema,
  verifyEligibilitySchema,
} from "../validators/patient.validator";
import { buildRiayatiEligibilityRequestXml } from "../services/xml/eligibilityBuilder.service";
import { RiayatiHubService } from "../services/hub/riayatiHub.service";

// Helper to normalize Emirates ID (e.g., 784198812345671 -> 784-1988-1234567-1)
function normalizeEmiratesId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().replace(/[^0-9]/g, "");
  if (clean.length === 15 && clean.startsWith("784")) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 14)}-${clean.slice(14, 15)}`;
  }
  return raw.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/patients (Register Patient)
// ─────────────────────────────────────────────────────────────────────────────
export async function createPatient(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const data = parsed.data;
  const formattedEID = normalizeEmiratesId(data.emiratesId);

  try {
    // Check if patient with this Emirates ID already exists in this facility
    if (formattedEID) {
      const [existing] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.facilityId, facilityId), eq(patients.emiratesId, formattedEID)))
        .limit(1);

      if (existing) {
        res.status(409).json({
          success: false,
          message: `A patient with Emirates ID ${formattedEID} already exists.`,
          data: { patient: existing },
        });
        return;
      }
    }

    const [newPatient] = await db
      .insert(patients)
      .values({
        facilityId,
        emiratesId: formattedEID || null,
        passportNo: data.passportNo || null,
        fullName: data.fullName,
        dob: new Date(data.dob),
        gender: data.gender,
        phone: data.phone,
        email: data.email || null,
        nationality: data.nationality || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      data: { patient: newPatient },
    });
  } catch (error: any) {
    console.error("[PATIENTS] 💥 Create patient error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/patients (Search / List Patients)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchPatients(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const query = (req.query.q as string)?.trim() || "";
  const emiratesId = (req.query.emirates_id as string)?.trim();
  const passport = (req.query.passport as string)?.trim();

  try {
    let conditions = [];
    if (facilityId) {
      conditions.push(eq(patients.facilityId, facilityId));
    }

    if (emiratesId) {
      const formatted = normalizeEmiratesId(emiratesId);
      conditions.push(eq(patients.emiratesId, formatted || emiratesId));
    } else if (passport) {
      conditions.push(ilike(patients.passportNo, `%${passport}%`));
    } else if (query) {
      const formatted = normalizeEmiratesId(query);
      conditions.push(
        or(
          ilike(patients.fullName, `%${query}%`),
          ilike(patients.phone, `%${query}%`),
          eq(patients.emiratesId, formatted || query),
          ilike(patients.passportNo, `%${query}%`)
        )
      );
    }

    const patientList = await db
      .select()
      .from(patients)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(patients.createdAt))
      .limit(50);

    // Fetch policies for returned patients
    const patientIds = patientList.map((p) => p.id);
    let policyMap: Record<string, any[]> = {};

    if (patientIds.length > 0) {
      const allPolicies = await db
        .select()
        .from(patientPolicies)
        .where(and(eq(patientPolicies.facilityId, facilityId!)));

      for (const pol of allPolicies) {
        if (!policyMap[pol.patientId]) policyMap[pol.patientId] = [];
        policyMap[pol.patientId].push(pol);
      }
    }

    const patientsWithPolicies = patientList.map((p) => ({
      ...p,
      policies: policyMap[p.id] || [],
    }));

    res.status(200).json({
      success: true,
      data: { patients: patientsWithPolicies },
    });
  } catch (error: any) {
    console.error("[PATIENTS] 💥 Search error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/patients/:id (Patient Detail + Policies)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPatientById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    const policies = await db
      .select()
      .from(patientPolicies)
      .where(eq(patientPolicies.patientId, id))
      .orderBy(desc(patientPolicies.createdAt));

    res.status(200).json({
      success: true,
      data: {
        patient: {
          ...patient,
          policies,
        },
      },
    });
  } catch (error: any) {
    console.error("[PATIENTS] 💥 Get patient error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/patients/:id (Update Patient)
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePatient(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  const parsed = updatePatientSchema.safeParse(req.body);
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
    const [updated] = await db
      .update(patients)
      .set({
        ...data,
        emiratesId: data.emiratesId ? normalizeEmiratesId(data.emiratesId) : undefined,
        dob: data.dob ? new Date(data.dob) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Patient updated successfully.",
      data: { patient: updated },
    });
  } catch (error: any) {
    console.error("[PATIENTS] 💥 Update patient error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/patients/:id/policies (Add Insurance Policy)
// ─────────────────────────────────────────────────────────────────────────────
export async function addPatientPolicy(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const facilityId = req.user?.facilityId;
  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  const parsed = createPolicySchema.safeParse(req.body);
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
    const [policy] = await db
      .insert(patientPolicies)
      .values({
        patientId: id,
        facilityId,
        payerId: data.payerId,
        payerName: data.payerName,
        memberId: data.memberId,
        policyNumber: data.policyNumber || null,
        network: data.network,
        copayPercent: data.copayPercent,
        copayCap: data.copayCap,
        deductible: data.deductible,
        expiryDate: new Date(data.expiryDate),
        eligibilityStatus: "PENDING",
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Insurance policy added.",
      data: { policy },
    });
  } catch (error: any) {
    console.error("[PATIENTS] 💥 Add policy error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/patients/:id/eligibility/verify (Real-time Hub Verification)
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPatientEligibility(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const facilityId = req.user?.facilityId;

  const parsed = verifyEligibilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    // 1. Fetch Patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    // 2. Fetch Target Policy
    let targetPolicy;
    if (parsed.data.policyId) {
      const [pol] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.id, parsed.data.policyId))
        .limit(1);
      targetPolicy = pol;
    } else {
      const [latest] = await db
        .select()
        .from(patientPolicies)
        .where(eq(patientPolicies.patientId, id))
        .orderBy(desc(patientPolicies.createdAt))
        .limit(1);
      targetPolicy = latest;
    }

    if (!targetPolicy) {
      res.status(404).json({
        success: false,
        message: "No insurance policy found for this patient. Fallback to self-pay.",
        fallbackToSelfPay: true,
      });
      return;
    }

    // 3. Fetch Facility (SenderID)
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, patient.facilityId))
      .limit(1);

    const senderId = facility?.licenseId || "FAC-MOH-98765";
    const inquiryId = `INQ-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Format DOB to DD/MM/YYYY
    const dobDate = new Date(patient.dob);
    const dobFormatted = `${String(dobDate.getDate()).padStart(2, "0")}/${String(dobDate.getMonth() + 1).padStart(2, "0")}/${dobDate.getFullYear()}`;

    // 4. Build Riayati PriorRequest XML
    const requestXml = buildRiayatiEligibilityRequestXml({
      senderId,
      receiverId: targetPolicy.payerId,
      dispositionFlag: facility?.dispositionFlag || "TEST",
      inquiryId,
      memberId: targetPolicy.memberId,
      emiratesId: patient.emiratesId,
      passportNo: patient.passportNo,
      patientName: patient.fullName,
      dob: dobFormatted,
      gender: patient.gender,
    });

    // 5. Log Outbound Hub Transaction
    await db.insert(hubTransactions).values({
      facilityId: patient.facilityId,
      referenceType: "ELIGIBILITY",
      referenceId: targetPolicy.id,
      direction: "OUTBOUND",
      hubTxnId: inquiryId,
      rawXml: requestXml,
      status: "SENT",
    });

    // 6. Dispatch to Riayati Hub / Simulator
    const result = await RiayatiHubService.verifyEligibility({
      senderId,
      receiverId: targetPolicy.payerId,
      inquiryId,
      memberId: targetPolicy.memberId,
      emiratesId: patient.emiratesId,
      passportNo: patient.passportNo,
      requestXml,
      storedExpiryDate: targetPolicy.expiryDate,
    });

    // 7. Log Inbound Hub Transaction
    await db.insert(hubTransactions).values({
      facilityId: patient.facilityId,
      referenceType: "ELIGIBILITY",
      referenceId: targetPolicy.id,
      direction: "INBOUND",
      hubTxnId: result.hubTxnId,
      rawXml: result.responseXml,
      status: result.status === "ACTIVE" ? "SUCCESS" : "REJECTED",
    });

    // 8. Update Policy Status & Details in DB
    const [updatedPolicy] = await db
      .update(patientPolicies)
      .set({
        eligibilityStatus: result.status,
        lastVerifiedAt: new Date(),
        network: result.network,
        copayPercent: result.copayPercent,
        copayCap: result.copayCap,
        deductible: result.deductible,
        eligibilityDetails: {
          hubTxnId: result.hubTxnId,
          verifiedAt: new Date().toISOString(),
          remarks: result.remarks,
          copaySummary: `${result.copayPercent}% up to ${result.copayCap} AED cap`,
        },
        updatedAt: new Date(),
      })
      .where(eq(patientPolicies.id, targetPolicy.id))
      .returning();

    res.status(200).json({
      success: true,
      message: `Eligibility verification completed: ${result.status}`,
      data: {
        status: result.status,
        isActive: result.status === "ACTIVE",
        hubTxnId: result.hubTxnId,
        remarks: result.remarks,
        policy: updatedPolicy,
        fallbackToSelfPay: result.status !== "ACTIVE",
      },
    });
  } catch (error: any) {
    console.error("[ELIGIBILITY] 💥 Verification error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/patients/:id/eligibility/history
// ─────────────────────────────────────────────────────────────────────────────
export async function getEligibilityHistory(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const policies = await db
      .select({ id: patientPolicies.id })
      .from(patientPolicies)
      .where(eq(patientPolicies.patientId, id));

    const policyIds = policies.map((p) => p.id);

    if (policyIds.length === 0) {
      res.status(200).json({ success: true, data: { history: [] } });
      return;
    }

    const logs = await db
      .select()
      .from(hubTransactions)
      .where(eq(hubTransactions.referenceType, "ELIGIBILITY"))
      .orderBy(desc(hubTransactions.createdAt))
      .limit(20);

    const filtered = logs.filter((l) => policyIds.includes(l.referenceId || ""));

    res.status(200).json({
      success: true,
      data: { history: filtered },
    });
  } catch (error: any) {
    console.error("[ELIGIBILITY] 💥 History error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
