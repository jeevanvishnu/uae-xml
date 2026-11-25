import { z } from "zod";

// Helper to format or validate Emirates ID (784-YYYY-NNNNNNN-C or 15 digits)
export const emiratesIdRegex = /^(784-[0-9]{4}-[0-9]{7}-[0-9]{1}|[0-9]{15})$/;
export const dateRegex = /^\d{4}-\d{2}-\d{2}/;

export const basePatientShape = {
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  emiratesId: z
    .string()
    .regex(emiratesIdRegex, "Emirates ID must be 784-YYYY-NNNNNNN-C or 15 digits")
    .optional()
    .or(z.literal("")),
  passportNo: z.string().optional().or(z.literal("")),
  dob: z.string().regex(dateRegex, "Valid Date of Birth is required (YYYY-MM-DD)"),
  gender: z.enum(["M", "F", "OTHER"]),
  phone: z.string().min(7, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
};

export const basePatientSchema = z.object(basePatientShape);

export const createPatientSchema = basePatientSchema.refine(
  (data) => Boolean(data.emiratesId || data.passportNo),
  {
    message: "Either Emirates ID or Passport Number must be provided",
    path: ["emiratesId"],
  }
);

// updatePatientSchema created from basePatientSchema.partial() - clean because no inner refinements
export const updatePatientSchema = z.object({
  fullName: basePatientShape.fullName.optional(),
  emiratesId: basePatientShape.emiratesId.optional(),
  passportNo: basePatientShape.passportNo.optional(),
  dob: basePatientShape.dob.optional(),
  gender: basePatientShape.gender.optional(),
  phone: basePatientShape.phone.optional(),
  email: basePatientShape.email.optional(),
  nationality: basePatientShape.nationality.optional(),
  address: basePatientShape.address.optional(),
  emergencyContact: basePatientShape.emergencyContact.optional(),
});

export const createPolicySchema = z.object({
  payerId: z.string().min(1, "Insurance Payer ID (ReceiverID) is required"),
  payerName: z.string().min(1, "Insurance company name is required"),
  memberId: z.string().min(1, "Member/Card ID is required"),
  policyNumber: z.string().optional(),
  network: z.string().default("Comprehensive"),
  copayPercent: z.number().min(0).max(100).default(20),
  copayCap: z.number().min(0).default(50),
  deductible: z.number().min(0).default(0),
  expiryDate: z.string().regex(dateRegex, "Valid expiry date required (YYYY-MM-DD)"),
});

export const verifyEligibilitySchema = z.object({
  policyId: z.string().uuid("Valid policy UUID required").optional(),
});
