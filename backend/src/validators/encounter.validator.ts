import { z } from "zod";

export const diagnosisItemSchema = z.object({
  type: z.enum(["Principal", "Secondary"]),
  code: z.string().min(1, "ICD-10 code is required"),
  description: z.string().min(1, "Diagnosis description is required"),
});

export const activityItemSchema = z.object({
  id: z.string().optional(),
  type: z.literal("3").default("3"), // "3" is CPT in Riayati / DHPO standards
  code: z.string().min(1, "CPT/Service code is required"),
  description: z.string().min(1, "Service description is required"),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  clinicianLicense: z.string().optional(),
});

export const createEncounterSchema = z.object({
  patientId: z.string().uuid("Valid patient UUID is required"),
  policyId: z.string().uuid("Valid policy UUID").optional().nullable(),
  clinicianId: z.string().uuid("Valid clinician UUID").optional().nullable(),
  encounterType: z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY", "DENTAL"]).default("OUTPATIENT"),
  clinicalNotes: z.string().optional(),
});

export const updateEncounterSchema = z.object({
  encounterType: z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY", "DENTAL"]).optional(),
  clinicianId: z.string().uuid().optional().nullable(),
  diagnoses: z.array(diagnosisItemSchema).optional(),
  activities: z.array(activityItemSchema).optional(),
  clinicalNotes: z.string().optional(),
});
