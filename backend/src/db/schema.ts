import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", [
  "reception",
  "doctor",
  "pharmacist",
  "billing",
  "admin",
  "superadmin",
]);

export const emirateEnum = pgEnum("emirate", ["DXB", "NE"]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "CLINIC",
  "PHARMACY",
  "HOSPITAL",
]);

export const dispositionEnum = pgEnum("disposition_flag", ["TEST", "PRODUCTION"]);

export const genderEnum = pgEnum("gender", ["M", "F", "OTHER"]);

export const encounterTypeEnum = pgEnum("encounter_type", [
  "OUTPATIENT",
  "INPATIENT",
  "EMERGENCY",
  "DENTAL",
]);

export const eligibilityStatusEnum = pgEnum("eligibility_status", [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "PENDING",
  "REJECTED",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "PAID",
  "PARTIALLY_PAID",
  "RESUBMITTED",
]);

export const hubDirectionEnum = pgEnum("hub_direction", ["OUTBOUND", "INBOUND"]);

export const hubRefTypeEnum = pgEnum("hub_ref_type", [
  "CLAIM",
  "ERX",
  "ELIGIBILITY",
  "REMITTANCE",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "INSURANCE",
  "MIXED",
]);

export const logTypeEnum = pgEnum("log_type", ["SUCCESS", "WARNING", "ERROR"]);

// ─── TABLES ──────────────────────────────────────────────────────────────────

// 1. Facilities (Multi-tenant scope)
export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    emirate: emirateEnum("emirate").default("NE").notNull(), // Default Northern Emirates (Riayati)
    licenseId: varchar("license_id", { length: 100 }).notNull().unique(), // SenderID for Riayati
    facilityType: facilityTypeEnum("facility_type").default("CLINIC").notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    hubUsername: text("hub_username"),
    hubPasswordEnc: text("hub_password_enc"),
    x509CertEnc: text("x509_cert_enc"),
    dispositionFlag: dispositionEnum("disposition_flag").default("TEST").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_facilities_license_id").on(table.licenseId),
    index("idx_facilities_emirate").on(table.emirate),
  ]
);

// 2. Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name"),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").default("reception").notNull(),
    imageUrl: text("image_url"),
    storageKey: text("storage_key"),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    resetPasswordToken: text("reset_password_token"),
    resetPasswordExpires: timestamp("reset_password_expires"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_facility_id").on(table.facilityId),
    index("idx_users_reset_password_token").on(table.resetPasswordToken),
  ]
);

// 3. Refresh Sessions (No Redis needed, token rotation with DB revoke)
export const refreshSessions = pgTable(
  "refresh_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    familyId: varchar("family_id", { length: 36 }).notNull(),
    familyCreatedAt: timestamp("family_created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_refresh_sessions_user_id").on(table.userId),
    index("idx_refresh_sessions_token_hash").on(table.tokenHash),
    index("idx_refresh_sessions_family_id").on(table.familyId),
    index("idx_refresh_sessions_expires_at").on(table.expiresAt),
  ]
);

// 4. Clinicians (Doctors, Specialists)
export const clinicians = pgTable(
  "clinicians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    licenseNumber: varchar("license_number", { length: 100 }).notNull(), // ClinicianID in XML
    specialty: text("specialty"),
    department: text("department"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_clinicians_facility_id").on(table.facilityId),
    index("idx_clinicians_license_number").on(table.licenseNumber),
  ]
);

// 5. Patients (Separating Identity from Policy status per PRD FR-1.2)
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    emiratesId: varchar("emirates_id", { length: 25 }), // 784-YYYY-NNNNNNN-C
    passportNo: varchar("passport_no", { length: 50 }),
    fullName: text("full_name").notNull(),
    dob: timestamp("dob").notNull(),
    gender: genderEnum("gender").notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    nationality: varchar("nationality", { length: 100 }),
    address: text("address"),
    emergencyContact: text("emergency_contact"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patients_facility_id").on(table.facilityId),
    index("idx_patients_emirates_id").on(table.emiratesId),
    index("idx_patients_passport_no").on(table.passportNo),
    index("idx_patients_phone").on(table.phone),
  ]
);

