import { create } from "xmlbuilder2";

export interface EligibilityRequestData {
  senderId: string; // Facility License ID
  receiverId: string; // Payer ID
  dispositionFlag?: "TEST" | "PRODUCTION";
  inquiryId: string;
  memberId: string;
  emiratesId?: string | null;
  passportNo?: string | null;
  patientName: string;
  dob: string; // DD/MM/YYYY
  gender: string;
}

export function buildRiayatiEligibilityRequestXml(data: EligibilityRequestData): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("PriorRequest.Inquiry")
      .ele("Header")
        .ele("SenderID").txt(data.senderId).up()
        .ele("ReceiverID").txt(data.receiverId).up()
        .ele("TransactionDate").txt(formattedDate).up()
        .ele("RecordCount").txt("1").up()
        .ele("DispositionFlag").txt(data.dispositionFlag || "TEST").up()
      .up()
      .ele("Inquiry")
        .ele("ID").txt(data.inquiryId).up()
        .ele("MemberID").txt(data.memberId).up()
        .ele("Patient")
          .ele("FullName").txt(data.patientName).up()
          .ele("DOB").txt(data.dob).up()
          .ele("Gender").txt(data.gender).up()
          .ele("EmiratesIDNumber").txt(data.emiratesId || "").up()
          .ele("PassportNumber").txt(data.passportNo || "").up()
        .up()
        .ele("EncounterType").txt("1").up() // 1 = Outpatient
      .up()
    .up();

  return doc.end({ prettyPrint: true });
}
