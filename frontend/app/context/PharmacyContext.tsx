"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

export type ErxSource = "INTERNAL_CLINIC" | "EXTERNAL_HUB";
export type ErxDispenseStatus = "PENDING_DISPENSE" | "PARTIALLY_DISPENSED" | "DISPENSED";
export type TatmeenStatus = "UNVERIFIED" | "VERIFIED" | "EXPIRED" | "RECALLED" | "MISMATCH";

export interface TatmeenScanData {
  rawGs1: string;
  gtin: string;
  batchLot: string;
  expiryDate: string;
  serialNumber: string;
  status: TatmeenStatus;
  message: string;
  verifiedAt?: string;
}

export interface GenericOption {
  drugCode: string;
  tradeName: string;
  genericName: string;
  unitPrice: number;
  gtin: string;
}

export interface ErxMedicationLine {
  id: string;
  drugCode: string;
  tradeName: string;
  genericName: string;
  gtin: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  prescribedQty: number;
  dispensedQty: number;
  selectedDispenseQty: number;
  unitPrice: number;
  icd10Code: string;
  icd10Description: string;
  instructions?: string;
  doctorAllowsSubstitution: boolean;
  insuranceAllowsSubstitution: boolean;
  genericEquivalent?: GenericOption;
  isSubstituted: boolean;
  tatmeenScan: TatmeenScanData;
}

export interface ErxOrder {
  id: string;
  erxRefNo: string;
  source: ErxSource;
  createdAt: string;
  status: ErxDispenseStatus;
  patient: {
    fullName: string;
    emiratesId: string;
    dob: string;
    gender: "Male" | "Female";
    phone: string;
  };
  prescriber: {
    name: string;
    licenseNo: string;
    facilityName: string;
    specialty: string;
  };
  insurance: {
    receiverId: string;
    payerName: string;
    planName: string;
    memberId: string;
    eligibilityStatus: "ACTIVE" | "EXPIRED" | "SELF_PAY";
    copayPercent: number;
    copayCap: number;
  };
  diagnoses: {
    code: string;
    description: string;
    type: "Principal" | "Secondary";
  }[];
  medications: ErxMedicationLine[];
  lastReceiptNo?: string;
}

export interface PharmacyClaimActivity {
  id: string;
  activityType: 5; // 5 = Drug / Medication per DHA eClaimLink & MoHAP Riayati
  drugCode: string;
  tradeName: string;
  quantity: number;
  gross: number;
  patientShare: number;
  net: number;
  tatmeenSerial: string;
  tatmeenGtin: string;
  batchLot: string;
  expiryDate: string;
}

export interface PharmacyClaim {
  id: string;
  claimNumber: string;
  erxRefNo: string;
  dispensedAt: string;
  patientName: string;
  emiratesId: string;
  memberId: string;
  receiverId: string;
  payerName: string;
  prescriberLicense: string;
  pharmacistLicense: string;
  pharmacyFacilityLicense: string;
  diagnoses: {
    code: string;
    description: string;
    type: "Principal" | "Secondary";
  }[];
  activities: PharmacyClaimActivity[];
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  paymentMethod: "CASH" | "CARD";
  receiptNo: string;
  status: "READY_FOR_CLAIM" | "DOWNLOADED" | "SUBMITTED_TO_HUB";
  hubTransactionId?: string;
}

export interface PharmacyFacilityProfile {
  pharmacyName: string;
  pharmacyLicenseId: string;
  pharmacistName: string;
  pharmacistLicenseId: string;
  emirate: "DXB" | "AUH" | "MOHAP";
  dispositionFlag: "TEST" | "PRODUCTION";
}

const DEFAULT_FACILITY_PROFILE: PharmacyFacilityProfile = {
  pharmacyName: "Al Noor Central Pharmacy",
  pharmacyLicenseId: "PHARM-DXB-44019",
  pharmacistName: "Dr. Nadia Al Mansoori, RPh",
  pharmacistLicenseId: "DHA-PH-88421",
  emirate: "DXB",
  dispositionFlag: "TEST",
};

const EMPTY_SCAN: TatmeenScanData = {
  rawGs1: "",
  gtin: "",
  batchLot: "",
  expiryDate: "",
  serialNumber: "",
  status: "UNVERIFIED",
  message: "Awaiting GS1 2D DataMatrix scan",
};

const RECALLED_BATCHES = new Set(["RECALL-99", "LOT-REC-24", "BATCH-R01"]);

/**
 * Parses a GS1 2D DataMatrix string (parenthesized or FNC1-concatenated)
 * and validates GTIN, Expiry Date, Batch Recall status, and Serial Number against Tatmeen rules.
 */
