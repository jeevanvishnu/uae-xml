export interface ParsedRemittanceActivity {
  activityId: string;
  gross: number;
  patientShare: number;
  net: number;
  paymentAmount: number;
  denialCode?: string;
  payerRemark?: string;
}

export interface ParsedRemittanceClaim {
  claimId: string; // Claim Number (e.g. CLM-2026-...)
  idPayer?: string;
  settlementDate?: string;
  activities: ParsedRemittanceActivity[];
}

export interface ParsedRemittanceDocument {
  senderId: string; // Payer ReceiverID
  receiverId: string; // Facility SenderID
  transactionDate: string;
  claims: ParsedRemittanceClaim[];
}

/**
 * Regex-based reliable UAE Remittance Advice XML Parser
 * Handles Riayati and DHA eClaimLink <RemittanceAdvice> / <Remittance.Submission> schemas
 */
export function parseRemittanceXml(xmlString: string): ParsedRemittanceDocument {
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? match[1].trim() : "";
  };

  const getAllTags = (xml: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const matches: string[] = [];
    let m;
    while ((m = regex.exec(xml)) !== null) {
      matches.push(m[1]);
    }
    return matches;
  };

  const senderId = getTag(xmlString, "SenderID") || "PAYER-UNKNOWN";
  const receiverId = getTag(xmlString, "ReceiverID") || "FAC-UNKNOWN";
  const transactionDate = getTag(xmlString, "TransactionDate") || new Date().toISOString();

  const claimBlocks = getAllTags(xmlString, "Claim");
  const claims: ParsedRemittanceClaim[] = [];

  for (const cBlock of claimBlocks) {
    const claimId = getTag(cBlock, "ID");
    const idPayer = getTag(cBlock, "IDPayer") || undefined;
    const settlementDate = getTag(cBlock, "SettlementDate") || undefined;

    const activityBlocks = getAllTags(cBlock, "Activity");
    const activities: ParsedRemittanceActivity[] = [];

    for (const aBlock of activityBlocks) {
      const activityId = getTag(aBlock, "ID") || "ACT-001";
      const gross = parseFloat(getTag(aBlock, "Gross")) || 0;
      const patientShare = parseFloat(getTag(aBlock, "PatientShare")) || 0;
      const net = parseFloat(getTag(aBlock, "Net")) || 0;
      const paymentAmount = parseFloat(getTag(aBlock, "PaymentAmount")) || 0;
      const denialCode = getTag(aBlock, "DenialCode") || undefined;
      const payerRemark = getTag(aBlock, "PayerRemark") || getTag(aBlock, "Remark") || undefined;

      activities.push({
        activityId,
        gross: Math.round(gross),
        patientShare: Math.round(patientShare),
        net: Math.round(net),
        paymentAmount: Math.round(paymentAmount),
        denialCode,
        payerRemark,
      });
    }

    if (claimId) {
      claims.push({
        claimId,
        idPayer,
        settlementDate,
        activities,
      });
    }
  }

  return {
    senderId,
    receiverId,
    transactionDate,
    claims,
  };
}
