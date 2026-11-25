"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Vitals {
  bp: string;
  temperature: string;
  pulse: string;
  weight: string;
  height: string;
  spo2: string;
}

export interface DiagnosisItem {
  code: string;
  description: string;
  type: "Principal" | "Secondary";
}

export interface ProcedureItem {
  id: string;
  code: string;
  type: "CPT" | "HCPCS" | "DSL";
  description: string;
  quantity: number;
  unitPrice: number;
  gross: number;
  patientShare: number;
  net: number;
  clinicianLicense: string;
  requiresPriorAuth: boolean;
  priorAuthStatus: "NONE" | "REQUESTED" | "APPROVED";
  priorAuthRef?: string;
}

export interface ErxMedicationItem {
  id: string;
  drugCode: string;
  formulary: "DDC" | "MoHAP";
  tradeName: string;
  genericName: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  frequencyMultiplier: number;
  durationDays: number;
  totalQuantity: number;
  instructions: string;
  unitPrice: number;
}

export interface ErxTransmission {
  erxRefNo: string;
  transmittedAt: string;
  clinicianLicense: string;
  clinicianName: string;
  patientName: string;
  emiratesId: string;
  insurancePlan: string;
  medications: ErxMedicationItem[];
  xmlPayload: string;
}

export interface DoctorEncounter {
  id: string;
  tokenNumber: string;
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED";
  priority: "NORMAL" | "PRIORITY" | "URGENT";
  checkInTime: string;
  startTime?: string;
  completedTime?: string;
  patient: {
    id: string;
    fullName: string;
    dob: string;
    age: number;
    gender: "Male" | "Female";
    emiratesId: string;
    phone: string;
    allergies: string[];
  };
  insurance: {
    payerId: string;
    payerName: string;
    planName: string;
    memberId: string;
    eligibilityStatus: "ACTIVE" | "EXPIRED" | "CASH";
    copayPercent: number;
    copayCap: number;
  };
  clinician: {
    id: string;
    name: string;
    specialty: string;
    licenseNo: string;
    roomNumber: string;
  };
  vitals: Vitals;
  chiefComplaint: string;
  clinicalFindings: string;
  diagnoses: DiagnosisItem[];
  procedures: ProcedureItem[];
  medications: ErxMedicationItem[];
  erxTransmission?: ErxTransmission;
  claimXml?: string;
}

export interface Icd10Code {
  code: string;
  description: string;
  category: string;
}

export interface CptCode {
  code: string;
  type: "CPT" | "HCPCS" | "DSL";
  description: string;
  category: string;
  unitPrice: number;
  requiresPriorAuth: boolean;
}

export interface DrugCatalogItem {
  drugCode: string;
  formulary: "DDC" | "MoHAP";
  tradeName: string;
  genericName: string;
  defaultDose: string;
  defaultUnit: string;
  defaultRoute: string;
  unitPrice: number;
}

