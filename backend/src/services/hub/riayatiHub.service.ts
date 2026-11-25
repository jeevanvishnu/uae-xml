import { randomUUID } from "node:crypto";
import { create } from "xmlbuilder2";

export interface HubVerificationResult {
  hubTxnId: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "REJECTED";
  payerName: string;
  memberId: string;
  network: string;
  copayPercent: number;
  copayCap: number;
  deductible: number;
  expiryDate: string;
  remarks: string;
  responseXml: string;
}

export class RiayatiHubService {
  /**
   * Dispatches an Eligibility Inquiry to the Riayati eClaims Post Office (or internal simulator).
   */
  static async verifyEligibility(params: {
    senderId: string;
    receiverId: string;
    inquiryId: string;
    memberId: string;
    emiratesId?: string | null;
    passportNo?: string | null;
    requestXml: string;
    storedExpiryDate?: Date | null;
  }): Promise<HubVerificationResult> {
    const hubTxnId = `RIAYATI-TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Simulation / Sandbox rules:
    const now = new Date();
    const isExpired = params.storedExpiryDate && new Date(params.storedExpiryDate).getTime() < now.getTime();

    let status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "REJECTED" = "ACTIVE";
    let remarks = "Eligibility confirmed. In-network comprehensive outpatient coverage active.";
    let copayPercent = 20;
    let copayCap = 50;
    let deductible = 0;
    let network = "Comprehensive Plus";
    let expiryStr = params.storedExpiryDate ? params.storedExpiryDate.toISOString().split("T")[0] : "2027-12-31";

    if (isExpired) {
      status = "EXPIRED";
      remarks = "Policy expired. Fallback to patient self-pay required.";
    } else if (params.memberId.toUpperCase().includes("REJECT") || params.memberId.toUpperCase().includes("INVALID")) {
      status = "REJECTED";
      remarks = "Member ID not found with payer. Please verify policy documents.";
    } else if (params.memberId.toUpperCase().includes("INACTIVE")) {
      status = "INACTIVE";
      remarks = "Policy suspended by employer/sponsor.";
    }

    // Build the compliant XML response
    const doc = create({ version: "1.0", encoding: "UTF-8" })
      .ele("PriorResponse.Inquiry")
        .ele("Header")
          .ele("SenderID").txt(params.receiverId).up()
          .ele("ReceiverID").txt(params.senderId).up()
          .ele("TransactionDate").txt(new Date().toISOString()).up()
          .ele("HubTransactionID").txt(hubTxnId).up()
        .up()
        .ele("Response")
          .ele("InquiryID").txt(params.inquiryId).up()
          .ele("Status").txt(status).up()
          .ele("MemberID").txt(params.memberId).up()
          .ele("Network").txt(network).up()
          .ele("CopayPercent").txt(String(copayPercent)).up()
          .ele("CopayCap").txt(String(copayCap)).up()
          .ele("Deductible").txt(String(deductible)).up()
          .ele("ExpiryDate").txt(expiryStr).up()
          .ele("Remarks").txt(remarks).up()
        .up()
      .up();

    const responseXml = doc.end({ prettyPrint: true });

    return {
      hubTxnId,
      status,
      payerName: "UAE National Payer Network",
      memberId: params.memberId,
      network,
      copayPercent,
      copayCap,
      deductible,
      expiryDate: expiryStr,
      remarks,
      responseXml,
    };
  }
}
