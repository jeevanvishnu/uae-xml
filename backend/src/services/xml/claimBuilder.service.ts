import { create } from "xmlbuilder2";

export interface ClaimXmlPayload {
  claimNumber: string;
  senderId: string;
  receiverId: string;
  dispositionFlag: "TEST" | "PRODUCTION";
  submissionDate: Date;
  memberId: string;
  payerId: string;
  providerId: string;
  emiratesId?: string;
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  encounter: {
    type: string;
    startTime: Date;
    endTime?: Date;
  };
  diagnoses: Array<{
    code: string;
    type: string;
    description?: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    code: string;
    description?: string;
    quantity: number;
    gross: number;
    patientShare: number;
    net: number;
    clinicianLicense?: string;
  }>;
  clinicianLicense: string;
  resubmissionType?: string;
}

/**
 * Builds standard UAE MoHAP Riayati / DHA eClaimLink <Claim.Submission> XML Document
 */
export function buildClaimSubmissionXml(payload: ClaimXmlPayload): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;

  const submissionDateFormatted = formatDate(payload.submissionDate);
  const encounterStartFormatted = formatDate(payload.encounter.startTime);
  const encounterEndFormatted = payload.encounter.endTime
    ? formatDate(payload.encounter.endTime)
    : encounterStartFormatted;

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("Claim.Submission")
    .ele("Header")
      .ele("SenderID").txt(payload.senderId).up()
      .ele("ReceiverID").txt(payload.receiverId).up()
      .ele("TransactionDate").txt(submissionDateFormatted).up()
      .ele("RecordCount").txt("1").up()
      .ele("DispositionFlag").txt(payload.dispositionFlag).up()
    .up()
    .ele("Claim")
      .ele("ID").txt(payload.claimNumber).up()
      .ele("IDPayer").txt("").up()
      .ele("MemberID").txt(payload.memberId).up()
      .ele("PayerID").txt(payload.payerId).up()
      .ele("ProviderID").txt(payload.providerId).up()
      .ele("EmiratesID").txt(payload.emiratesId || "N/A").up()
      .ele("Gross").txt(String(payload.grossAmount)).up()
      .ele("PatientShare").txt(String(payload.patientShare)).up()
      .ele("Net").txt(String(payload.netAmount)).up();

  if (payload.resubmissionType) {
    doc.ele("Resubmission")
      .ele("Type").txt(payload.resubmissionType).up()
    .up();
  }

  // Encounter element
  // Encounter type in Riayati: 1 = Outpatient, 2 = Inpatient, 3 = Emergency
  const encounterTypeCode =
    payload.encounter.type === "INPATIENT"
      ? "2"
      : payload.encounter.type === "EMERGENCY"
      ? "3"
      : "1";

  doc.ele("Encounter")
    .ele("FacilityID").txt(payload.providerId).up()
    .ele("Type").txt(encounterTypeCode).up()
    .ele("Start").txt(encounterStartFormatted).up()
    .ele("End").txt(encounterEndFormatted).up()
  .up();

  // Diagnoses elements
  payload.diagnoses.forEach((diag) => {
    doc.ele("Diagnosis")
      .ele("Type").txt(diag.type).up()
      .ele("Code").txt(diag.code).up()
    .up();
  });

  // Activities elements
  payload.activities.forEach((act) => {
    doc.ele("Activity")
      .ele("ID").txt(act.id).up()
      .ele("Start").txt(encounterStartFormatted).up()
      .ele("Type").txt(act.type || "3").up() // 3 = CPT, 5 = Drug
      .ele("Code").txt(act.code).up()
      .ele("Quantity").txt(String(act.quantity || 1)).up()
      .ele("Gross").txt(String(act.gross)).up()
      .ele("PatientShare").txt(String(act.patientShare)).up()
      .ele("Net").txt(String(act.net)).up()
      .ele("Clinician").txt(act.clinicianLicense || payload.clinicianLicense).up()
    .up();
  });

  return doc.end({ prettyPrint: true });
}