// 6. Patient Policies (Insurance Coverage & Eligibility per PRD FR-1.3)
export const patientPolicies = pgTable(
  "patient_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    payerId: varchar("payer_id", { length: 100 }).notNull(), // ReceiverID in Riayati/DHA
    payerName: text("payer_name").notNull(),
    memberId: varchar("member_id", { length: 100 }).notNull(),
    policyNumber: varchar("policy_number", { length: 100 }),
    network: varchar("network", { length: 100 }).default("Comprehensive"),
    copayPercent: integer("copay_percent").default(20).notNull(), // e.g., 20%
    copayCap: integer("copay_cap").default(50).notNull(), // Max copay cap in AED (e.g. 50 AED)
    deductible: integer("deductible").default(0).notNull(),
    expiryDate: timestamp("expiry_date").notNull(),
    eligibilityStatus: eligibilityStatusEnum("eligibility_status").default("PENDING").notNull(),
    lastVerifiedAt: timestamp("last_verified_at"),
    eligibilityDetails: jsonb("eligibility_details"), // Cached benefits payload
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patient_policies_patient_id").on(table.patientId),
    index("idx_patient_policies_payer_id").on(table.payerId),
    index("idx_patient_policies_member_id").on(table.memberId),
  ]
);

// 7. Encounters (Visits / Consultations)
export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    patientId: uuid("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    policyId: uuid("policy_id").references(() => patientPolicies.id, { onDelete: "set null" }), // Nullable if Self-Pay
    clinicianId: uuid("clinician_id").references(() => clinicians.id, { onDelete: "set null" }),
    encounterType: encounterTypeEnum("encounter_type").default("OUTPATIENT").notNull(),
    startTime: timestamp("start_time").defaultNow().notNull(),
    endTime: timestamp("end_time"),
    diagnoses: jsonb("diagnoses").default([]).notNull(), // Array of { type: 'Principal'|'Secondary', code, description }
    activities: jsonb("activities").default([]).notNull(), // Array of { id, type, code, quantity, unitPrice, gross, patientShare, net }
    grossAmount: integer("gross_amount").default(0).notNull(), // in AED (or fils)
    patientShare: integer("patient_share").default(0).notNull(),
    netAmount: integer("net_amount").default(0).notNull(),
    paymentStatus: varchar("payment_status", { length: 50 }).default("UNPAID").notNull(),
    claimStatus: claimStatusEnum("claim_status").default("DRAFT").notNull(),
    clinicalNotes: text("clinical_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_encounters_facility_id").on(table.facilityId),
    index("idx_encounters_patient_id").on(table.patientId),
    index("idx_encounters_claim_status").on(table.claimStatus),
    index("idx_encounters_start_time").on(table.startTime),
  ]
);

// 8. Payment Transactions (Patient co-pay/deductible collection)
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    encounterId: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    patientId: uuid("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    collectedBy: uuid("collected_by").references(() => users.id, { onDelete: "set null" }),
    paymentMethod: paymentMethodEnum("payment_method").default("CASH").notNull(),
    amount: integer("amount").notNull(), // Collected amount in AED
    receiptNumber: varchar("receipt_number", { length: 100 }).notNull(),
    notes: text("notes"),
    collectedAt: timestamp("collected_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_payment_transactions_encounter_id").on(table.encounterId),
    index("idx_payment_transactions_facility_id").on(table.facilityId),
  ]
);

// 9. Prescriptions (eRx)
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    encounterId: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    patientId: uuid("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    clinicianId: uuid("clinician_id").references(() => clinicians.id, { onDelete: "set null" }),
    erxRefNo: varchar("erx_ref_no", { length: 100 }),
    medications: jsonb("medications").default([]).notNull(), // [{drugCode, tradeName, dosage, frequency, duration, quantity}]
    dispenseStatus: varchar("dispense_status", { length: 50 }).default("PENDING").notNull(),
    erxXmlKey: text("erx_xml_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_prescriptions_facility_id").on(table.facilityId),
    index("idx_prescriptions_erx_ref_no").on(table.erxRefNo),
    index("idx_prescriptions_encounter_id").on(table.encounterId),
  ]
);

