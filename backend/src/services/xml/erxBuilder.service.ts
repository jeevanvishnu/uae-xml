import { create } from "xmlbuilder2";

export interface ErxPatientInfo {
  memberId?: string;
  emiratesId?: string;
  fullName: string;
}

export interface ErxMedication {
  drugCode: string;
  tradeName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  unitPrice?: number;
  instructions?: string;
}

export interface ErxPayload {
  erxRefNo: string;
  senderId: string;
  receiverId: string;
  dispositionFlag: "TEST" | "PRODUCTION";
  clinicianLicense: string;
  patient: ErxPatientInfo;
  medications: ErxMedication[];
}

/**
 * Builds standard UAE MoHAP Riayati / DHA ePrescription XML Document
 */
export function buildErxXml(payload: ErxPayload): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("ePrescription")
    .ele("Header")
      .ele("SenderID").txt(payload.senderId).up()
      .ele("ReceiverID").txt(payload.receiverId).up()
      .ele("TransactionDate").txt(formattedDate).up()
      .ele("RecordCount").txt(String(payload.medications.length)).up()
      .ele("DispositionFlag").txt(payload.dispositionFlag).up()
    .up()
    .ele("Prescription")
      .ele("ID").txt(payload.erxRefNo).up()
      .ele("Type").txt("eRx").up()
      .ele("Patient")
        .ele("MemberID").txt(payload.patient.memberId || "SELF-PAY").up()
        .ele("EmiratesID").txt(payload.patient.emiratesId || "N/A").up()
        .ele("FullName").txt(payload.patient.fullName).up()
      .up()
      .ele("Clinician").txt(payload.clinicianLicense).up()
      .ele("Activities");

  payload.medications.forEach((med, idx) => {
    const actId = `DRUG-${String(idx + 1).padStart(3, "0")}`;
    doc.ele("Activity")
      .ele("ID").txt(actId).up()
      .ele("Type").txt("5").up() // Type 5 = Medication in Riayati standards
      .ele("Code").txt(med.drugCode).up()
      .ele("TradeName").txt(med.tradeName).up()
      .ele("Dosage").txt(med.dosage).up()
      .ele("Frequency").txt(med.frequency).up()
      .ele("Duration").txt(String(med.duration)).up()
      .ele("Quantity").txt(String(med.quantity)).up()
      .ele("UnitPrice").txt(String(med.unitPrice || 0)).up()
      .ele("Instructions").txt(med.instructions || "As directed").up()
    .up();
  });

  return doc.end({ prettyPrint: true });
}
