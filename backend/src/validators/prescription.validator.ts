import { z } from "zod";

export const medicationItemSchema = z.object({
  drugCode: z.string().min(1, "Drug/DDC code is required"),
  tradeName: z.string().min(1, "Trade name is required"),
  genericName: z.string().optional(),
  dosage: z.string().min(1, "Dosage is required (e.g. 500mg)"),
  frequency: z.string().min(1, "Frequency is required (e.g. BID, Once daily)"),
  duration: z.number().int().min(1, "Duration in days must be at least 1"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0).default(0),
  instructions: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  encounterId: z.string().uuid("Valid encounter UUID is required"),
  patientId: z.string().uuid("Valid patient UUID is required").optional(),
  clinicianId: z.string().uuid("Valid clinician UUID").optional().nullable(),
  medications: z.array(medicationItemSchema).min(1, "At least one medication is required"),
  notes: z.string().optional(),
});

export const dispensePrescriptionSchema = z.object({
  copayCollected: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "INSURANCE", "MIXED"]).default("CASH"),
  notes: z.string().optional(),
});