// 10. Claim Submissions
export const claimSubmissions = pgTable(
  "claim_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    encounterId: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    claimNumber: varchar("claim_number", { length: 100 }).notNull().unique(),
    submissionXmlKey: text("submission_xml_key"),
    submissionDate: timestamp("submission_date").defaultNow().notNull(),
    payerId: varchar("payer_id", { length: 100 }).notNull(),
    netAmount: integer("net_amount").notNull(),
    resubmissionCount: integer("resubmission_count").default(0).notNull(),
    resubmissionType: varchar("resubmission_type", { length: 50 }),
    parentClaimId: uuid("parent_claim_id"),
    status: claimStatusEnum("status").default("SUBMITTED").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_claim_submissions_facility_id").on(table.facilityId),
    index("idx_claim_submissions_encounter_id").on(table.encounterId),
    index("idx_claim_submissions_claim_number").on(table.claimNumber),
  ]
);

// 11. Remittance Lines (Payer Reconciliation)
export const remittanceLines = pgTable(
  "remittance_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimSubmissionId: uuid("claim_submission_id")
      .references(() => claimSubmissions.id, { onDelete: "cascade" })
      .notNull(),
    activityId: varchar("activity_id", { length: 100 }),
    gross: integer("gross").default(0).notNull(),
    patientShare: integer("patient_share").default(0).notNull(),
    net: integer("net").default(0).notNull(),
    paymentAmount: integer("payment_amount").default(0).notNull(),
    denialCode: varchar("denial_code", { length: 50 }),
    payerRemark: text("payer_remark"),
    status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  },
  (table) => [
    index("idx_remittance_lines_submission_id").on(table.claimSubmissionId),
  ]
);

// 12. Hub Transactions (Regulatory Audit Trail per PRD NFR-3)
export const hubTransactions = pgTable(
  "hub_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id")
      .references(() => facilities.id, { onDelete: "cascade" })
      .notNull(),
    referenceType: hubRefTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id"), // links to encounter, prescription, claim, or policy
    direction: hubDirectionEnum("direction").notNull(),
    hubTxnId: varchar("hub_txn_id", { length: 150 }),
    rawXml: text("raw_xml"),
    rawXmlKey: text("raw_xml_key"),
    validationErrors: jsonb("validation_errors"),
    status: varchar("status", { length: 50 }).default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_hub_transactions_facility_id").on(table.facilityId),
    index("idx_hub_transactions_ref_id").on(table.referenceId),
    index("idx_hub_transactions_hub_txn_id").on(table.hubTxnId),
  ]
);

// 13. Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_facility_id").on(table.facilityId),
    index("idx_audit_logs_user_id").on(table.userId),
  ]
);

// 14. Code Dictionaries: ICD-10 Diagnosis Codes
export const icd10Codes = pgTable(
  "icd10_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
  },
  (table) => [
    index("idx_icd10_code").on(table.code),
  ]
);

// 15. Code Dictionaries: CPT Procedure / Service Codes
export const cptCodes = pgTable(
  "cpt_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
    defaultPrice: integer("default_price").default(0), // in AED
  },
  (table) => [
    index("idx_cpt_code").on(table.code),
  ]
);

// 16. Code Dictionaries: UAE Drug Codes (DDC)
export const drugCodes = pgTable(
  "drug_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    drugCode: varchar("drug_code", { length: 50 }).notNull().unique(),
    tradeName: text("trade_name").notNull(),
    genericName: text("generic_name").notNull(),
    dosageForm: varchar("dosage_form", { length: 100 }),
    strength: varchar("strength", { length: 100 }),
    unit: varchar("unit", { length: 50 }),
    isGeneric: boolean("is_generic").default(false).notNull(),
    moHapCode: varchar("mohap_code", { length: 50 }),
  },
  (table) => [
    index("idx_drug_code").on(table.drugCode),
    index("idx_drug_trade_name").on(table.tradeName),
  ]
);

