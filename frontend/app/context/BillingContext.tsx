"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

export interface BillingDiagnosis {
  code: string;
  description: string;
  type: "Principal" | "Secondary";
}

export interface BillingProcedure {
  id: string;
  code: string;
  modifier?: string;
  type: "CPT" | "HCPCS" | "DSL";
  description: string;
  quantity: number;
  unitPrice: number;
  gross: number;
  patientShare: number;
  net: number;
  requiresPriorAuth: boolean;
  priorAuthRef?: string;
}

export interface BillingClaim {
  id: string;
  encounterId: string;
  tokenNumber: string;
  claimNumber: string;
  visitDate: string;
  readyTime: string;
  patient: {
    fullName: string;
    emiratesId: string;
    gender: "Male" | "Female";
    age: number;
  };
  insurance: {
    receiverId: string;
    payerName: string;
    planName: string;
    memberId: string;
    eligibilityStatus: "ACTIVE" | "EXPIRED" | "PENDING";
  };
  clinician: {
    name: string;
    specialty: string;
    licenseNo: string;
  };
  diagnoses: BillingDiagnosis[];
  procedures: BillingProcedure[];
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  workflowStatus:
    | "READY_FOR_CLAIM"
    | "QUEUED_FOR_BATCH"
    | "BATCH_DOWNLOADED"
    | "SUBMITTED_TO_HUB";
  batchId?: string;
  hubTransactionId?: string;
  submittedAt?: string;
}

export interface ScrubbingGate {
  passed: boolean;
  label: string;
  message: string;
}

export interface ScrubbingResult {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  checks: {
    principalIcd: ScrubbingGate;
    mathBalance: ScrubbingGate;
    activeIds: ScrubbingGate;
    priorAuth: ScrubbingGate;
  };
}

export interface PayerBatch {
  receiverId: string;
  payerName: string;
  claims: BillingClaim[];
  totalGross: number;
  totalPatientShare: number;
  totalNet: number;
  status: "READY_TO_EXPORT" | "DOWNLOADED" | "SUBMITTED_TO_HUB";
  hubReferenceId?: string;
  exportedAt?: string;
  submittedAt?: string;
}

export interface RemittanceLine {
  id: string;
  claimNumber: string;
  encounterId: string;
  patientName: string;
  receiverId: string;
  payerName: string;
  activityCode: string;
  activityDescription: string;
  gross: number;
  patientShare: number;
  net: number;
  approvedAmount: number;
  deniedAmount: number;
  denialCode?: string;
  denialLabel?: string;
  payerRemark?: string;
  status: "PAID" | "PARTIAL" | "REJECTED";
  remittanceFile: string;
  receivedAt: string;
  resubmissionStatus: "NONE" | "IN_PROGRESS" | "RESUBMITTED";
}

export interface ResubmissionAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface ResubmissionDraft {
  id: string;
  remittanceLineId: string;
  claimNumber: string;
  patientName: string;
  receiverId: string;
  payerName: string;
  denialCode: string;
  denialLabel: string;
  payerRemark: string;
  claimedNet: number;
  approvedAmount: number;
  deniedAmount: number;
  attemptNumber: number;
  resubmissionType: "correction" | "internal complaint" | "legacy";
  activityCode: string;
  modifier: string;
  adjustedNet: number;
  priorAuthRef: string;
  clinicalComment: string;
  attachments: ResubmissionAttachment[];
  status: "OPEN" | "RESUBMITTED";
  resubmittedAt?: string;
  hubRef?: string;
}

export const UAE_DENIAL_CATALOG: Record<string, string> = {
  "MNEC-004": "Medical Necessity not established for billed service",
  "PRCE-001": "Pricing / Tariff mismatch against contracted schedule",
  "AUTH-002": "Prior Authorization missing, invalid, or expired",
  "CODE-003": "Invalid CPT / Modifier combination for encounter",
  "ELIG-001": "Member coverage inactive on date of service",
  "DUPL-001": "Duplicate claim or activity line detected",
};