export const ICD10_CATALOG: Icd10Code[] = [
  { code: "J03.90", description: "Acute tonsillitis, unspecified", category: "Respiratory" },
  { code: "J03.00", description: "Acute streptococcal tonsillitis, unspecified", category: "Respiratory" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory" },
  { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Respiratory" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated", category: "Respiratory" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine" },
  { code: "E11.65", description: "Type 2 diabetes mellitus with hyperglycemia", category: "Endocrine" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified", category: "Endocrine" },
  { code: "I10", description: "Essential (primary) hypertension", category: "Cardiovascular" },
  { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery", category: "Cardiovascular" },
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", category: "Gastrointestinal" },
  { code: "K29.70", description: "Gastritis, unspecified, without bleeding", category: "Gastrointestinal" },
  { code: "M54.50", description: "Low back pain, unspecified", category: "Musculoskeletal" },
  { code: "M25.561", description: "Pain in right knee", category: "Musculoskeletal" },
  { code: "N39.0", description: "Urinary tract infection, site not specified", category: "Genitourinary" },
  { code: "H66.90", description: "Otitis media, unspecified, unspecified ear", category: "ENT" },
  { code: "J30.9", description: "Allergic rhinitis, unspecified", category: "ENT" },
  { code: "L20.9", description: "Atopic dermatitis, unspecified", category: "Dermatology" },
  { code: "R51.9", description: "Headache, unspecified", category: "Neurology" },
  { code: "G43.909", description: "Migraine, unspecified, not intractable", category: "Neurology" },
  { code: "R50.9", description: "Fever, unspecified", category: "Symptoms" },
  { code: "R05.9", description: "Cough, unspecified", category: "Symptoms" },
  { code: "Z00.00", description: "Encounter for general adult medical examination without abnormal findings", category: "Preventive" },
];

export const CPT_CATALOG: CptCode[] = [
  { code: "99213", type: "CPT", description: "Office/outpatient visit, established patient (Low–Moderate)", category: "Consultation", unitPrice: 220, requiresPriorAuth: false },
  { code: "99214", type: "CPT", description: "Office/outpatient visit, established patient (Moderate–High)", category: "Consultation", unitPrice: 340, requiresPriorAuth: false },
  { code: "99203", type: "CPT", description: "Office/outpatient visit, new patient (Low complexity)", category: "Consultation", unitPrice: 280, requiresPriorAuth: false },
  { code: "85025", type: "CPT", description: "Complete Blood Count (CBC) with automated differential", category: "Laboratory", unitPrice: 85, requiresPriorAuth: false },
  { code: "80053", type: "CPT", description: "Comprehensive Metabolic Panel (CMP)", category: "Laboratory", unitPrice: 145, requiresPriorAuth: false },
  { code: "83036", type: "CPT", description: "Hemoglobin A1c (HbA1c) level", category: "Laboratory", unitPrice: 95, requiresPriorAuth: false },
  { code: "80061", type: "CPT", description: "Lipid Panel (Cholesterol, HDL, Triglycerides)", category: "Laboratory", unitPrice: 110, requiresPriorAuth: false },
  { code: "87880", type: "CPT", description: "Rapid Strep A antigen detection immunoassay", category: "Laboratory", unitPrice: 75, requiresPriorAuth: false },
  { code: "81001", type: "CPT", description: "Urinalysis, automated, with microscopy", category: "Laboratory", unitPrice: 55, requiresPriorAuth: false },
  { code: "71046", type: "CPT", description: "Radiologic examination, chest; 2 views", category: "Radiology", unitPrice: 190, requiresPriorAuth: false },
  { code: "70551", type: "CPT", description: "MRI Brain without contrast material", category: "Radiology", unitPrice: 1850, requiresPriorAuth: true },
  { code: "72148", type: "CPT", description: "MRI Lumbar Spine without contrast material", category: "Radiology", unitPrice: 1750, requiresPriorAuth: true },
  { code: "73721", type: "CPT", description: "MRI Knee without contrast material", category: "Radiology", unitPrice: 1650, requiresPriorAuth: true },
  { code: "97110", type: "CPT", description: "Therapeutic exercises, physical therapy (15 min)", category: "Physiotherapy", unitPrice: 240, requiresPriorAuth: true },
  { code: "D2750", type: "DSL", description: "Crown — porcelain fused to high noble metal (Specialized Dental)", category: "Dental", unitPrice: 2200, requiresPriorAuth: true },
  { code: "93000", type: "CPT", description: "Electrocardiogram (ECG), routine, 12 leads with interpretation", category: "Cardiology", unitPrice: 160, requiresPriorAuth: false },
  { code: "94010", type: "CPT", description: "Spirometry, including graphic record", category: "Pulmonology", unitPrice: 210, requiresPriorAuth: false },
  { code: "96372", type: "CPT", description: "Therapeutic, prophylactic, or diagnostic injection (IM/SC)", category: "Procedure", unitPrice: 90, requiresPriorAuth: false },
];

export const UAE_DRUG_CATALOG: DrugCatalogItem[] = [
  { drugCode: "DDC-00412", formulary: "DDC", tradeName: "Augmentin 1g Tablet", genericName: "Amoxicillin 875mg + Clavulanic Acid 125mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 48 },
  { drugCode: "DDC-00108", formulary: "DDC", tradeName: "Panadol Extra 500mg", genericName: "Paracetamol 500mg + Caffeine 65mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 16 },
  { drugCode: "MoHAP-11204", formulary: "MoHAP", tradeName: "Amoxil 500mg Capsule", genericName: "Amoxicillin 500mg", defaultDose: "1", defaultUnit: "Capsule", defaultRoute: "Oral", unitPrice: 24 },
  { drugCode: "DDC-00719", formulary: "DDC", tradeName: "Zithromax 500mg Tablet", genericName: "Azithromycin 500mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 62 },
  { drugCode: "DDC-03910", formulary: "DDC", tradeName: "Nexium 40mg Tablet", genericName: "Esomeprazole 40mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 78 },
  { drugCode: "DDC-02215", formulary: "DDC", tradeName: "Lipitor 20mg Tablet", genericName: "Atorvastatin 20mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 85 },
  { drugCode: "DDC-05102", formulary: "DDC", tradeName: "Ventolin Evohaler 100mcg", genericName: "Salbutamol 100mcg Inhaler", defaultDose: "2", defaultUnit: "Puff", defaultRoute: "Inhalation", unitPrice: 34 },
  { drugCode: "MoHAP-04812", formulary: "MoHAP", tradeName: "Glucophage 500mg Tablet", genericName: "Metformin HCl 500mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 22 },
  { drugCode: "DDC-01890", formulary: "DDC", tradeName: "Concor 5mg Tablet", genericName: "Bisoprolol Fumarate 5mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 42 },
  { drugCode: "MoHAP-08931", formulary: "MoHAP", tradeName: "Zyrtec 10mg Tablet", genericName: "Cetirizine HCl 10mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 26 },
  { drugCode: "DDC-06442", formulary: "DDC", tradeName: "Voltaren Emulgel 1%", genericName: "Diclofenac Diethylamine 1%", defaultDose: "1", defaultUnit: "Application", defaultRoute: "Topical", unitPrice: 38 },
  { drugCode: "MoHAP-03310", formulary: "MoHAP", tradeName: "Ciproxin 500mg Tablet", genericName: "Ciprofloxacin 500mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 54 },
  { drugCode: "DDC-07118", formulary: "DDC", tradeName: "Telfast 180mg Tablet", genericName: "Fexofenadine HCl 180mg", defaultDose: "1", defaultUnit: "Tablet", defaultRoute: "Oral", unitPrice: 44 },
  { drugCode: "DDC-04520", formulary: "DDC", tradeName: "Augmentin 457mg/5ml Susp", genericName: "Amoxicillin + Clavulanic Acid Suspension", defaultDose: "5", defaultUnit: "ml", defaultRoute: "Oral", unitPrice: 46 },
];

export const FREQUENCY_OPTIONS = [
  { code: "OD", label: "OD – Once daily", multiplier: 1 },
  { code: "BID", label: "BID – Twice daily", multiplier: 2 },
  { code: "TID", label: "TID – Three times daily", multiplier: 3 },
  { code: "QID", label: "QID – Four times daily", multiplier: 4 },
  { code: "PRN", label: "PRN – As needed", multiplier: 1 },
];

function formatUaeDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function generateClaimSubmissionXml(encounter: DoctorEncounter): string {
  const now = new Date();
  const gross = encounter.procedures.reduce((sum, p) => sum + p.gross, 0);
  const ptShare = encounter.procedures.reduce((sum, p) => sum + p.patientShare, 0);
  const net = encounter.procedures.reduce((sum, p) => sum + p.net, 0);

  const diagXml = encounter.diagnoses
    .map(
      (d) => `    <Diagnosis>
      <Type>${d.type}</Type>
      <Code>${d.code}</Code>
      <Description>${d.description}</Description>
    </Diagnosis>`
    )
    .join("\n");

  const actXml = encounter.procedures
    .map(
      (p, idx) => `    <Activity>
      <ID>ACT-${String(idx + 1).padStart(3, "0")}</ID>
      <Start>${formatUaeDate(now)}</Start>
      <Type>${p.type === "CPT" ? "3" : p.type === "HCPCS" ? "4" : "6"}</Type>
      <Code>${p.code}</Code>
      <Quantity>${p.quantity}</Quantity>
      <Net>${p.net.toFixed(2)}</Net>
      <Clinician>${p.clinicianLicense}</Clinician>${
        p.priorAuthRef ? `\n      <PriorAuthorizationID>${p.priorAuthRef}</PriorAuthorizationID>` : ""
      }
    </Activity>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Claim.Submission>
  <Header>
    <SenderID>MOSCTD-DXB</SenderID>
    <ReceiverID>${encounter.insurance.payerId}</ReceiverID>
    <TransactionDate>${formatUaeDate(now)}</TransactionDate>
    <RecordCount>1</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
  <Claim>
    <ID>CLM-${encounter.tokenNumber}-${now.getFullYear()}</ID>
    <MemberID>${encounter.insurance.memberId}</MemberID>
    <PayerID>${encounter.insurance.payerId}</PayerID>
    <ProviderID>DHA-F-0019284</ProviderID>
    <EmiratesIDNumber>${encounter.patient.emiratesId}</EmiratesIDNumber>
    <Gross>${gross.toFixed(2)}</Gross>
    <PatientShare>${ptShare.toFixed(2)}</PatientShare>
    <Net>${net.toFixed(2)}</Net>
    <Encounter>
      <FacilityID>DHA-F-0019284</FacilityID>
      <Type>1</Type>
      <PatientID>${encounter.patient.id}</PatientID>
      <Start>${formatUaeDate(new Date(encounter.startTime || encounter.checkInTime))}</Start>
      <End>${formatUaeDate(now)}</End>
      <StartType>1</StartType>
      <EndType>1</EndType>
    </Encounter>
    <ClinicalNotes>
      <ChiefComplaint>${encounter.chiefComplaint}</ChiefComplaint>
      <ClinicalFindings>${encounter.clinicalFindings}</ClinicalFindings>
      <Vitals BP="${encounter.vitals.bp}" TempC="${encounter.vitals.temperature}" Pulse="${encounter.vitals.pulse}" WeightKg="${encounter.vitals.weight}" HeightCm="${encounter.vitals.height}" SpO2="${encounter.vitals.spo2}" />
    </ClinicalNotes>
${diagXml}
${actXml}
  </Claim>
</Claim.Submission>`;
}

export function generatePriorRequestXml(
  encounter: DoctorEncounter,
  procedure: ProcedureItem
): string {
  const now = new Date();
  const principal = encounter.diagnoses.find((d) => d.type === "Principal");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Prior.Request>
  <Header>
    <SenderID>MOSCTD-DXB</SenderID>
    <ReceiverID>${encounter.insurance.payerId}</ReceiverID>
    <TransactionDate>${formatUaeDate(now)}</TransactionDate>
    <RecordCount>1</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
  <Authorization>
    <Type>Authorization</Type>
    <ID>PA-${encounter.tokenNumber}-${procedure.code}</ID>
    <MemberID>${encounter.insurance.memberId}</MemberID>
    <PayerID>${encounter.insurance.payerId}</PayerID>
    <EmiratesIDNumber>${encounter.patient.emiratesId}</EmiratesIDNumber>
    <Clinician>${procedure.clinicianLicense}</Clinician>
    <Diagnosis>
      <Type>Principal</Type>
      <Code>${principal?.code || "PENDING"}</Code>
    </Diagnosis>
    <Justification>${encounter.chiefComplaint || "Clinical necessity documented in encounter"} — ${encounter.clinicalFindings || ""}</Justification>
    <Activity>
      <ID>${procedure.id}</ID>
      <Type>3</Type>
      <Code>${procedure.code}</Code>
      <Quantity>${procedure.quantity}</Quantity>
      <Net>${procedure.net.toFixed(2)}</Net>
      <Clinician>${procedure.clinicianLicense}</Clinician>
    </Activity>
  </Authorization>
</Prior.Request>`;
}

export function generateEPrescriptionXml(
  encounter: DoctorEncounter,
  medications: ErxMedicationItem[],
  erxRefNo: string
): string {
  const now = new Date();
  const medXml = medications
    .map(
      (m, idx) => `      <Activity>
        <ID>DRUG-${String(idx + 1).padStart(3, "0")}</ID>
        <Type>5</Type>
        <Formulary>${m.formulary}</Formulary>
        <Code>${m.drugCode}</Code>
        <TradeName>${m.tradeName}</TradeName>
        <Dosage>${m.dose} ${m.unit}</Dosage>
        <Route>${m.route}</Route>
        <Frequency>${m.frequency}</Frequency>
        <Duration>${m.durationDays}</Duration>
        <Quantity>${m.totalQuantity}</Quantity>
        <Instructions>${m.instructions || "As directed"}</Instructions>
      </Activity>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ePrescription>
  <Header>
    <SenderID>MOSCTD-DXB</SenderID>
    <ReceiverID>RIAYATI-ERX-HUB</ReceiverID>
    <TransactionDate>${formatUaeDate(now)}</TransactionDate>
    <RecordCount>${medications.length}</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
  <Prescription>
    <ID>${erxRefNo}</ID>
    <Type>eRx</Type>
    <Patient>
      <MemberID>${encounter.insurance.memberId}</MemberID>
      <EmiratesID>${encounter.patient.emiratesId}</EmiratesID>
      <FullName>${encounter.patient.fullName}</FullName>
    </Patient>
    <Clinician>${encounter.clinician.licenseNo}</Clinician>
    <Activities>
${medXml}
    </Activities>
  </Prescription>
</ePrescription>`;
}

const INITIAL_ENCOUNTERS: DoctorEncounter[] = [
  {
    id: "enc-101",
    tokenNumber: "T-042",
    status: "IN_CONSULTATION",
    priority: "NORMAL",
    checkInTime: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    startTime: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    patient: {
      id: "PAT-8821",
      fullName: "Rashid Al-Maktoum",
      dob: "1989-04-12",
      age: 37,
      gender: "Male",
      emiratesId: "784-1989-4419283-1",
      phone: "+971 50 482 1920",
      allergies: ["Penicillin", "Sulfa Drugs"],
    },
    insurance: {
      payerId: "DAMAN-001",
      payerName: "Daman",
      planName: "Daman Gold – Active",
      memberId: "DMN-9940281-01",
      eligibilityStatus: "ACTIVE",
      copayPercent: 20,
      copayCap: 50,
    },
    clinician: {
      id: "doc-1",
      name: "Dr. Sarah Al-Hashimi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-0048291",
      roomNumber: "Room 204",
    },
    vitals: {
      bp: "122/78",
      temperature: "38.2",
      pulse: "88",
      weight: "79",
      height: "176",
      spo2: "98",
    },
    chiefComplaint: "Sore throat, painful swallowing, and low-grade fever for 2 days.",
    clinicalFindings: "Erythematous enlarged tonsils with mild exudate bilaterally; tender anterior cervical lymphadenopathy. Chest clear to auscultation.",
    diagnoses: [
      { code: "J03.90", description: "Acute tonsillitis, unspecified", type: "Principal" },
    ],
    procedures: [
      {
        id: "ACT-1",
        code: "99213",
        type: "CPT",
        description: "Office/outpatient visit, established patient (Low–Moderate)",
        quantity: 1,
        unitPrice: 220,
        gross: 220,
        patientShare: 44,
        net: 176,
        clinicianLicense: "DHA-P-0048291",
        requiresPriorAuth: false,
        priorAuthStatus: "NONE",
      },
      {
        id: "ACT-2",
        code: "87880",
        type: "CPT",
        description: "Rapid Strep A antigen detection immunoassay",
        quantity: 1,
        unitPrice: 75,
        gross: 75,
        patientShare: 15,
        net: 60,
        clinicianLicense: "DHA-P-0048291",
        requiresPriorAuth: false,
        priorAuthStatus: "NONE",
      },
    ],
    medications: [],
  },
  {
    id: "enc-102",
    tokenNumber: "T-043",
    status: "WAITING",
    priority: "PRIORITY",
    checkInTime: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    patient: {
      id: "PAT-8829",
      fullName: "Mariam Al-Suwaidi",
      dob: "1982-11-03",
      age: 44,
      gender: "Female",
      emiratesId: "784-1982-7721045-4",
      phone: "+971 55 910 3381",
      allergies: [],
    },
    insurance: {
      payerId: "AXA-GULF",
      payerName: "AXA Gulf",
      planName: "AXA Star Plus – Active",
      memberId: "AXA-5510294-02",
      eligibilityStatus: "ACTIVE",
      copayPercent: 10,
      copayCap: 50,
    },
    clinician: {
      id: "doc-1",
      name: "Dr. Sarah Al-Hashimi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-0048291",
      roomNumber: "Room 204",
    },
    vitals: {
      bp: "134/84",
      temperature: "36.8",
      pulse: "76",
      weight: "68",
      height: "163",
      spo2: "99",
    },
    chiefComplaint: "",
    clinicalFindings: "",
    diagnoses: [],
    procedures: [],
    medications: [],
  },
  {
    id: "enc-103",
    tokenNumber: "T-044",
    status: "WAITING",
    priority: "URGENT",
    checkInTime: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    patient: {
      id: "PAT-8834",
      fullName: "Omar Al-Qasimi",
      dob: "1974-06-19",
      age: 52,
      gender: "Male",
      emiratesId: "784-1974-3301928-7",
      phone: "+971 52 773 8120",
      allergies: ["NSAIDs"],
    },
    insurance: {
      payerId: "BUPA-UAE",
      payerName: "Bupa Global",
      planName: "Bupa Select – Active",
      memberId: "BUP-2291044-00",
      eligibilityStatus: "ACTIVE",
      copayPercent: 0,
      copayCap: 0,
    },
    clinician: {
      id: "doc-1",
      name: "Dr. Sarah Al-Hashimi",
      specialty: "Internal Medicine",
      licenseNo: "DHA-P-0048291",
      roomNumber: "Room 204",
    },
    vitals: {
      bp: "148/92",
      temperature: "37.0",
      pulse: "92",
      weight: "86",
      height: "178",
      spo2: "96",
    },
    chiefComplaint: "",
    clinicalFindings: "",
    diagnoses: [],
    procedures: [],
    medications: [],
  },
];

interface DoctorContextType {
  encounters: DoctorEncounter[];
  erxHistory: ErxTransmission[];
  clinicianProfile: {
    name: string;
    specialty: string;
    licenseNo: string;
    roomNumber: string;
  };
  getEncounter: (id: string) => DoctorEncounter | undefined;
  startConsultation: (id: string) => void;
  updateEncounterData: (id: string, patch: Partial<DoctorEncounter>) => void;
  transmitErx: (id: string) => ErxTransmission | null;
  triggerPriorAuth: (encounterId: string, procedureId: string) => { refNo: string; xml: string } | null;
  completeVisit: (id: string) => string | null;
}

const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

const STORAGE_KEY = "uae_ectd_doctor_encounters_v1";
const ERX_STORAGE_KEY = "uae_ectd_doctor_erx_v1";

export function DoctorProvider({ children }: { children: ReactNode }) {
  const [encounters, setEncounters] = useState<DoctorEncounter[]>(INITIAL_ENCOUNTERS);
  const [erxHistory, setErxHistory] = useState<ErxTransmission[]>([]);

  const clinicianProfile = {
    name: "Dr. Sarah Al-Hashimi",
    specialty: "Internal Medicine",
    licenseNo: "DHA-P-0048291",
    roomNumber: "Room 204",
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setEncounters(parsed);
      }
      const savedErx = localStorage.getItem(ERX_STORAGE_KEY);
      if (savedErx) {
        const parsedErx = JSON.parse(savedErx);
        if (Array.isArray(parsedErx)) setErxHistory(parsedErx);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistEncounters = (next: DoctorEncounter[]) => {
    setEncounters(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const getEncounter = (id: string) => encounters.find((e) => e.id === id);

  const startConsultation = (id: string) => {
    persistEncounters(
      encounters.map((enc) =>
        enc.id === id && enc.status === "WAITING"
          ? { ...enc, status: "IN_CONSULTATION", startTime: new Date().toISOString() }
          : enc
      )
    );
  };

  const updateEncounterData = (id: string, patch: Partial<DoctorEncounter>) => {
    persistEncounters(
      encounters.map((enc) => (enc.id === id ? { ...enc, ...patch } : enc))
    );
  };

  const transmitErx = (id: string): ErxTransmission | null => {
    const enc = encounters.find((e) => e.id === id);
    if (!enc || enc.medications.length === 0) return null;

    const erxRefNo = `ERX-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const xmlPayload = generateEPrescriptionXml(enc, enc.medications, erxRefNo);
    const transmission: ErxTransmission = {
      erxRefNo,
      transmittedAt: new Date().toISOString(),
      clinicianLicense: enc.clinician.licenseNo,
      clinicianName: enc.clinician.name,
      patientName: enc.patient.fullName,
      emiratesId: enc.patient.emiratesId,
      insurancePlan: enc.insurance.planName,
      medications: [...enc.medications],
      xmlPayload,
    };

    persistEncounters(
      encounters.map((e) => (e.id === id ? { ...e, erxTransmission: transmission } : e))
    );
    const nextHistory = [transmission, ...erxHistory];
    setErxHistory(nextHistory);
    try {
      localStorage.setItem(ERX_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore
    }
    return transmission;
  };

  const triggerPriorAuth = (encounterId: string, procedureId: string) => {
    const enc = encounters.find((e) => e.id === encounterId);
    if (!enc) return null;
    const proc = enc.procedures.find((p) => p.id === procedureId);
    if (!proc) return null;

    const refNo = `PA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const xml = generatePriorRequestXml(enc, proc);

    const updatedProcs = enc.procedures.map((p) =>
      p.id === procedureId
        ? { ...p, priorAuthStatus: "REQUESTED" as const, priorAuthRef: refNo }
        : p
    );
    updateEncounterData(encounterId, { procedures: updatedProcs });
    return { refNo, xml };
  };

  const completeVisit = (id: string): string | null => {
    const enc = encounters.find((e) => e.id === id);
    if (!enc) return null;
    const claimXml = generateClaimSubmissionXml(enc);
    persistEncounters(
      encounters.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "COMPLETED",
              completedTime: new Date().toISOString(),
              claimXml,
            }
          : e
      )
    );
    return claimXml;
  };

  return (
    <DoctorContext.Provider
      value={{
        encounters,
        erxHistory,
        clinicianProfile,
        getEncounter,
        startConsultation,
        updateEncounterData,
        transmitErx,
        triggerPriorAuth,
        completeVisit,
      }}
    >
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctor() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error("useDoctor must be used inside DoctorProvider");
  return ctx;
}
