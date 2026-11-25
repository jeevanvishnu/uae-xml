import { Request, Response } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db/db";
import {
  claimSubmissions,
  encounters,
  patients,
  patientPolicies,
  facilities,
  remittanceLines,
  hubTransactions,
} from "../db/schema";
import { parseRemittanceXml } from "../services/xml/remittanceParser.service";
import { buildClaimSubmissionXml } from "../services/xml/claimBuilder.service";
import { submitClaimToHub } from "../services/hub/claimHub.service";

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/remittance/process-xml (Ingest Payer Remittance XML Advice)
// ─────────────────────────────────────────────────────────────────────────────
export async function processRemittanceXml(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const { xmlContent } = req.body;

  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  if (!xmlContent || typeof xmlContent !== "string") {
    res.status(400).json({ success: false, message: "xmlContent (XML string) is required." });
    return;
  }

  try {
    const parsed = parseRemittanceXml(xmlContent);
    const processedClaims: any[] = [];

    // Inbound Hub Audit Log
    const hubTxnId = `REMIT-IN-${Date.now().toString(36).toUpperCase()}`;
    await db.insert(hubTransactions).values({
      facilityId,
      referenceType: "REMITTANCE",
      direction: "INBOUND",
      hubTxnId,
      rawXml: xmlContent,
      status: "ACKNOWLEDGED",
    });

    for (const item of parsed.claims) {
      // Find matching claim
      const [claim] = await db
        .select()
        .from(claimSubmissions)
        .where(
          and(
            eq(claimSubmissions.claimNumber, item.claimId),
            eq(claimSubmissions.facilityId, facilityId)
          )
        )
        .limit(1);

      if (!claim) {
        console.warn(`[REMITTANCE] Claim not found in facility: ${item.claimId}`);
        continue;
      }

      let totalPaid = 0;
      let totalBilledNet = claim.netAmount;
      let hasRejection = false;

      // Clean existing lines if reprocessing
      await db.delete(remittanceLines).where(eq(remittanceLines.claimSubmissionId, claim.id));

      for (const act of item.activities) {
        let lineStatus = "PAID";
        if (act.paymentAmount === 0 || act.denialCode) {
          lineStatus = "REJECTED";
          hasRejection = true;
        } else if (act.paymentAmount < act.net) {
          lineStatus = "PARTIAL";
        }

        totalPaid += act.paymentAmount;

        await db.insert(remittanceLines).values({
          claimSubmissionId: claim.id,
          activityId: act.activityId,
          gross: act.gross,
          patientShare: act.patientShare,
          net: act.net,
          paymentAmount: act.paymentAmount,
          denialCode: act.denialCode || null,
          payerRemark: act.payerRemark || (lineStatus === "PAID" ? "Approved in full" : "Adjudicated with adjustment"),
          status: lineStatus,
        });
      }

      // Final Claim Status Calculation
      let finalClaimStatus: "PAID" | "PARTIALLY_PAID" | "REJECTED" = "PAID";
      if (totalPaid === 0) {
        finalClaimStatus = "REJECTED";
      } else if (totalPaid < totalBilledNet || hasRejection) {
        finalClaimStatus = "PARTIALLY_PAID";
      }

      // Update Claim
      await db
        .update(claimSubmissions)
        .set({
          status: finalClaimStatus,
        })
        .where(eq(claimSubmissions.id, claim.id));

      // Update Encounter
      await db
        .update(encounters)
        .set({
          claimStatus: finalClaimStatus,
          paymentStatus: finalClaimStatus === "PAID" ? "COLLECTED" : "UNPAID",
          updatedAt: new Date(),
        })
        .where(eq(encounters.id, claim.encounterId));

      processedClaims.push({
        claimNumber: claim.claimNumber,
        status: finalClaimStatus,
        billedNet: totalBilledNet,
        paidAmount: totalPaid,
        activitiesCount: item.activities.length,
      });
    }

    res.status(200).json({
      success: true,
      message: `Processed remittance advice with ${processedClaims.length} adjudicated claims.`,
      data: {
        hubTxnId,
        processedClaims,
      },
    });
  } catch (error: any) {
    console.error("[REMITTANCE] 💥 Process remittance error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/remittance/simulate/:claimId (Simulate Payer Adjudication for Testing)
// ─────────────────────────────────────────────────────────────────────────────
export async function simulateRemittance(req: Request, res: Response): Promise<void> {
  const claimId = String(req.params.claimId);
  const facilityId = req.user?.facilityId;
  const { outcome = "APPROVED" } = req.body; // "APPROVED", "PARTIAL", "REJECTED"

  try {
    const [claim] = await db
      .select()
      .from(claimSubmissions)
      .where(eq(claimSubmissions.id, claimId))
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

    const activities = (encounter?.activities as any[]) || [
      { id: "ACT-001", gross: 150, patientShare: 30, net: 120 },
    ];

    // Generate simulated Remittance Advice XML
    const remittanceActivitiesXml = activities
      .map((act) => {
        let payment = act.net;
        let denial = "";
        let remark = "Approved per fee schedule";

        if (outcome === "PARTIAL") {
          payment = Math.round(act.net * 0.7);
          denial = "PAYER-042";
          remark = "Partial payment - Tariff limitation applied";
        } else if (outcome === "REJECTED") {
          payment = 0;
          denial = "PAYER-109";
          remark = "Prior authorization missing or invalid code pairing";
        }

        return `
    <Activity>
      <ID>${act.id}</ID>
      <Gross>${act.gross}</Gross>
      <PatientShare>${act.patientShare}</PatientShare>
      <Net>${act.net}</Net>
      <PaymentAmount>${payment}</PaymentAmount>
      ${denial ? `<DenialCode>${denial}</DenialCode>` : ""}
      <PayerRemark>${remark}</PayerRemark>
    </Activity>`;
      })
      .join("");

    const simulatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<RemittanceAdvice>
  <Header>
    <SenderID>${claim.payerId}</SenderID>
    <ReceiverID>${facilityId || "FAC-MOH-98765"}</ReceiverID>
    <TransactionDate>${new Date().toISOString()}</TransactionDate>
    <RecordCount>1</RecordCount>
  </Header>
  <Claim>
    <ID>${claim.claimNumber}</ID>
    <IDPayer>PAYER-TXN-${Date.now()}</IDPayer>
    <SettlementDate>${new Date().toISOString()}</SettlementDate>
    ${remittanceActivitiesXml}
  </Claim>
</RemittanceAdvice>`;

    // Call processRemittanceXml logic directly
    const reqMock: any = {
      user: req.user,
      body: { xmlContent: simulatedXml },
    };

    return await processRemittanceXml(reqMock, res);
  } catch (error: any) {
    console.error("[REMITTANCE] 💥 Simulate error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/remittance (List Remittance Lines with Claims)
// ─────────────────────────────────────────────────────────────────────────────
export async function getRemittances(req: Request, res: Response): Promise<void> {
  const facilityId = req.user?.facilityId;
  const status = req.query.status as string;

  try {
    let conditions = [];
    if (facilityId) conditions.push(eq(claimSubmissions.facilityId, facilityId));

    const claimsList = await db
      .select()
      .from(claimSubmissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(claimSubmissions.createdAt))
      .limit(50);

    const claimIds = claimsList.map((c) => c.id);
    let lines: any[] = [];

    if (claimIds.length > 0) {
      lines = await db
        .select()
        .from(remittanceLines)
        .where(inArray(remittanceLines.claimSubmissionId, claimIds))
        .orderBy(desc(remittanceLines.id));
    }

    // Hydrate
    const claimMap: Record<string, any> = {};
    for (const c of claimsList) claimMap[c.id] = c;

    const hydratedLines = lines.map((l) => ({
      ...l,
      claim: claimMap[l.claimSubmissionId] || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        remittanceLines: hydratedLines,
      },
    });
  } catch (error: any) {
    console.error("[REMITTANCE] 💥 Get remittances error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/remittance/claims/:id/resubmit (Correction & Resubmission)
// ─────────────────────────────────────────────────────────────────────────────
export async function resubmitClaim(req: Request, res: Response): Promise<void> {
  const claimId = String(req.params.id);
  const facilityId = req.user?.facilityId;
  const { resubmissionType = "Correction", correctionNotes } = req.body;

  if (!facilityId) {
    res.status(403).json({ success: false, message: "User is not assigned to a facility." });
    return;
  }

  try {
    const [originalClaim] = await db
      .select()
      .from(claimSubmissions)
      .where(eq(claimSubmissions.id, claimId))
      .limit(1);

    if (!originalClaim) {
      res.status(404).json({ success: false, message: "Original claim not found." });
      return;
    }

    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, originalClaim.encounterId))
      .limit(1);

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, encounter.patientId))
      .limit(1);

    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    // New Claim Number for resubmission: CLM-YYYYMMDD-XXXX-R1
    const newCount = originalClaim.resubmissionCount + 1;
    const resubClaimNumber = `${originalClaim.claimNumber}-R${newCount}`;

    // Build new XML with Resubmission element
    const newXml = buildClaimSubmissionXml({
      claimNumber: resubClaimNumber,
      senderId: facility?.licenseId || "FAC-MOH-98765",
      receiverId: originalClaim.payerId,
      dispositionFlag: facility?.dispositionFlag || "TEST",
      submissionDate: new Date(),
      memberId: patient.emiratesId || "MEMBER",
      payerId: originalClaim.payerId,
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
      diagnoses: (encounter.diagnoses as any[]) || [],
      activities: (encounter.activities as any[]) || [],
      clinicianLicense: "MOH-DOC-4421",
      resubmissionType,
    });

    // Create Resubmission Record
    const [resubClaim] = await db
      .insert(claimSubmissions)
      .values({
        facilityId,
        encounterId: originalClaim.encounterId,
        claimNumber: resubClaimNumber,
        payerId: originalClaim.payerId,
        netAmount: originalClaim.netAmount,
        parentClaimId: originalClaim.id,
        resubmissionCount: newCount,
        resubmissionType,
        submissionXmlKey: newXml,
        status: "READY",
      })
      .returning();

    // Mark original as RESUBMITTED
    await db
      .update(claimSubmissions)
      .set({ status: "RESUBMITTED" })
      .where(eq(claimSubmissions.id, originalClaim.id));

    // Submit to Hub immediately
    const hubResult = await submitClaimToHub(facilityId, resubClaim.id, newXml);

    res.status(201).json({
      success: true,
      message: `Claim resubmitted successfully as ${resubClaimNumber} with reason: ${resubmissionType}.`,
      data: {
        resubmittedClaim: resubClaim,
        hubResult,
      },
    });
  } catch (error: any) {
    console.error("[REMITTANCE] 💥 Resubmission error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