export function evaluateScrubbing(claim: BillingClaim): ScrubbingResult {
  const principal = claim.diagnoses.find(
    (d) => d.type === "Principal" && d.code.trim().length >= 3
  );
  const principalIcd: ScrubbingGate = principal
    ? {
        passed: true,
        label: "Principal ICD-10",
        message: `${principal.code} (${principal.description})`,
      }
    : {
        passed: false,
        label: "Principal ICD-10",
        message: "Missing Principal ICD-10 diagnosis code",
      };

  const expectedSum = Number((claim.patientShare + claim.netAmount).toFixed(2));
  const actualGross = Number(claim.grossAmount.toFixed(2));
  const mathOk = actualGross > 0 && Math.abs(actualGross - expectedSum) < 0.01;
  const mathBalance: ScrubbingGate = mathOk
    ? {
        passed: true,
        label: "Financial Balance",
        message: `Gross ${actualGross.toFixed(2)} = Share ${claim.patientShare.toFixed(2)} + Net ${claim.netAmount.toFixed(2)} AED`,
      }
    : {
        passed: false,
        label: "Financial Balance",
        message: `Mismatch: Gross (${actualGross.toFixed(2)}) ≠ Share + Net (${expectedSum.toFixed(2)})`,
      };

  const eidValid = /^784-\d{4}-\d{7}-\d$/.test(claim.patient.emiratesId.trim());
  const memberValid = claim.insurance.memberId.trim().length >= 4;
  const eligActive = claim.insurance.eligibilityStatus === "ACTIVE";
  const idsOk = eidValid && memberValid && eligActive;
  const activeIds: ScrubbingGate = idsOk
    ? {
        passed: true,
        label: "Emirates ID & Member ID",
        message: `${claim.patient.emiratesId} • Member ${claim.insurance.memberId} (ACTIVE)`,
      }
    : {
        passed: false,
        label: "Emirates ID & Member ID",
        message: !eidValid
          ? "Invalid Emirates ID format (expected 784-YYYY-NNNNNNN-C)"
          : !eligActive
          ? `Eligibility is ${claim.insurance.eligibilityStatus}`
          : "Missing Payer Member ID",
      };

  const missingAuthProcs = claim.procedures.filter(
    (p) => p.requiresPriorAuth && (!p.priorAuthRef || p.priorAuthRef.trim().length < 4)
  );
  const priorAuthOk = missingAuthProcs.length === 0;
  const priorAuth: ScrubbingGate = priorAuthOk
    ? {
        passed: true,
        label: "Prior Authorization",
        message: claim.procedures.some((p) => p.requiresPriorAuth)
          ? `Verified (${claim.procedures
              .filter((p) => p.requiresPriorAuth)
              .map((p) => p.priorAuthRef)
              .join(", ")})`
          : "Not required for billed CPT codes",
      }
    : {
        passed: false,
        label: "Prior Authorization",
        message: `Missing Prior Auth # for ${missingAuthProcs.map((p) => p.code).join(", ")}`,
      };

  const gates = [principalIcd, mathBalance, activeIds, priorAuth];
  const passedCount = gates.filter((g) => g.passed).length;

  return {
    passed: passedCount === gates.length,
    passedCount,
    totalCount: gates.length,
    checks: { principalIcd, mathBalance, activeIds, priorAuth },
  };
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatUaeDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function buildBatchSubmissionXml(
  receiverId: string,
  claims: BillingClaim[],
  senderId = "DHA-F-0048291"
): string {
  const nowStr = formatUaeDate(new Date());
  const claimsXml = claims
    .map((c) => {
      const diagnosesXml = c.diagnoses
        .map(
          (d) =>
            `      <Diagnosis>\n        <Type>${escapeXml(d.type)}</Type>\n        <Code>${escapeXml(d.code)}</Code>\n      </Diagnosis>`
        )
        .join("\n");

      const activitiesXml = c.procedures
        .map(
          (p) =>
            `      <Activity>\n        <ID>${escapeXml(p.id)}</ID>\n        <Start>${escapeXml(nowStr)}</Start>\n        <Type>${p.type === "CPT" ? "3" : p.type === "HCPCS" ? "4" : "5"}</Type>\n        <Code>${escapeXml(p.modifier ? `${p.code}-${p.modifier}` : p.code)}</Code>\n        <Quantity>${p.quantity}</Quantity>\n        <Net>${p.net.toFixed(2)}</Net>\n        <Clinician>${escapeXml(c.clinician.licenseNo)}</Clinician>${
              p.priorAuthRef
                ? `\n        <PriorAuthorizationID>${escapeXml(p.priorAuthRef)}</PriorAuthorizationID>`
                : ""
            }\n      </Activity>`
        )
        .join("\n");

      return `  <Claim>
    <ID>${escapeXml(c.claimNumber)}</ID>
    <MemberID>${escapeXml(c.insurance.memberId)}</MemberID>
    <PayerID>${escapeXml(c.insurance.receiverId)}</PayerID>
    <ProviderID>${escapeXml(senderId)}</ProviderID>
    <EmiratesID>${escapeXml(c.patient.emiratesId)}</EmiratesID>
    <Gross>${c.grossAmount.toFixed(2)}</Gross>
    <PatientShare>${c.patientShare.toFixed(2)}</PatientShare>
    <Net>${c.netAmount.toFixed(2)}</Net>
    <Encounter>
      <FacilityID>${escapeXml(senderId)}</FacilityID>
      <Type>1</Type>
      <PatientID>${escapeXml(c.patient.emiratesId)}</PatientID>
      <Start>${escapeXml(nowStr)}</Start>
      <End>${escapeXml(nowStr)}</End>
    </Encounter>
${diagnosesXml}
${activitiesXml}
  </Claim>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Claim.Submission xmlns:tns="http://www.eclaimlink.ae/DHD/ValidationSchema" xsi:noNamespaceSchemaLocation="http://www.eclaimlink.ae/DHD/ValidationSchema/ClaimSubmission.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <SenderID>${escapeXml(senderId)}</SenderID>
    <ReceiverID>${escapeXml(receiverId)}</ReceiverID>
    <TransactionDate>${escapeXml(nowStr)}</TransactionDate>
    <RecordCount>${claims.length}</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
${claimsXml}
</Claim.Submission>`;
}

export function buildResubmissionXml(
  draft: ResubmissionDraft,
  senderId = "DHA-F-0048291"
): string {
  const nowStr = formatUaeDate(new Date());
  const attachmentsXml = draft.attachments
    .map(
      (att) =>
        `    <Attachment>\n      <FileName>${escapeXml(att.name)}</FileName>\n      <ContentType>${escapeXml(att.type)}</ContentType>\n    </Attachment>`
    )
    .join("\n");

  const finalCode = draft.modifier
    ? `${draft.activityCode}-${draft.modifier}`
    : draft.activityCode;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Claim.Submission xmlns:tns="http://www.eclaimlink.ae/DHD/ValidationSchema">
  <Header>
    <SenderID>${escapeXml(senderId)}</SenderID>
    <ReceiverID>${escapeXml(draft.receiverId)}</ReceiverID>
    <TransactionDate>${escapeXml(nowStr)}</TransactionDate>
    <RecordCount>1</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
  <Claim>
    <ID>${escapeXml(draft.claimNumber)}</ID>
    <PayerID>${escapeXml(draft.receiverId)}</PayerID>
    <ProviderID>${escapeXml(senderId)}</ProviderID>
    <Net>${draft.adjustedNet.toFixed(2)}</Net>
    <Resubmission>
      <Type>${escapeXml(draft.resubmissionType)}</Type>
      <Comment>${escapeXml(draft.clinicalComment || "Corrected per payer remittance advice")}</Comment>${
        attachmentsXml ? `\n${attachmentsXml}` : ""
      }
    </Resubmission>
    <Activity>
      <ID>ACT-1</ID>
      <Start>${escapeXml(nowStr)}</Start>
      <Type>3</Type>
      <Code>${escapeXml(finalCode)}</Code>
      <Quantity>1</Quantity>
      <Net>${draft.adjustedNet.toFixed(2)}</Net>${
        draft.priorAuthRef
          ? `\n      <PriorAuthorizationID>${escapeXml(draft.priorAuthRef)}</PriorAuthorizationID>`
          : ""
      }
    </Activity>
  </Claim>
</Claim.Submission>`;
}

const INITIAL_CLAIMS: BillingClaim[] = [
  {
    id: "CLM-2026-001",
    encounterId: "ENC-9041",
    tokenNumber: "T-104",
    claimNumber: "CLM-AXA-9041",
    visitDate: "2026-11-25",
    readyTime: "09:15 AM",
    patient: {
      fullName: "Mariam Al Mansoori",
      emiratesId: "784-1988-4512093-1",
      gender: "Female",
      age: 38,
    },
    insurance: {
      receiverId: "AXA-GULF",
      payerName: "AXA Gulf Insurance",
      planName: "AXA Gold Plus",
      memberId: "AXA-8841209",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Sara Al Hashemi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-019284",
    },
    diagnoses: [
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", type: "Principal" },
      { code: "I10", description: "Essential (primary) hypertension", type: "Secondary" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "99213",
        type: "CPT",
        description: "Outpatient Consultation (Established)",
        quantity: 1,
        unitPrice: 350,
        gross: 350,
        patientShare: 50,
        net: 300,
        requiresPriorAuth: false,
      },
      {
        id: "ACT-2",
        code: "83036",
        type: "CPT",
        description: "Hemoglobin A1c (HbA1c) Glycated Assay",
        quantity: 1,
        unitPrice: 120,
        gross: 120,
        patientShare: 0,
        net: 120,
        requiresPriorAuth: false,
      },
    ],
    grossAmount: 470,
    patientShare: 50,
    netAmount: 420,
    workflowStatus: "READY_FOR_CLAIM",
  },
  {
    id: "CLM-2026-002",
    encounterId: "ENC-9042",
    tokenNumber: "T-107",
    claimNumber: "CLM-DAM-9042",
    visitDate: "2026-11-25",
    readyTime: "09:38 AM",
    patient: {
      fullName: "Khalid Bin Zayed",
      emiratesId: "784-1979-7723104-8",
      gender: "Male",
      age: 47,
    },
    insurance: {
      receiverId: "INS-DAMAN",
      payerName: "Daman National Health",
      planName: "Thiqa Enhanced",
      memberId: "DAM-339102",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Tariq Al Nuaimi",
      specialty: "Orthopedics",
      licenseNo: "DHA-P-044112",
    },
    diagnoses: [
      { code: "M54.5", description: "Low back pain", type: "Principal" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "72148",
        type: "CPT",
        description: "MRI Lumbar Spine without Contrast",
        quantity: 1,
        unitPrice: 1450,
        gross: 1450,
        patientShare: 150,
        net: 1300,
        requiresPriorAuth: true,
        priorAuthRef: "",
      },
    ],
    grossAmount: 1450,
    patientShare: 150,
    netAmount: 1300,
    workflowStatus: "READY_FOR_CLAIM",
  },
  {
    id: "CLM-2026-003",
    encounterId: "ENC-9045",
    tokenNumber: "T-111",
    claimNumber: "CLM-NXT-9045",
    visitDate: "2026-11-25",
    readyTime: "10:02 AM",
    patient: {
      fullName: "Amina Abdullah",
      emiratesId: "784-1992-6610291-4",
      gender: "Female",
      age: 34,
    },
    insurance: {
      receiverId: "NEXTCARE",
      payerName: "NextCare TPA",
      planName: "NextCare General Network",
      memberId: "NXT-552019",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Sara Al Hashemi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-019284",
    },
    diagnoses: [],
    procedures: [
      {
        id: "ACT-1",
        code: "99214",
        type: "CPT",
        description: "Detailed Outpatient Consultation",
        quantity: 1,
        unitPrice: 450,
        gross: 450,
        patientShare: 90,
        net: 360,
        requiresPriorAuth: false,
      },
    ],
    grossAmount: 450,
    patientShare: 90,
    netAmount: 360,
    workflowStatus: "READY_FOR_CLAIM",
  },
  {
    id: "CLM-2026-004",
    encounterId: "ENC-9048",
    tokenNumber: "T-114",
    claimNumber: "CLM-AXA-9048",
    visitDate: "2026-11-25",
    readyTime: "10:15 AM",
    patient: {
      fullName: "Omar Al Suwaidi",
      emiratesId: "784-1984-1190442-3",
      gender: "Male",
      age: 42,
    },
    insurance: {
      receiverId: "AXA-GULF",
      payerName: "AXA Gulf Insurance",
      planName: "AXA Corporate Silver",
      memberId: "AXA-771204",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Layla Al Maktoum",
      specialty: "Cardiology",
      licenseNo: "DHA-P-088310",
    },
    diagnoses: [
      { code: "R07.9", description: "Chest pain, unspecified", type: "Principal" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "93000",
        type: "CPT",
        description: "Electrocardiogram (ECG), complete 12-lead",
        quantity: 1,
        unitPrice: 280,
        gross: 280,
        patientShare: 40,
        net: 220,
        requiresPriorAuth: false,
      },
    ],
    grossAmount: 280,
    patientShare: 40,
    netAmount: 220, // Intentional math mismatch: 40 + 220 = 260 != 280
    workflowStatus: "READY_FOR_CLAIM",
  },
  {
    id: "CLM-2026-005",
    encounterId: "ENC-9038",
    tokenNumber: "T-099",
    claimNumber: "CLM-AXA-9038",
    visitDate: "2026-11-25",
    readyTime: "08:50 AM",
    patient: {
      fullName: "Noura Al Qasimi",
      emiratesId: "784-1995-3320184-2",
      gender: "Female",
      age: 31,
    },
    insurance: {
      receiverId: "AXA-GULF",
      payerName: "AXA Gulf Insurance",
      planName: "AXA Gold Plus",
      memberId: "AXA-990211",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Sara Al Hashemi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-019284",
    },
    diagnoses: [
      { code: "J06.9", description: "Acute upper respiratory infection", type: "Principal" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "99213",
        type: "CPT",
        description: "Outpatient Consultation",
        quantity: 1,
        unitPrice: 350,
        gross: 350,
        patientShare: 50,
        net: 300,
        requiresPriorAuth: false,
      },
    ],
    grossAmount: 350,
    patientShare: 50,
    netAmount: 300,
    workflowStatus: "QUEUED_FOR_BATCH",
  },
  {
    id: "CLM-2026-006",
    encounterId: "ENC-9039",
    tokenNumber: "T-101",
    claimNumber: "CLM-DAM-9039",
    visitDate: "2026-11-25",
    readyTime: "09:05 AM",
    patient: {
      fullName: "Rashid Al Falasi",
      emiratesId: "784-1981-9981203-7",
      gender: "Male",
      age: 45,
    },
    insurance: {
      receiverId: "INS-DAMAN",
      payerName: "Daman National Health",
      planName: "Daman Basic Abu Dhabi",
      memberId: "DAM-119022",
      eligibilityStatus: "ACTIVE",
    },
    clinician: {
      name: "Dr. Tariq Al Nuaimi",
      specialty: "Orthopedics",
      licenseNo: "DHA-P-044112",
    },
    diagnoses: [
      { code: "M25.561", description: "Pain in right knee", type: "Principal" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "73560",
        type: "CPT",
        description: "X-Ray Knee, 1 or 2 views",
        quantity: 1,
        unitPrice: 240,
        gross: 240,
        patientShare: 24,
        net: 216,
        requiresPriorAuth: false,
      },
    ],
    grossAmount: 240,
    patientShare: 24,
    netAmount: 216,
    workflowStatus: "QUEUED_FOR_BATCH",
  },
];

const INITIAL_REMITTANCE_LINES: RemittanceLine[] = [
  {
    id: "REM-101",
    claimNumber: "CLM-AXA-8812",
    encounterId: "ENC-8812",
    patientName: "Hessa Al Muhairi",
    receiverId: "AXA-GULF",
    payerName: "AXA Gulf Insurance",
    activityCode: "99213",
    activityDescription: "Outpatient Consultation (Established)",
    gross: 350,
    patientShare: 50,
    net: 300,
    approvedAmount: 300,
    deniedAmount: 0,
    status: "PAID",
    remittanceFile: "RA_AXA-GULF_20261124.xml",
    receivedAt: "2026-11-24 16:40",
    resubmissionStatus: "NONE",
  },
  {
    id: "REM-102",
    claimNumber: "CLM-AXA-8815",
    encounterId: "ENC-8815",
    patientName: "Sultan Al Dhaheri",
    receiverId: "AXA-GULF",
    payerName: "AXA Gulf Insurance",
    activityCode: "80053",
    activityDescription: "Comprehensive Metabolic Panel + Lipid Profile",
    gross: 480,
    patientShare: 60,
    net: 420,
    approvedAmount: 0,
    deniedAmount: 420,
    denialCode: "MNEC-004",
    denialLabel: UAE_DENIAL_CATALOG["MNEC-004"],
    payerRemark: "Lab report & clinical justification missing for comprehensive panel.",
    status: "REJECTED",
    remittanceFile: "RA_AXA-GULF_20261124.xml",
    receivedAt: "2026-11-24 16:40",
    resubmissionStatus: "IN_PROGRESS",
  },
  {
    id: "REM-103",
    claimNumber: "CLM-DAM-8819",
    encounterId: "ENC-8819",
    patientName: "Fatima Al Ketbi",
    receiverId: "INS-DAMAN",
    payerName: "Daman National Health",
    activityCode: "99214",
    activityDescription: "Detailed Outpatient Consultation + ECG",
    gross: 520,
    patientShare: 70,
    net: 450,
    approvedAmount: 310,
    deniedAmount: 140,
    denialCode: "PRCE-001",
    denialLabel: UAE_DENIAL_CATALOG["PRCE-001"],
    payerRemark: "Billed unit price exceeds contracted Daman tariff; modifier -25 required.",
    status: "PARTIAL",
    remittanceFile: "RA_INS-DAMAN_20261124.xml",
    receivedAt: "2026-11-24 17:12",
    resubmissionStatus: "IN_PROGRESS",
  },
  {
    id: "REM-104",
    claimNumber: "CLM-NXT-8821",
    encounterId: "ENC-8821",
    patientName: "Youssef Al Shamsi",
    receiverId: "NEXTCARE",
    payerName: "NextCare TPA",
    activityCode: "72148",
    activityDescription: "MRI Lumbar Spine without Contrast",
    gross: 1450,
    patientShare: 150,
    net: 1300,
    approvedAmount: 0,
    deniedAmount: 1300,
    denialCode: "AUTH-002",
    denialLabel: UAE_DENIAL_CATALOG["AUTH-002"],
    payerRemark: "Prior Authorization reference not found in NextCare portal.",
    status: "REJECTED",
    remittanceFile: "RA_NEXTCARE_20261125.xml",
    receivedAt: "2026-11-25 08:30",
    resubmissionStatus: "IN_PROGRESS",
  },
];

const INITIAL_RESUBMISSIONS: ResubmissionDraft[] = [
  {
    id: "RSB-001",
    remittanceLineId: "REM-102",
    claimNumber: "CLM-AXA-8815",
    patientName: "Sultan Al Dhaheri",
    receiverId: "AXA-GULF",
    payerName: "AXA Gulf Insurance",
    denialCode: "MNEC-004",
    denialLabel: UAE_DENIAL_CATALOG["MNEC-004"],
    payerRemark: "Lab report & clinical justification missing for comprehensive panel.",
    claimedNet: 420,
    approvedAmount: 0,
    deniedAmount: 420,
    attemptNumber: 1,
    resubmissionType: "correction",
    activityCode: "80053",
    modifier: "",
    adjustedNet: 420,
    priorAuthRef: "",
    clinicalComment:
      "Patient presented with uncontrolled hyperlipidemia & fatigue; comprehensive metabolic panel clinically indicated.",
    attachments: [],
    status: "OPEN",
  },
  {
    id: "RSB-002",
    remittanceLineId: "REM-103",
    claimNumber: "CLM-DAM-8819",
    patientName: "Fatima Al Ketbi",
    receiverId: "INS-DAMAN",
    payerName: "Daman National Health",
    denialCode: "PRCE-001",
    denialLabel: UAE_DENIAL_CATALOG["PRCE-001"],
    payerRemark: "Billed unit price exceeds contracted Daman tariff; modifier -25 required.",
    claimedNet: 450,
    approvedAmount: 310,
    deniedAmount: 140,
    attemptNumber: 1,
    resubmissionType: "correction",
    activityCode: "99214",
    modifier: "",
    adjustedNet: 450,
    priorAuthRef: "",
    clinicalComment: "Adding modifier -25 for separately identifiable E/M service.",
    attachments: [],
    status: "OPEN",
  },
  {
    id: "RSB-003",
    remittanceLineId: "REM-104",
    claimNumber: "CLM-NXT-8821",
    patientName: "Youssef Al Shamsi",
    receiverId: "NEXTCARE",
    payerName: "NextCare TPA",
    denialCode: "AUTH-002",
    denialLabel: UAE_DENIAL_CATALOG["AUTH-002"],
    payerRemark: "Prior Authorization reference not found in NextCare portal.",
    claimedNet: 1300,
    approvedAmount: 0,
    deniedAmount: 1300,
    attemptNumber: 1,
    resubmissionType: "correction",
    activityCode: "72148",
    modifier: "",
    adjustedNet: 1300,
    priorAuthRef: "",
    clinicalComment: "Attaching approved NextCare Prior Auth reference.",
    attachments: [],
    status: "OPEN",
  },
];

interface BillingContextValue {
  facilityProfile: {
    name: string;
    licenseNo: string;
    dispositionFlag: "PRODUCTION" | "TEST";
    officerName: string;
  };
  claims: BillingClaim[];
  batches: PayerBatch[];
  remittanceLines: RemittanceLine[];
  resubmissions: ResubmissionDraft[];
  fixClaimData: (
    claimId: string,
    updates: {
      principalIcdCode?: string;
      principalIcdDesc?: string;
      emiratesId?: string;
      memberId?: string;
      priorAuthRefs?: Record<string, string>;
      recalculateNet?: boolean;
    }
  ) => void;
  promoteClaimToBatch: (claimId: string) => boolean;
  promoteAllCleanClaims: () => number;
  removeClaimFromBatch: (claimId: string) => void;
  markBatchDownloaded: (receiverId: string) => void;
  submitBatchToHub: (receiverId: string) => string;
  ingestRemittanceXml: (xmlText: string, fileName?: string) => number;
  autoFetchRemittanceFromHub: () => number;
  sendLineToResubmission: (remittanceLineId: string) => string;
  updateResubmissionDraft: (
    id: string,
    updates: Partial<ResubmissionDraft>
  ) => void;
  submitResubmission: (id: string) => string;
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<BillingClaim[]>(INITIAL_CLAIMS);
  const [remittanceLines, setRemittanceLines] = useState<RemittanceLine[]>(
    INITIAL_REMITTANCE_LINES
  );
  const [resubmissions, setResubmissions] = useState<ResubmissionDraft[]>(
    INITIAL_RESUBMISSIONS
  );
  const [batchMeta, setBatchMeta] = useState<
    Record<
      string,
      {
        status: PayerBatch["status"];
        hubReferenceId?: string;
        exportedAt?: string;
        submittedAt?: string;
      }
    >
  >({});

  const facilityProfile = {
    name: "MOSCTD",
    licenseNo: "DHA-F-0048291",
    dispositionFlag: "PRODUCTION" as const,
    officerName: "Zainab Al-Mansoor",
  };

  const batches = useMemo<PayerBatch[]>(() => {
    const queued = claims.filter(
      (c) =>
        c.workflowStatus === "QUEUED_FOR_BATCH" ||
        c.workflowStatus === "BATCH_DOWNLOADED" ||
        c.workflowStatus === "SUBMITTED_TO_HUB"
    );

    const grouped: Record<string, BillingClaim[]> = {};
    for (const c of queued) {
      const key = c.insurance.receiverId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }

    return Object.entries(grouped).map(([receiverId, groupClaims]) => {
      const meta = batchMeta[receiverId];
      const allSubmitted = groupClaims.every(
        (c) => c.workflowStatus === "SUBMITTED_TO_HUB"
      );
      const anyDownloaded = groupClaims.some(
        (c) => c.workflowStatus === "BATCH_DOWNLOADED"
      );

      return {
        receiverId,
        payerName: groupClaims[0]?.insurance.payerName || receiverId,
        claims: groupClaims,
        totalGross: groupClaims.reduce((s, c) => s + c.grossAmount, 0),
        totalPatientShare: groupClaims.reduce((s, c) => s + c.patientShare, 0),
        totalNet: groupClaims.reduce((s, c) => s + c.netAmount, 0),
        status:
          meta?.status ||
          (allSubmitted
            ? "SUBMITTED_TO_HUB"
            : anyDownloaded
            ? "DOWNLOADED"
            : "READY_TO_EXPORT"),
        hubReferenceId: meta?.hubReferenceId,
        exportedAt: meta?.exportedAt,
        submittedAt: meta?.submittedAt,
      };
    });
  }, [claims, batchMeta]);

  const fixClaimData: BillingContextValue["fixClaimData"] = (claimId, updates) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id !== claimId) return c;
        let nextDiagnoses = [...c.diagnoses];
        if (updates.principalIcdCode && updates.principalIcdCode.trim()) {
          const existingIdx = nextDiagnoses.findIndex((d) => d.type === "Principal");
          const diagObj: BillingDiagnosis = {
            code: updates.principalIcdCode.trim().toUpperCase(),
            description:
              updates.principalIcdDesc?.trim() || "Clinically verified diagnosis",
            type: "Principal",
          };
          if (existingIdx >= 0) {
            nextDiagnoses[existingIdx] = diagObj;
          } else {
            nextDiagnoses = [diagObj, ...nextDiagnoses];
          }
        }

        const nextProcedures = c.procedures.map((p) => {
          const ref = updates.priorAuthRefs?.[p.id];
          return ref !== undefined ? { ...p, priorAuthRef: ref.trim() } : p;
        });

        let nextNet = c.netAmount;
        if (updates.recalculateNet) {
          nextNet = Number((c.grossAmount - c.patientShare).toFixed(2));
        }

        return {
          ...c,
          patient: {
            ...c.patient,
            emiratesId: updates.emiratesId ?? c.patient.emiratesId,
          },
          insurance: {
            ...c.insurance,
            memberId: updates.memberId ?? c.insurance.memberId,
            eligibilityStatus: "ACTIVE",
          },
          diagnoses: nextDiagnoses,
          procedures: nextProcedures,
          netAmount: nextNet,
        };
      })
    );
  };

  const promoteClaimToBatch = (claimId: string): boolean => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return false;
    const scrub = evaluateScrubbing(target);
    if (!scrub.passed) return false;

    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId ? { ...c, workflowStatus: "QUEUED_FOR_BATCH" } : c
      )
    );
    setBatchMeta((prev) => {
      const next = { ...prev };
      delete next[target.insurance.receiverId];
      return next;
    });
    return true;
  };

  const promoteAllCleanClaims = (): number => {
    let count = 0;
    const touchedReceivers = new Set<string>();
    setClaims((prev) =>
      prev.map((c) => {
        if (c.workflowStatus === "READY_FOR_CLAIM" && evaluateScrubbing(c).passed) {
          count += 1;
          touchedReceivers.add(c.insurance.receiverId);
          return { ...c, workflowStatus: "QUEUED_FOR_BATCH" };
        }
        return c;
      })
    );
    if (touchedReceivers.size > 0) {
      setBatchMeta((prev) => {
        const next = { ...prev };
        touchedReceivers.forEach((r) => delete next[r]);
        return next;
      });
    }
    return count;
  };

  const removeClaimFromBatch = (claimId: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId ? { ...c, workflowStatus: "READY_FOR_CLAIM" } : c
      )
    );
  };

  const markBatchDownloaded = (receiverId: string) => {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setClaims((prev) =>
      prev.map((c) =>
        c.insurance.receiverId === receiverId &&
        c.workflowStatus === "QUEUED_FOR_BATCH"
          ? { ...c, workflowStatus: "BATCH_DOWNLOADED" }
          : c
      )
    );
    setBatchMeta((prev) => ({
      ...prev,
      [receiverId]: {
        status: "DOWNLOADED",
        exportedAt: now,
      },
    }));
  };

  const submitBatchToHub = (receiverId: string): string => {
    const refId = `HUB-${receiverId.slice(0, 3)}-${Math.floor(
      100000 + Math.random() * 900000
    )}`;
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setClaims((prev) =>
      prev.map((c) =>
        c.insurance.receiverId === receiverId &&
        (c.workflowStatus === "QUEUED_FOR_BATCH" ||
          c.workflowStatus === "BATCH_DOWNLOADED")
          ? {
              ...c,
              workflowStatus: "SUBMITTED_TO_HUB",
              hubTransactionId: refId,
              submittedAt: now,
            }
          : c
      )
    );
    setBatchMeta((prev) => ({
      ...prev,
      [receiverId]: {
        status: "SUBMITTED_TO_HUB",
        hubReferenceId: refId,
        submittedAt: now,
      },
    }));
    return refId;
  };

  const ingestRemittanceXml = (
    xmlText: string,
    fileName = "Uploaded_RemittanceAdvice.xml"
  ): number => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const senderId =
      doc.querySelector("Header > SenderID")?.textContent?.trim() || "AXA-GULF";
    const claimNodes = Array.from(doc.querySelectorAll("Claim"));
    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");

    const parsedLines: RemittanceLine[] = [];

    claimNodes.forEach((claimEl, cIdx) => {
      const claimNumber =
        claimEl.querySelector(":scope > ID")?.textContent?.trim() ||
        `CLM-IMP-${cIdx + 1}`;
      const activities = Array.from(claimEl.querySelectorAll("Activity"));

      if (activities.length === 0) {
        const net = parseFloat(
          claimEl.querySelector(":scope > Net")?.textContent || "300"
        );
        const payment = parseFloat(
          claimEl.querySelector(":scope > PaymentAmount")?.textContent || "0"
        );
        const denialCode =
          claimEl.querySelector(":scope > DenialCode")?.textContent?.trim() ||
          undefined;
        const denied = Math.max(0, Number((net - payment).toFixed(2)));
        parsedLines.push({
          id: `REM-${Date.now()}-${cIdx}`,
          claimNumber,
          encounterId: `ENC-${claimNumber.slice(-4)}`,
          patientName: "Imported Payer Claim",
          receiverId: senderId,
          payerName: senderId,
          activityCode: "99213",
          activityDescription: "Outpatient Service",
          gross: net,
          patientShare: 0,
          net,
          approvedAmount: payment,
          deniedAmount: denied,
          denialCode,
          denialLabel: denialCode
            ? UAE_DENIAL_CATALOG[denialCode] || "Payer Adjudication Adjustment"
            : undefined,
          payerRemark: denialCode ? `Payer returned ${denialCode}` : undefined,
          status:
            denied === 0 ? "PAID" : payment > 0 ? "PARTIAL" : "REJECTED",
          remittanceFile: fileName,
          receivedAt: nowStr,
          resubmissionStatus: "NONE",
        });
      } else {
        activities.forEach((actEl, aIdx) => {
          const code =
            actEl.querySelector("Code")?.textContent?.trim() || "99213";
          const gross = parseFloat(
            actEl.querySelector("Gross")?.textContent ||
              actEl.querySelector("Net")?.textContent ||
              "350"
          );
          const share = parseFloat(
            actEl.querySelector("PatientShare")?.textContent || "0"
          );
          const net = parseFloat(
            actEl.querySelector("Net")?.textContent || String(gross - share)
          );
          const payment = parseFloat(
            actEl.querySelector("PaymentAmount")?.textContent || "0"
          );
          const denialCode =
            actEl.querySelector("DenialCode")?.textContent?.trim() || undefined;
          const remark =
            actEl.querySelector("DenialRemark")?.textContent?.trim() ||
            (denialCode
              ? UAE_DENIAL_CATALOG[denialCode] || "Adjudicated per payer rules"
              : undefined);
          const denied = Math.max(0, Number((net - payment).toFixed(2)));

          parsedLines.push({
            id: `REM-${Date.now()}-${cIdx}-${aIdx}`,
            claimNumber,
            encounterId: `ENC-${claimNumber.slice(-4)}`,
            patientName:
              actEl.querySelector("PatientName")?.textContent?.trim() ||
              `Patient (${claimNumber})`,
            receiverId: senderId,
            payerName: senderId,
            activityCode: code,
            activityDescription: `CPT ${code} Service Line`,
            gross,
            patientShare: share,
            net,
            approvedAmount: payment,
            deniedAmount: denied,
            denialCode,
            denialLabel: denialCode
              ? UAE_DENIAL_CATALOG[denialCode] || "Payer Denial"
              : undefined,
            payerRemark: remark,
            status:
              denied === 0 ? "PAID" : payment > 0 ? "PARTIAL" : "REJECTED",
            remittanceFile: fileName,
            receivedAt: nowStr,
            resubmissionStatus: "NONE",
          });
        });
      }
    });

    if (parsedLines.length > 0) {
      setRemittanceLines((prev) => [...parsedLines, ...prev]);
    }
    return parsedLines.length;
  };

  const autoFetchRemittanceFromHub = (): number => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Remittance.Advice>
  <Header>
    <SenderID>AXA-GULF</SenderID>
    <ReceiverID>DHA-F-0048291</ReceiverID>
    <RecordCount>2</RecordCount>
  </Header>
  <Claim>
    <ID>CLM-AXA-9012</ID>
    <Activity>
      <Code>99213</Code>
      <PatientName>Salma Al Mazrouei</PatientName>
      <Gross>350.00</Gross>
      <PatientShare>50.00</PatientShare>
      <Net>300.00</Net>
      <PaymentAmount>300.00</PaymentAmount>
    </Activity>
  </Claim>
  <Claim>
    <ID>CLM-AXA-9018</ID>
    <Activity>
      <Code>93000</Code>
      <PatientName>Tariq Al Hashimi</PatientName>
      <Gross>280.00</Gross>
      <PatientShare>40.00</PatientShare>
      <Net>240.00</Net>
      <PaymentAmount>0.00</PaymentAmount>
      <DenialCode>CODE-003</DenialCode>
      <DenialRemark>Modifier -26 or -TC required for ECG interpretation</DenialRemark>
    </Activity>
  </Claim>
</Remittance.Advice>`;
    return ingestRemittanceXml(sampleXml, "RA_HUB_AUTO_20261125.xml");
  };

  const sendLineToResubmission = (remittanceLineId: string): string => {
    const existing = resubmissions.find(
      (r) => r.remittanceLineId === remittanceLineId
    );
    if (existing) return existing.id;

    const line = remittanceLines.find((l) => l.id === remittanceLineId);
    if (!line) return "";

    const newDraft: ResubmissionDraft = {
      id: `RSB-${Date.now().toString().slice(-4)}`,
      remittanceLineId: line.id,
      claimNumber: line.claimNumber,
      patientName: line.patientName,
      receiverId: line.receiverId,
      payerName: line.payerName,
      denialCode: line.denialCode || "MNEC-004",
      denialLabel:
        line.denialLabel ||
        UAE_DENIAL_CATALOG[line.denialCode || "MNEC-004"] ||
        "Payer Denial",
      payerRemark: line.payerRemark || "Denied by payer adjudication engine.",
      claimedNet: line.net,
      approvedAmount: line.approvedAmount,
      deniedAmount: line.deniedAmount,
      attemptNumber: 1,
      resubmissionType: "correction",
      activityCode: line.activityCode,
      modifier: "",
      adjustedNet: line.deniedAmount > 0 ? line.deniedAmount : line.net,
      priorAuthRef: "",
      clinicalComment: "",
      attachments: [],
      status: "OPEN",
    };

    setResubmissions((prev) => [newDraft, ...prev]);
    setRemittanceLines((prev) =>
      prev.map((l) =>
        l.id === remittanceLineId
          ? { ...l, resubmissionStatus: "IN_PROGRESS" }
          : l
      )
    );
    return newDraft.id;
  };

  const updateResubmissionDraft = (
    id: string,
    updates: Partial<ResubmissionDraft>
  ) => {
    setResubmissions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const submitResubmission = (id: string): string => {
    const hubRef = `RSB-HUB-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const target = resubmissions.find((r) => r.id === id);
    setResubmissions((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: "RESUBMITTED", resubmittedAt: nowStr, hubRef }
          : d
      )
    );
    if (target) {
      setRemittanceLines((prev) =>
        prev.map((l) =>
          l.id === target.remittanceLineId
            ? { ...l, resubmissionStatus: "RESUBMITTED" }
            : l
        )
      );
    }
    return hubRef;
  };

  return (
    <BillingContext.Provider
      value={{
        facilityProfile,
        claims,
        batches,
        remittanceLines,
        resubmissions,
        fixClaimData,
        promoteClaimToBatch,
        promoteAllCleanClaims,
        removeClaimFromBatch,
        markBatchDownloaded,
        submitBatchToHub,
        ingestRemittanceXml,
        autoFetchRemittanceFromHub,
        sendLineToResubmission,
        updateResubmissionDraft,
        submitResubmission,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return ctx;
}
