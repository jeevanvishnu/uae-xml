import { Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/db";
import {
  claimSubmissions,
  encounters,
  patients,
  patientPolicies,
  clinicians,
  facilities,
  hubTransactions,
  remittanceLines,
} from "../db/schema";
import { validateClaimForSubmission } from "../services/xml/claimValidator.service";
import { buildClaimSubmissionXml } from "../services/xml/claimBuilder.service";
import { submitClaimToHub } from "../services/hub/claimHub.service";

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/claims/generate (Pre-Validate & Build Claim XML from Encounter)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateClaim(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const { encounterId } = req.body;

  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  if (!encounterId) {
    res.status(400).json({ success: false, message: "encounterId is required." });
    return;
  }

  try {
    // 1. Fetch Encounter
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(and(eq(encounters.id, encounterId), eq(encounters.facilityId, facilityId)))
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

    // 4. Fetch Policy
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
    if (encounter.clinicianId) {
      const [c] = await db
        .select()
        .from(clinicians)
        .where(eq(clinicians.id, encounter.clinicianId))
        .limit(1);
      clinician = c || null;
    }

    const diagnoses = (encounter.diagnoses as any[]) || [];
    const activities = (encounter.activities as any[]) || [];

    // 6. Execute Regulatory Business Rules Pre-Validation
    const validation = validateClaimForSubmission({
      patient: {
        fullName: patient.fullName,
        emiratesId: patient.emiratesId,
        passportNo: patient.passportNo,
      },
      policy: policy
        ? {
            payerId: policy.payerId,
            memberId: policy.memberId,
            eligibilityStatus: policy.eligibilityStatus,
          }
        : null,
      facility: {
        licenseId: facility?.licenseId || "FAC-MOH-98765",
      },
      diagnoses,
      activities,
      grossAmount: encounter.grossAmount,
      patientShare: encounter.patientShare,
      netAmount: encounter.netAmount,
    });

    if (!validation.isValid) {
      res.status(422).json({
        success: false,
        message: "Claim pre-submission validation failed against Riayati/DHA rules.",
        errors: validation.errors,
      });
      return;
    }

    // 7. Generate Claim Identifier: CLM-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${dateStr}-${randomSuffix}`;

    // 8. Build XML Document
    const claimXml = buildClaimSubmissionXml({
      claimNumber,
      senderId: facility?.licenseId || "FAC-MOH-98765",
      receiverId: policy!.payerId,
      dispositionFlag: facility?.dispositionFlag || "TEST",
      submissionDate: new Date(),
      memberId: policy!.memberId,
      payerId: policy!.payerId,
      providerId: facility?.licenseId || "FAC-MOH-98765",
      emiratesId: patient.emiratesId || undefined,
      grossAmount: encounter.grossAmount,
      patientShare: encounter.patientShare,
      netAmount: encounter.netAmount,
      encounter: {
        type: encounter.encounterType,
        startTime: encounter.startTime,
        endTime: encounter.endTime || undefined,
      },
      diagnoses,
      activities,
      clinicianLicense: clinician?.licenseNumber || "MOH-DOC-4421",
    });

    // 9. Persist Claim Record
    const [newClaim] = await db
      .insert(claimSubmissions)
      .values({
        facilityId,
        encounterId,
        claimNumber,
        payerId: policy!.payerId,
        netAmount: encounter.netAmount,
        submissionXmlKey: claimXml,
        status: "READY",
      })
      .returning();

    // 10. Update encounter claim status
    await db
      .update(encounters)
      .set({
        claimStatus: "READY",
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, encounterId));

    res.status(201).json({
      success: true,
      message: "Claim successfully validated, serialized to XML, and queued.",
      data: {
        claim: newClaim,
        xml: claimXml,
      },
    });
  } catch (error: any) {
    console.error("[CLAIMS] 💥 Generate claim error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/claims/:id/submit (Transmit to MoHAP Riayati / DHA Post Office)
// ─────────────────────────────────────────────────────────────────────────────
export async function submitClaim(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const facilityId = req.user?.facilityId;

  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  try {
    const [claim] = await db
      .select()
      .from(claimSubmissions)
      .where(and(eq(claimSubmissions.id, id), eq(claimSubmissions.facilityId, facilityId)))
      .limit(1);

    if (!claim) {
      res.status(404).json({ success: false, message: "Claim not found." });
      return;
    }

    if (!claim.submissionXmlKey) {
      res.status(400).json({ success: false, message: "Claim XML payload is missing." });
      return;
    }

    // Submit to Hub
    const hubResult = await submitClaimToHub(facilityId, claim.id, claim.submissionXmlKey);

    // Update Encounter Claim Status
    await db
      .update(encounters)
      .set({
        claimStatus: "SUBMITTED",
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, claim.encounterId));

    res.status(200).json({
      success: true,
      message: `Claim ${claim.claimNumber} successfully submitted to Riayati/DHA Post Office.`,
      data: hubResult,
    });
  } catch (error: any) {
    console.error("[CLAIMS] 💥 Submit claim error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/claims (List Claims)
// ─────────────────────────────────────────────────────────────────────────────
export async function getClaims(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const status = req.query.status as string;
  const payerId = req.query.payer_id as string;

  try {
    let conditions = [];
    if (facilityId) conditions.push(eq(claimSubmissions.facilityId, facilityId));
    if (status) conditions.push(eq(claimSubmissions.status, status as any));
    if (payerId) conditions.push(eq(claimSubmissions.payerId, payerId));

    const list = await db
      .select()
      .from(claimSubmissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(claimSubmissions.createdAt))
      .limit(50);

    // Hydrate Encounters & Patients
    const encounterIds = Array.from(new Set(list.map((c: any) => c.encounterId)));
    let encountersMap: Record<string, any> = {};
    let patientsMap: Record<string, any> = {};

    if (encounterIds.length > 0) {
      const encs = await db.select().from(encounters);
      for (const e of encs) encountersMap[e.id] = e;
      const pats = await db.select().from(patients);
      for (const p of pats) patientsMap[p.id] = p;
    }

    const hydrated = list.map((c: any) => {
      const enc = encountersMap[c.encounterId];
      return {
        ...c,
        encounter: enc || null,
        patient: enc ? patientsMap[enc.patientId] || null : null,
      };
    });

    res.status(200).json({ success: true, data: { claims: hydrated } });
  } catch (error: any) {
    console.error("[CLAIMS] 💥 List claims error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/claims/:id (Detailed Claim View with Audit Trail)
// ─────────────────────────────────────────────────────────────────────────────
export async function getClaimById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const [claim] = await db
      .select()
      .from(claimSubmissions)
      .where(eq(claimSubmissions.id, id))
      .limit(1);

    if (!claim) {
      res.status(404).json({ success: false, message: "Claim not found." });
      return;
    }

    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, claim.encounterId))
      .limit(1);

    let patient = null;
    let policy = null;
    let clinician = null;

    if (encounter) {
      const [pat] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, encounter.patientId))
        .limit(1);
      patient = pat || null;

      if (encounter.policyId) {
        const [pol] = await db
          .select()
          .from(patientPolicies)
          .where(eq(patientPolicies.id, encounter.policyId))
          .limit(1);
        policy = pol || null;
      }

      if (encounter.clinicianId) {
        const [c] = await db
          .select()
          .from(clinicians)
          .where(eq(clinicians.id, encounter.clinicianId))
          .limit(1);
        clinician = c || null;
      }
    }

    // Hub Transactions for this claim
    const hubTxns = await db
      .select()
      .from(hubTransactions)
      .where(eq(hubTransactions.referenceId, id))
      .orderBy(desc(hubTransactions.createdAt));

    // Remittance Lines
    const remittances = await db
      .select()
      .from(remittanceLines)
      .where(eq(remittanceLines.claimSubmissionId, id));

    res.status(200).json({
      success: true,
      data: {
        claim: {
          ...claim,
          encounter,
          patient,
          policy,
          clinician,
          hubTransactions: hubTxns,
          remittanceLines: remittances,
        },
      },
    });
  } catch (error: any) {
    console.error("[CLAIMS] 💥 Get claim error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