export function parseAndVerifyTatmeenGs1(
  rawInput: string,
  expectedGtin: string
): TatmeenScanData {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ...EMPTY_SCAN };
  }

  let gtin = "";
  let expRaw = "";
  let batchLot = "";
  let serialNumber = "";

  // Support parenthesized GS1 format: (01)14digits(17)6digits(10)batch(21)serial
  const gtinMatch = trimmed.match(/\(01\)(\d{14})/);
  const expMatch = trimmed.match(/\(17\)(\d{6})/);
  const batchMatch = trimmed.match(/\(10\)([^\(]+)/);
  const serialMatch = trimmed.match(/\(21\)([^\(]+)/);

  if (gtinMatch) gtin = gtinMatch[1];
  if (expMatch) expRaw = expMatch[1];
  if (batchMatch) batchLot = batchMatch[1].trim();
  if (serialMatch) serialNumber = serialMatch[1].trim();

  // Fallback for non-parenthesized GS1 scanner wedge output: 01<14>17<6>10<var>
  if (!gtin && trimmed.startsWith("01") && trimmed.length >= 26) {
    gtin = trimmed.slice(2, 16);
    if (trimmed.slice(16, 18) === "17") {
      expRaw = trimmed.slice(18, 24);
    }
    const rest = trimmed.slice(24);
    if (rest.startsWith("10")) {
      const idx21 = rest.indexOf("21", 2);
      if (idx21 > 2) {
        batchLot = rest.slice(2, idx21);
        serialNumber = rest.slice(idx21 + 2);
      } else {
        batchLot = rest.slice(2);
      }
    }
  }

  if (!gtin || !expRaw || !batchLot || !serialNumber) {
    return {
      rawGs1: trimmed,
      gtin: gtin || "INVALID",
      batchLot: batchLot || "—",
      expiryDate: expRaw || "—",
      serialNumber: serialNumber || "—",
      status: "MISMATCH",
      message: "Invalid GS1 DataMatrix format. Expected (01)GTIN(17)YYMMDD(10)BATCH(21)SERIAL.",
    };
  }

  const yy = parseInt(expRaw.slice(0, 2), 10);
  const mm = parseInt(expRaw.slice(2, 4), 10);
  const dd = parseInt(expRaw.slice(4, 6), 10);
  const fullYear = 2000 + yy;
  const formattedExpiry = `${fullYear}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  // Check GTIN match
  if (expectedGtin && gtin !== expectedGtin) {
    return {
      rawGs1: trimmed,
      gtin,
      batchLot,
      expiryDate: formattedExpiry,
      serialNumber,
      status: "MISMATCH",
      message: `GTIN mismatch: scanned ${gtin}, expected ${expectedGtin}.`,
    };
  }

  // Check Tatmeen recall registry
  if (RECALLED_BATCHES.has(batchLot.toUpperCase())) {
    return {
      rawGs1: trimmed,
      gtin,
      batchLot,
      expiryDate: formattedExpiry,
      serialNumber,
      status: "RECALLED",
      message: `MoHAP Tatmeen Alert: Batch ${batchLot} is under active recall. Do NOT dispense.`,
    };
  }

  // Check expiry against current date
  const expiryDt = new Date(fullYear, mm - 1, dd || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(expiryDt.getTime()) || expiryDt < today) {
    return {
      rawGs1: trimmed,
      gtin,
      batchLot,
      expiryDate: formattedExpiry,
      serialNumber,
      status: "EXPIRED",
      message: `Expired Pack (${formattedExpiry}). Blocked by Tatmeen safety gate.`,
    };
  }

  return {
    rawGs1: trimmed,
    gtin,
    batchLot,
    expiryDate: formattedExpiry,
    serialNumber,
    status: "VERIFIED",
    message: "Tatmeen Verified: Authentic, active batch, valid expiry.",
    verifiedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function getActiveMedicationValues(line: ErxMedicationLine) {
  if (line.isSubstituted && line.genericEquivalent) {
    return {
      drugCode: line.genericEquivalent.drugCode,
      tradeName: line.genericEquivalent.tradeName,
      genericName: line.genericEquivalent.genericName,
      unitPrice: line.genericEquivalent.unitPrice,
      gtin: line.genericEquivalent.gtin,
    };
  }
  return {
    drugCode: line.drugCode,
    tradeName: line.tradeName,
    genericName: line.genericName,
    unitPrice: line.unitPrice,
    gtin: line.gtin,
  };
}

export function calculateOrderFinancials(order: ErxOrder | undefined | null) {
  if (!order) {
    return { totalGross: 0, patientShare: 0, insurerNet: 0, lineBreakdown: [] as { id: string; gross: number; patientShare: number; net: number }[] };
  }

  const isSelfPay = order.insurance.eligibilityStatus !== "ACTIVE";
  const copayPct = isSelfPay ? 100 : order.insurance.copayPercent;
  const copayCap = isSelfPay ? Infinity : order.insurance.copayCap;

  const rawLines = order.medications.map((m) => {
    const active = getActiveMedicationValues(m);
    const qty = m.selectedDispenseQty;
    const gross = Number((active.unitPrice * qty).toFixed(2));
    return { id: m.id, gross };
  });

  const totalGross = Number(rawLines.reduce((s, l) => s + l.gross, 0).toFixed(2));
  let totalPatientShare = Number(((totalGross * copayPct) / 100).toFixed(2));
  if (copayCap !== Infinity && totalPatientShare > copayCap) {
    totalPatientShare = copayCap;
  }
  const insurerNet = Number((totalGross - totalPatientShare).toFixed(2));

  // Pro-rate patientShare across lines cleanly so line sums always match order totals
  let allocatedShare = 0;
  const lineBreakdown = rawLines.map((l, idx) => {
    if (totalGross === 0) {
      return { id: l.id, gross: 0, patientShare: 0, net: 0 };
    }
    const share =
      idx === rawLines.length - 1
        ? Number((totalPatientShare - allocatedShare).toFixed(2))
        : Number(((l.gross / totalGross) * totalPatientShare).toFixed(2));
    allocatedShare += share;
    const net = Number((l.gross - share).toFixed(2));
    return { id: l.id, gross: l.gross, patientShare: share, net };
  });

  return { totalGross, patientShare: totalPatientShare, insurerNet, lineBreakdown };
}

export function buildPharmacyClaimXml(
  receiverId: string,
  claims: PharmacyClaim[],
  pharmacyLicenseId: string
): string {
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const claimsXml = claims
    .map((c) => {
      const diagXml = c.diagnoses
        .map(
          (d) =>
            `      <Diagnosis>\n        <Type>${d.type}</Type>\n        <Code>${d.code}</Code>\n      </Diagnosis>`
        )
        .join("\n");

      const actXml = c.activities
        .map(
          (a) =>
            `      <Activity>\n        <ID>${a.id}</ID>\n        <Start>${c.dispensedAt}</Start>\n        <Type>${a.activityType}</Type>\n        <Code>${a.drugCode}</Code>\n        <Quantity>${a.quantity}</Quantity>\n        <Net>${a.net.toFixed(2)}</Net>\n        <Gross>${a.gross.toFixed(2)}</Gross>\n        <PatientShare>${a.patientShare.toFixed(2)}</PatientShare>\n        <Clinician>${c.pharmacistLicense}</Clinician>\n        <Observation>\n          <Type>Tatmeen</Type>\n          <Code>${a.tatmeenGtin}</Code>\n          <Value>LOT:${a.batchLot}|EXP:${a.expiryDate}|SN:${a.tatmeenSerial}</Value>\n        </Observation>\n      </Activity>`
        )
        .join("\n");

      return `  <Claim>\n    <ID>${c.claimNumber}</ID>\n    <IDPayer>${c.erxRefNo}</IDPayer>\n    <MemberID>${c.memberId}</MemberID>\n    <PayerID>${c.receiverId}</PayerID>\n    <ProviderID>${c.pharmacyFacilityLicense}</ProviderID>\n    <EmiratesIDNumber>${c.emiratesId}</EmiratesIDNumber>\n    <Gross>${c.grossAmount.toFixed(2)}</Gross>\n    <PatientShare>${c.patientShare.toFixed(2)}</PatientShare>\n    <Net>${c.netAmount.toFixed(2)}</Net>\n    <Encounter>\n      <FacilityID>${c.pharmacyFacilityLicense}</FacilityID>\n      <Type>1</Type>\n      <PatientID>${c.emiratesId}</PatientID>\n      <OrderingClinician>${c.prescriberLicense}</OrderingClinician>\n    </Encounter>\n${diagXml}\n${actXml}\n  </Claim>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>\n<Claim.Submission xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <Header>\n    <SenderID>${pharmacyLicenseId}</SenderID>\n    <ReceiverID>${receiverId}</ReceiverID>\n    <TransactionDate>${nowIso}</TransactionDate>\n    <RecordCount>${claims.length}</RecordCount>\n    <DispositionFlag>TEST</DispositionFlag>\n  </Header>\n${claimsXml}\n</Claim.Submission>`;
}

const INITIAL_ERX_QUEUE: ErxOrder[] = [
  {
    id: "erx-101",
    erxRefNo: "ERX-20261125-4812",
    source: "INTERNAL_CLINIC",
    createdAt: "2026-11-25 09:42",
    status: "PENDING_DISPENSE",
    patient: {
      fullName: "Fatima Al Suwaidi",
      emiratesId: "784-1988-4412093-1",
      dob: "1988-04-14",
      gender: "Female",
      phone: "+971 50 482 1190",
    },
    prescriber: {
      name: "Dr. Tariq Al Hashimi",
      licenseNo: "DHA-P-44912",
      facilityName: "Al Noor Medical Center",
      specialty: "Internal Medicine",
    },
    insurance: {
      receiverId: "TPA009",
      payerName: "Daman National Health",
      planName: "Enhanced Gold",
      memberId: "DMN-88492011",
      eligibilityStatus: "ACTIVE",
      copayPercent: 20,
      copayCap: 50,
    },
    diagnoses: [
      { code: "J06.9", description: "Acute upper respiratory infection, unspecified", type: "Principal" },
      { code: "R50.9", description: "Fever, unspecified", type: "Secondary" },
    ],
    medications: [
      {
        id: "med-101-a",
        drugCode: "DDC-0412-008911",
        tradeName: "Augmentin 1g Film-Coated Tablets",
        genericName: "Amoxicillin / Clavulanic Acid 875/125mg",
        gtin: "06291100123456",
        dosage: "1 Tablet",
        frequency: "Every 12 hours (BID)",
        durationDays: 7,
        prescribedQty: 14,
        dispensedQty: 0,
        selectedDispenseQty: 14,
        unitPrice: 78,
        icd10Code: "J06.9",
        icd10Description: "Acute upper respiratory infection",
        instructions: "Take at the start of a meal.",
        doctorAllowsSubstitution: true,
        insuranceAllowsSubstitution: true,
        genericEquivalent: {
          drugCode: "DDC-0412-009204",
          tradeName: "Amoclan 1g Tablets (Julphar)",
          genericName: "Amoxicillin / Clavulanic Acid 875/125mg",
          unitPrice: 46,
          gtin: "06291100998877",
        },
        isSubstituted: false,
        tatmeenScan: { ...EMPTY_SCAN },
      },
      {
        id: "med-101-b",
        drugCode: "DDC-0118-002310",
        tradeName: "Panadol Extra Advance 500mg",
        genericName: "Paracetamol / Caffeine",
        gtin: "06291100554433",
        dosage: "2 Tablets",
        frequency: "Every 6 hours PRN",
        durationDays: 5,
        prescribedQty: 20,
        dispensedQty: 0,
        selectedDispenseQty: 20,
        unitPrice: 18,
        icd10Code: "R50.9",
        icd10Description: "Fever, unspecified",
        instructions: "Do not exceed 8 tablets in 24 hours.",
        doctorAllowsSubstitution: true,
        insuranceAllowsSubstitution: true,
        genericEquivalent: {
          drugCode: "DDC-0118-002399",
          tradeName: "Adol Extra Caplets (Julphar)",
          genericName: "Paracetamol / Caffeine",
          unitPrice: 12,
          gtin: "06291100554499",
        },
        isSubstituted: false,
        tatmeenScan: { ...EMPTY_SCAN },
      },
    ],
  },
  {
    id: "erx-102",
    erxRefNo: "ERX-20261125-7741",
    source: "EXTERNAL_HUB",
    createdAt: "2026-11-25 10:05",
    status: "PARTIALLY_DISPENSED",
    patient: {
      fullName: "Khalid Al Maktoum",
      emiratesId: "784-1975-9910421-5",
      dob: "1975-11-02",
      gender: "Male",
      phone: "+971 55 910 3321",
    },
    prescriber: {
      name: "Dr. Elena Rostova",
      licenseNo: "MOH-DOC-71204",
      facilityName: "Emirates Specialty Hospital (Riayati Hub)",
      specialty: "Endocrinology",
    },
    insurance: {
      receiverId: "INS025",
      payerName: "Bupa Global UAE",
      planName: "Premier Select",
      memberId: "BPA-5520918",
      eligibilityStatus: "ACTIVE",
      copayPercent: 10,
      copayCap: 75,
    },
    diagnoses: [
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", type: "Principal" },
      { code: "E78.5", description: "Hyperlipidemia, unspecified", type: "Secondary" },
    ],
    medications: [
      {
        id: "med-102-a",
        drugCode: "DDC-0891-004120",
        tradeName: "Glucophage XR 1000mg",
        genericName: "Metformin Hydrochloride",
        gtin: "06291100771122",
        dosage: "1 Tablet",
        frequency: "Once daily with dinner",
        durationDays: 30,
        prescribedQty: 30,
        dispensedQty: 30,
        selectedDispenseQty: 0,
        unitPrice: 64,
        icd10Code: "E11.9",
        icd10Description: "Type 2 diabetes mellitus",
        doctorAllowsSubstitution: false,
        insuranceAllowsSubstitution: true,
        isSubstituted: false,
        tatmeenScan: {
          rawGs1: "(01)06291100771122(17)271130(10)MET26A(21)SN7741002",
          gtin: "06291100771122",
          batchLot: "MET26A",
          expiryDate: "2027-11-30",
          serialNumber: "SN7741002",
          status: "VERIFIED",
          message: "Already dispensed in previous visit",
          verifiedAt: "10:12",
        },
      },
      {
        id: "med-102-b",
        drugCode: "DDC-0552-001980",
        tradeName: "Lipitor 20mg Film-Coated Tablets",
        genericName: "Atorvastatin Calcium",
        gtin: "06291100882233",
        dosage: "1 Tablet",
        frequency: "Once daily at bedtime",
        durationDays: 30,
        prescribedQty: 30,
        dispensedQty: 0,
        selectedDispenseQty: 30,
        unitPrice: 112,
        icd10Code: "E78.5",
        icd10Description: "Hyperlipidemia, unspecified",
        doctorAllowsSubstitution: true,
        insuranceAllowsSubstitution: true,
        genericEquivalent: {
          drugCode: "DDC-0552-002105",
          tradeName: "Atorva 20mg Tablets",
          genericName: "Atorvastatin Calcium",
          unitPrice: 54,
          gtin: "06291100882299",
        },
        isSubstituted: false,
        tatmeenScan: { ...EMPTY_SCAN },
      },
    ],
  },
  {
    id: "erx-103",
    erxRefNo: "ERX-20261125-3309",
    source: "INTERNAL_CLINIC",
    createdAt: "2026-11-25 10:28",
    status: "PENDING_DISPENSE",
    patient: {
      fullName: "Mariam Al Zaabi",
      emiratesId: "784-1993-7731204-8",
      dob: "1993-08-21",
      gender: "Female",
      phone: "+971 52 741 8890",
    },
    prescriber: {
      name: "Dr. Samira Al Qasimi",
      licenseNo: "DHA-P-60118",
      facilityName: "Al Noor Medical Center",
      specialty: "Pulmonology",
    },
    insurance: {
      receiverId: "INS012",
      payerName: "ADNIC Insurance",
      planName: "Silver Basic",
      memberId: "ADN-3391024",
      eligibilityStatus: "ACTIVE",
      copayPercent: 20,
      copayCap: 100,
    },
    diagnoses: [
      { code: "J45.9", description: "Asthma, unspecified", type: "Principal" },
    ],
    medications: [
      {
        id: "med-103-a",
        drugCode: "DDC-0930-007741",
        tradeName: "Symbicort Turbuhaler 160/4.5 mcg",
        genericName: "Budesonide / Formoterol",
        gtin: "06291100331144",
        dosage: "1 Inhalation",
        frequency: "Twice daily",
        durationDays: 30,
        prescribedQty: 1,
        dispensedQty: 0,
        selectedDispenseQty: 1,
        unitPrice: 215,
        icd10Code: "J45.9",
        icd10Description: "Asthma, unspecified",
        instructions: "Rinse mouth with water after inhalation.",
        doctorAllowsSubstitution: false,
        insuranceAllowsSubstitution: false,
        isSubstituted: false,
        tatmeenScan: { ...EMPTY_SCAN },
      },
    ],
  },
  {
    id: "erx-104",
    erxRefNo: "ERX-20261125-1102",
    source: "EXTERNAL_HUB",
    createdAt: "2026-11-25 08:50",
    status: "DISPENSED",
    patient: {
      fullName: "Omar Hassan",
      emiratesId: "784-1982-3309182-3",
      dob: "1982-01-19",
      gender: "Male",
      phone: "+971 56 301 4451",
    },
    prescriber: {
      name: "Dr. Tariq Al Hashimi",
      licenseNo: "DHA-P-44912",
      facilityName: "Dubai Care Polyclinic",
      specialty: "General Practice",
    },
    insurance: {
      receiverId: "TPA009",
      payerName: "Daman National Health",
      planName: "Enhanced Gold",
      memberId: "DMN-10923441",
      eligibilityStatus: "ACTIVE",
      copayPercent: 20,
      copayCap: 50,
    },
    diagnoses: [
      { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", type: "Principal" },
    ],
    medications: [
      {
        id: "med-104-a",
        drugCode: "DDC-0301-005510",
        tradeName: "Nexium 40mg Gastro-Resistant Tablets",
        genericName: "Esomeprazole",
        gtin: "06291100667788",
        dosage: "1 Tablet",
        frequency: "Once daily before breakfast",
        durationDays: 14,
        prescribedQty: 14,
        dispensedQty: 14,
        selectedDispenseQty: 0,
        unitPrice: 95,
        icd10Code: "K21.9",
        icd10Description: "GERD without esophagitis",
        doctorAllowsSubstitution: true,
        insuranceAllowsSubstitution: true,
        isSubstituted: false,
        tatmeenScan: {
          rawGs1: "(01)06291100667788(17)280315(10)NX26B(21)SN1102884",
          gtin: "06291100667788",
          batchLot: "NX26B",
          expiryDate: "2028-03-15",
          serialNumber: "SN1102884",
          status: "VERIFIED",
          message: "Tatmeen Verified",
          verifiedAt: "09:04",
        },
      },
    ],
    lastReceiptNo: "REC-PH-20261125-001",
  },
];

const INITIAL_CLAIMS: PharmacyClaim[] = [
  {
    id: "ph-clm-001",
    claimNumber: "PHCLM-2026-0091",
    erxRefNo: "ERX-20261125-1102",
    dispensedAt: "25/11/2026 09:05",
    patientName: "Omar Hassan",
    emiratesId: "784-1982-3309182-3",
    memberId: "DMN-10923441",
    receiverId: "TPA009",
    payerName: "Daman National Health",
    prescriberLicense: "DHA-P-44912",
    pharmacistLicense: "DHA-PH-88421",
    pharmacyFacilityLicense: "PHARM-DXB-44019",
    diagnoses: [
      { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", type: "Principal" },
    ],
    activities: [
      {
        id: "act-9101",
        activityType: 5,
        drugCode: "DDC-0301-005510",
        tradeName: "Nexium 40mg Gastro-Resistant Tablets",
        quantity: 14,
        gross: 1330,
        patientShare: 50,
        net: 1280,
        tatmeenSerial: "SN1102884",
        tatmeenGtin: "06291100667788",
        batchLot: "NX26B",
        expiryDate: "2028-03-15",
      },
    ],
    grossAmount: 1330,
    patientShare: 50,
    netAmount: 1280,
    paymentMethod: "CARD",
    receiptNo: "REC-PH-20261125-001",
    status: "READY_FOR_CLAIM",
  },
];

interface PharmacyContextType {
  facilityProfile: PharmacyFacilityProfile;
  erxQueue: ErxOrder[];
  claims: PharmacyClaim[];
  activeErxId: string;
  setActiveErxId: (id: string) => void;
  toggleGenericSubstitution: (erxId: string, lineId: string) => void;
  updateLineDispenseQty: (erxId: string, lineId: string, qty: number) => void;
  scanTatmeenBarcode: (erxId: string, lineId: string, rawGs1: string) => TatmeenScanData;
  dispenseOrder: (
    erxId: string,
    paymentMethod: "CASH" | "CARD"
  ) => { success: boolean; receiptNo?: string; claimNumber?: string; error?: string };
  pullExternalErxFromHub: (query: string) => ErxOrder | null;
  markClaimDownloaded: (receiverId: string) => void;
  submitPharmacyBatchToHub: (receiverId: string) => string;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const [facilityProfile] = useState<PharmacyFacilityProfile>(DEFAULT_FACILITY_PROFILE);
  const [erxQueue, setErxQueue] = useState<ErxOrder[]>(INITIAL_ERX_QUEUE);
  const [claims, setClaims] = useState<PharmacyClaim[]>(INITIAL_CLAIMS);
  const [activeErxId, setActiveErxId] = useState<string>(INITIAL_ERX_QUEUE[0].id);

  const toggleGenericSubstitution = (erxId: string, lineId: string) => {
    setErxQueue((prev) =>
      prev.map((order) => {
        if (order.id !== erxId) return order;
        return {
          ...order,
          medications: order.medications.map((line) => {
            if (line.id !== lineId) return line;
            if (
              !line.doctorAllowsSubstitution ||
              !line.insuranceAllowsSubstitution ||
              !line.genericEquivalent
            ) {
              return line;
            }
            return {
              ...line,
              isSubstituted: !line.isSubstituted,
              // Reset Tatmeen scan because the physical product GTIN changed
              tatmeenScan: { ...EMPTY_SCAN },
            };
          }),
        };
      })
    );
  };

  const updateLineDispenseQty = (erxId: string, lineId: string, qty: number) => {
    setErxQueue((prev) =>
      prev.map((order) => {
        if (order.id !== erxId) return order;
        return {
          ...order,
          medications: order.medications.map((line) => {
            if (line.id !== lineId) return line;
            const remaining = Math.max(0, line.prescribedQty - line.dispensedQty);
            const clamped = Math.max(0, Math.min(remaining, qty));
            return { ...line, selectedDispenseQty: clamped };
          }),
        };
      })
    );
  };

  const scanTatmeenBarcode = (erxId: string, lineId: string, rawGs1: string): TatmeenScanData => {
    const order = erxQueue.find((o) => o.id === erxId);
    const line = order?.medications.find((m) => m.id === lineId);
    const expectedGtin = line ? getActiveMedicationValues(line).gtin : "";
    const result = parseAndVerifyTatmeenGs1(rawGs1, expectedGtin);

    setErxQueue((prev) =>
      prev.map((o) => {
        if (o.id !== erxId) return o;
        return {
          ...o,
          medications: o.medications.map((m) =>
            m.id === lineId ? { ...m, tatmeenScan: result } : m
          ),
        };
      })
    );

    return result;
  };

  const dispenseOrder = (erxId: string, paymentMethod: "CASH" | "CARD") => {
    const order = erxQueue.find((o) => o.id === erxId);
    if (!order) return { success: false, error: "eRx order not found." };

    const linesToDispense = order.medications.filter((m) => m.selectedDispenseQty > 0);
    if (linesToDispense.length === 0) {
      return { success: false, error: "Select at least one medication quantity to dispense." };
    }

    const unverified = linesToDispense.filter((m) => m.tatmeenScan.status !== "VERIFIED");
    if (unverified.length > 0) {
      return {
        success: false,
        error: `Tatmeen GS1 verification required for ${unverified[0].tradeName}.`,
      };
    }

    const financials = calculateOrderFinancials(order);
    const receiptNo = `REC-PH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    const claimNumber = `PHCLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dispensedAt = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const activities: PharmacyClaimActivity[] = linesToDispense.map((line, i) => {
      const active = getActiveMedicationValues(line);
      const breakdown = financials.lineBreakdown.find((b) => b.id === line.id) || {
        gross: 0,
        patientShare: 0,
        net: 0,
      };
      return {
        id: `act-${Date.now()}-${i}`,
        activityType: 5,
        drugCode: active.drugCode,
        tradeName: active.tradeName,
        quantity: line.selectedDispenseQty,
        gross: breakdown.gross,
        patientShare: breakdown.patientShare,
        net: breakdown.net,
        tatmeenSerial: line.tatmeenScan.serialNumber,
        tatmeenGtin: line.tatmeenScan.gtin,
        batchLot: line.tatmeenScan.batchLot,
        expiryDate: line.tatmeenScan.expiryDate,
      };
    });

    const newClaim: PharmacyClaim = {
      id: `ph-clm-${Date.now()}`,
      claimNumber,
      erxRefNo: order.erxRefNo,
      dispensedAt,
      patientName: order.patient.fullName,
      emiratesId: order.patient.emiratesId,
      memberId: order.insurance.memberId,
      receiverId: order.insurance.receiverId,
      payerName: order.insurance.payerName,
      prescriberLicense: order.prescriber.licenseNo,
      pharmacistLicense: facilityProfile.pharmacistLicenseId,
      pharmacyFacilityLicense: facilityProfile.pharmacyLicenseId,
      diagnoses: order.diagnoses,
      activities,
      grossAmount: financials.totalGross,
      patientShare: financials.patientShare,
      netAmount: financials.insurerNet,
      paymentMethod,
      receiptNo,
      status: "READY_FOR_CLAIM",
    };

    // Update order quantities & status
    setErxQueue((prev) =>
      prev.map((o) => {
        if (o.id !== erxId) return o;
        const updatedMeds = o.medications.map((m) => {
          const newDispensed = m.dispensedQty + m.selectedDispenseQty;
          const remaining = Math.max(0, m.prescribedQty - newDispensed);
          return {
            ...m,
            dispensedQty: newDispensed,
            selectedDispenseQty: remaining,
          };
        });
        const allDone = updatedMeds.every((m) => m.dispensedQty >= m.prescribedQty);
        return {
          ...o,
          medications: updatedMeds,
          status: allDone ? "DISPENSED" : "PARTIALLY_DISPENSED",
          lastReceiptNo: receiptNo,
        };
      })
    );

    // Only create an insurance claim when payer is active and net > 0
    if (order.insurance.eligibilityStatus === "ACTIVE" && financials.insurerNet > 0) {
      setClaims((prev) => [newClaim, ...prev]);
    }

    return { success: true, receiptNo, claimNumber };
  };

  const pullExternalErxFromHub = (query: string): ErxOrder | null => {
    const clean = query.trim();
    if (!clean) return null;

    const existing = erxQueue.find(
      (o) =>
        o.erxRefNo.toLowerCase() === clean.toLowerCase() ||
        o.patient.emiratesId.toLowerCase() === clean.toLowerCase()
    );
    if (existing) return existing;

    const newExternal: ErxOrder = {
      id: `erx-hub-${Date.now()}`,
      erxRefNo: clean.toUpperCase().startsWith("ERX")
        ? clean.toUpperCase()
        : `ERX-HUB-${Math.floor(1000 + Math.random() * 9000)}`,
      source: "EXTERNAL_HUB",
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "PENDING_DISPENSE",
      patient: {
        fullName: "Sultan Al Dhaheri",
        emiratesId: clean.startsWith("784") ? clean : "784-1990-6120934-2",
        dob: "1990-06-12",
        gender: "Male",
        phone: "+971 50 882 1044",
      },
      prescriber: {
        name: "Dr. Majed Al Ketbi",
        licenseNo: "MOH-DOC-55109",
        facilityName: "Cleveland Clinic Abu Dhabi (Riayati Hub)",
        specialty: "Cardiology",
      },
      insurance: {
        receiverId: "TPA009",
        payerName: "Daman National Health",
        planName: "Thiqa / Enhanced",
        memberId: "DMN-77120944",
        eligibilityStatus: "ACTIVE",
        copayPercent: 10,
        copayCap: 50,
      },
      diagnoses: [
        { code: "I10", description: "Essential (primary) hypertension", type: "Principal" },
      ],
      medications: [
        {
          id: `med-hub-${Date.now()}`,
          drugCode: "DDC-0710-003312",
          tradeName: "Coversyl 5mg Film-Coated Tablets",
          genericName: "Perindopril Arginine",
          gtin: "06291100445566",
          dosage: "1 Tablet",
          frequency: "Once daily in the morning",
          durationDays: 30,
          prescribedQty: 30,
          dispensedQty: 0,
          selectedDispenseQty: 30,
          unitPrice: 82,
          icd10Code: "I10",
          icd10Description: "Essential hypertension",
          doctorAllowsSubstitution: true,
          insuranceAllowsSubstitution: true,
          genericEquivalent: {
            drugCode: "DDC-0710-003499",
            tradeName: "Perindopril 5mg (Neopharma)",
            genericName: "Perindopril Arginine",
            unitPrice: 45,
            gtin: "06291100445599",
          },
          isSubstituted: false,
          tatmeenScan: { ...EMPTY_SCAN },
        },
      ],
    };

    setErxQueue((prev) => [newExternal, ...prev]);
    return newExternal;
  };

  const markClaimDownloaded = (receiverId: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.receiverId === receiverId && c.status === "READY_FOR_CLAIM"
          ? { ...c, status: "DOWNLOADED" }
          : c
      )
    );
  };

  const submitPharmacyBatchToHub = (receiverId: string) => {
    const txId = `HUB-PH-${Math.floor(100000 + Math.random() * 900000)}`;
    setClaims((prev) =>
      prev.map((c) =>
        c.receiverId === receiverId && c.status !== "SUBMITTED_TO_HUB"
          ? { ...c, status: "SUBMITTED_TO_HUB", hubTransactionId: txId }
          : c
      )
    );
    return txId;
  };

  const value = useMemo(
    () => ({
      facilityProfile,
      erxQueue,
      claims,
      activeErxId,
      setActiveErxId,
      toggleGenericSubstitution,
      updateLineDispenseQty,
      scanTatmeenBarcode,
      dispenseOrder,
      pullExternalErxFromHub,
      markClaimDownloaded,
      submitPharmacyBatchToHub,
    }),
    [facilityProfile, erxQueue, claims, activeErxId]
  );

  return <PharmacyContext.Provider value={value}>{children}</PharmacyContext.Provider>;
}

export function usePharmacy() {
  const ctx = useContext(PharmacyContext);
  if (!ctx) {
    throw new Error("usePharmacy must be used within a PharmacyProvider");
  }
  return ctx;
}
