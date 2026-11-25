export interface ClaimValidationInput {
  patient: {
    fullName: string;
    emiratesId?: string | null;
    passportNo?: string | null;
  };
  policy?: {
    payerId: string;
    memberId: string;
    eligibilityStatus: string;
  } | null;
  facility: {
    licenseId: string;
  };
  diagnoses: Array<{
    code: string;
    type: string;
  }>;
  activities: Array<{
    id: string;
    code: string;
    quantity: number;
    unitPrice: number;
    gross: number;
    patientShare: number;
    net: number;
  }>;
  grossAmount: number;
  patientShare: number;
  netAmount: number;
}

export interface ClaimValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Pre-Submission Regulatory & Business Rule Validator
 * Validates claims against UAE MoHAP Riayati / DHA eClaimLink requirements
 */
export function validateClaimForSubmission(input: ClaimValidationInput): ClaimValidationResult {
  const errors: string[] = [];

  // 1. Facility SenderID
  if (!input.facility.licenseId) {
    errors.push("Facility SenderID (license ID) is missing.");
  }

  // 2. Patient Identity: Emirates ID or Passport
  if (!input.patient.emiratesId && !input.patient.passportNo) {
    errors.push("Patient must possess either a valid Emirates ID or Passport Number.");
  }
  if (input.patient.emiratesId) {
    const cleanEid = input.patient.emiratesId.replace(/-/g, "");
    if (!/^\d{15}$/.test(cleanEid)) {
      errors.push(`Invalid Emirates ID format: ${input.patient.emiratesId}. Must contain 15 digits.`);
    }
  }

  // 3. Insurance Coverage: Payer ID & Member ID
  if (!input.policy) {
    errors.push("Encounter is marked as Self-Pay and has no insurance policy attached.");
  } else {
    if (!input.policy.payerId) {
      errors.push("Policy is missing Payer ID (ReceiverID).");
    }
    if (!input.policy.memberId) {
      errors.push("Policy is missing Member ID.");
    }
    if (input.policy.eligibilityStatus !== "ACTIVE") {
      errors.push(`Insurance policy eligibility is not ACTIVE (Status: ${input.policy.eligibilityStatus}).`);
    }
  }

  // 4. Principal Diagnosis (Mandatory by Riayati)
  if (!input.diagnoses || input.diagnoses.length === 0) {
    errors.push("At least one ICD-10 diagnosis is mandatory.");
  } else {
    const hasPrincipal = input.diagnoses.some((d) => d.type === "Principal");
    if (!hasPrincipal) {
      errors.push("Regulatory Violation: Exactly one Principal ICD-10 diagnosis is required.");
    }
  }

  // 5. Billable Activities (CPT / Medication)
  if (!input.activities || input.activities.length === 0) {
    errors.push("At least one billable activity (CPT or Drug) must be included.");
  } else {
    // 6. Financial Invariant: Line items Gross = PatientShare + Net
    input.activities.forEach((act, idx) => {
      const lineGross = Number(act.gross) || 0;
      const linePtShare = Number(act.patientShare) || 0;
      const lineNet = Number(act.net) || 0;

      if (lineGross !== linePtShare + lineNet) {
        errors.push(
          `Activity line ${act.id || idx + 1} financial mismatch: Gross (${lineGross}) != PatientShare (${linePtShare}) + Net (${lineNet})`
        );
      }
    });

    // 7. Overall Claim Financial Invariant
    const calculatedGross = input.activities.reduce((s, a) => s + (Number(a.gross) || 0), 0);
    const calculatedPtShare = input.activities.reduce((s, a) => s + (Number(a.patientShare) || 0), 0);
    const calculatedNet = input.activities.reduce((s, a) => s + (Number(a.net) || 0), 0);

    if (calculatedGross !== calculatedPtShare + calculatedNet) {
      errors.push(
        `Total Financial Invariant Failed: Total Gross (${calculatedGross}) must equal Total PatientShare (${calculatedPtShare}) + Total Net (${calculatedNet})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