// ─── RELATIONS ───────────────────────────────────────────────────────────────

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  clinicians: many(clinicians),
  patients: many(patients),
  encounters: many(encounters),
  hubTransactions: many(hubTransactions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  refreshSessions: many(refreshSessions),
}));

export const cliniciansRelations = relations(clinicians, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [clinicians.facilityId],
    references: [facilities.id],
  }),
  user: one(users, {
    fields: [clinicians.userId],
    references: [users.id],
  }),
  encounters: many(encounters),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [patients.facilityId],
    references: [facilities.id],
  }),
  policies: many(patientPolicies),
  encounters: many(encounters),
}));

export const patientPoliciesRelations = relations(patientPolicies, ({ one }) => ({
  patient: one(patients, {
    fields: [patientPolicies.patientId],
    references: [patients.id],
  }),
  facility: one(facilities, {
    fields: [patientPolicies.facilityId],
    references: [facilities.id],
  }),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [encounters.facilityId],
    references: [facilities.id],
  }),
  patient: one(patients, {
    fields: [encounters.patientId],
    references: [patients.id],
  }),
  policy: one(patientPolicies, {
    fields: [encounters.policyId],
    references: [patientPolicies.id],
  }),
  clinician: one(clinicians, {
    fields: [encounters.clinicianId],
    references: [clinicians.id],
  }),
  prescriptions: many(prescriptions),
  claimSubmissions: many(claimSubmissions),
  payments: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  encounter: one(encounters, {
    fields: [paymentTransactions.encounterId],
    references: [encounters.id],
  }),
  facility: one(facilities, {
    fields: [paymentTransactions.facilityId],
    references: [facilities.id],
  }),
  patient: one(patients, {
    fields: [paymentTransactions.patientId],
    references: [patients.id],
  }),
  collector: one(users, {
    fields: [paymentTransactions.collectedBy],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  encounter: one(encounters, {
    fields: [prescriptions.encounterId],
    references: [encounters.id],
  }),
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  clinician: one(clinicians, {
    fields: [prescriptions.clinicianId],
    references: [clinicians.id],
  }),
}));

export const claimSubmissionsRelations = relations(claimSubmissions, ({ one, many }) => ({
  encounter: one(encounters, {
    fields: [claimSubmissions.encounterId],
    references: [encounters.id],
  }),
  facility: one(facilities, {
    fields: [claimSubmissions.facilityId],
    references: [facilities.id],
  }),
  remittanceLines: many(remittanceLines),
}));

export const remittanceLinesRelations = relations(remittanceLines, ({ one }) => ({
  claimSubmission: one(claimSubmissions, {
    fields: [remittanceLines.claimSubmissionId],
    references: [claimSubmissions.id],
  }),
}));

export const hubTransactionsRelations = relations(hubTransactions, ({ one }) => ({
  facility: one(facilities, {
    fields: [hubTransactions.facilityId],
    references: [facilities.id],
  }),
}));

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Clinician = typeof clinicians.$inferSelect;
export type NewClinician = typeof clinicians.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type PatientPolicy = typeof patientPolicies.$inferSelect;
export type NewPatientPolicy = typeof patientPolicies.$inferInsert;

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;

export type ClaimSubmission = typeof claimSubmissions.$inferSelect;
export type NewClaimSubmission = typeof claimSubmissions.$inferInsert;

export type RemittanceLine = typeof remittanceLines.$inferSelect;
export type NewRemittanceLine = typeof remittanceLines.$inferInsert;

export type HubTransaction = typeof hubTransactions.$inferSelect;
export type NewHubTransaction = typeof hubTransactions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Icd10Code = typeof icd10Codes.$inferSelect;
export type CptCode = typeof cptCodes.$inferSelect;
export type DrugCode = typeof drugCodes.$inferSelect;
