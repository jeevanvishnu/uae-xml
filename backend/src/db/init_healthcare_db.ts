import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function initHealthcareDb() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  const sql = neon(connectionString);
  console.log("⚡ Connecting to Neon Database to deploy UAE Healthcare & Claims Schema...");

  // 1. Enums
  await sql`
    DO $$ BEGIN
      CREATE TYPE role AS ENUM ('reception', 'doctor', 'pharmacist', 'billing', 'admin', 'superadmin');
    EXCEPTION
      WHEN duplicate_object THEN
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'reception';
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'doctor';
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'pharmacist';
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'billing';
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE emirate AS ENUM ('DXB', 'NE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE facility_type AS ENUM ('CLINIC', 'PHARMACY', 'HOSPITAL');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE disposition_flag AS ENUM ('TEST', 'PRODUCTION');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE gender AS ENUM ('M', 'F', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE encounter_type AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DENTAL');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE eligibility_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING', 'REJECTED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE claim_status AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID', 'PARTIALLY_PAID', 'RESUBMITTED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE hub_direction AS ENUM ('OUTBOUND', 'INBOUND');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE hub_ref_type AS ENUM ('CLAIM', 'ERX', 'ELIGIBILITY', 'REMITTANCE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'INSURANCE', 'MIXED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;

  console.log("✅ Enums deployed.");

  // 2. Facilities
  await sql`
    CREATE TABLE IF NOT EXISTS facilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      emirate emirate NOT NULL DEFAULT 'NE',
      license_id VARCHAR(100) NOT NULL UNIQUE,
      facility_type facility_type NOT NULL DEFAULT 'CLINIC',
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      hub_username TEXT,
      hub_password_enc TEXT,
      x509_cert_enc TEXT,
      disposition_flag disposition_flag NOT NULL DEFAULT 'TEST',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_facilities_license_id ON facilities(license_id);`;

  // 3. Update Users table for facility_id
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE;
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_facility_id ON users(facility_id);`;

  // 4. Clinicians
  await sql`
    CREATE TABLE IF NOT EXISTS clinicians (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      license_number VARCHAR(100) NOT NULL,
      specialty TEXT,
      department TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_clinicians_facility_id ON clinicians(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_clinicians_license_number ON clinicians(license_number);`;

  // 5. Patients
  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      emirates_id VARCHAR(25),
      passport_no VARCHAR(50),
      full_name TEXT NOT NULL,
      dob TIMESTAMP NOT NULL,
      gender gender NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      nationality VARCHAR(100),
      address TEXT,
      emergency_contact TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_emirates_id ON patients(emirates_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_passport_no ON patients(passport_no);`;

  // 6. Patient Policies
  await sql`
    CREATE TABLE IF NOT EXISTS patient_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      payer_id VARCHAR(100) NOT NULL,
      payer_name TEXT NOT NULL,
      member_id VARCHAR(100) NOT NULL,
      policy_number VARCHAR(100),
      network VARCHAR(100) DEFAULT 'Comprehensive',
      copay_percent INTEGER NOT NULL DEFAULT 20,
      copay_cap INTEGER NOT NULL DEFAULT 50,
      deductible INTEGER NOT NULL DEFAULT 0,
      expiry_date TIMESTAMP NOT NULL,
      eligibility_status eligibility_status NOT NULL DEFAULT 'PENDING',
      last_verified_at TIMESTAMP,
      eligibility_details JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_policies_patient_id ON patient_policies(patient_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_policies_payer_id ON patient_policies(payer_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_policies_member_id ON patient_policies(member_id);`;

  // 7. Encounters
  await sql`
    CREATE TABLE IF NOT EXISTS encounters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      policy_id UUID REFERENCES patient_policies(id) ON DELETE SET NULL,
      clinician_id UUID REFERENCES clinicians(id) ON DELETE SET NULL,
      encounter_type encounter_type NOT NULL DEFAULT 'OUTPATIENT',
      start_time TIMESTAMP NOT NULL DEFAULT NOW(),
      end_time TIMESTAMP,
      diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
      activities JSONB NOT NULL DEFAULT '[]'::jsonb,
      gross_amount INTEGER NOT NULL DEFAULT 0,
      patient_share INTEGER NOT NULL DEFAULT 0,
      net_amount INTEGER NOT NULL DEFAULT 0,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
      claim_status claim_status NOT NULL DEFAULT 'DRAFT',
      clinical_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_facility_id ON encounters(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_claim_status ON encounters(claim_status);`;

  // 8. Payment Transactions
  await sql`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
      payment_method payment_method NOT NULL DEFAULT 'CASH',
      amount INTEGER NOT NULL,
      receipt_number VARCHAR(100) NOT NULL,
      notes TEXT,
      collected_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_payment_transactions_encounter_id ON payment_transactions(encounter_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payment_transactions_facility_id ON payment_transactions(facility_id);`;

  // 9. Prescriptions
  await sql`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      clinician_id UUID REFERENCES clinicians(id) ON DELETE SET NULL,
      erx_ref_no VARCHAR(100),
      medications JSONB NOT NULL DEFAULT '[]'::jsonb,
      dispense_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      erx_xml_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_prescriptions_facility_id ON prescriptions(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_prescriptions_erx_ref_no ON prescriptions(erx_ref_no);`;

  // 10. Claim Submissions
  await sql`
    CREATE TABLE IF NOT EXISTS claim_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      claim_number VARCHAR(100) NOT NULL UNIQUE,
      submission_xml_key TEXT,
      submission_date TIMESTAMP NOT NULL DEFAULT NOW(),
      payer_id VARCHAR(100) NOT NULL,
      net_amount INTEGER NOT NULL,
      resubmission_count INTEGER NOT NULL DEFAULT 0,
      resubmission_type VARCHAR(50),
      parent_claim_id UUID REFERENCES claim_submissions(id) ON DELETE SET NULL,
      status claim_status NOT NULL DEFAULT 'SUBMITTED',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_claim_submissions_facility_id ON claim_submissions(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_claim_submissions_encounter_id ON claim_submissions(encounter_id);`;

  // 11. Remittance Lines
  await sql`
    CREATE TABLE IF NOT EXISTS remittance_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_submission_id UUID NOT NULL REFERENCES claim_submissions(id) ON DELETE CASCADE,
      activity_id VARCHAR(100),
      gross INTEGER NOT NULL DEFAULT 0,
      patient_share INTEGER NOT NULL DEFAULT 0,
      net INTEGER NOT NULL DEFAULT 0,
      payment_amount INTEGER NOT NULL DEFAULT 0,
      denial_code VARCHAR(50),
      payer_remark TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_remittance_lines_submission_id ON remittance_lines(claim_submission_id);`;

  // 12. Hub Transactions
  await sql`
    CREATE TABLE IF NOT EXISTS hub_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      reference_type hub_ref_type NOT NULL,
      reference_id UUID,
      direction hub_direction NOT NULL,
      hub_txn_id VARCHAR(150),
      raw_xml TEXT,
      raw_xml_key TEXT,
      validation_errors JSONB,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_hub_transactions_facility_id ON hub_transactions(facility_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_hub_transactions_ref_id ON hub_transactions(reference_id);`;

  // 13. Code Dictionaries
  await sql`
    CREATE TABLE IF NOT EXISTS icd10_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category VARCHAR(100)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_icd10_code ON icd10_codes(code);`;

  await sql`
    CREATE TABLE IF NOT EXISTS cpt_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category VARCHAR(100),
      default_price INTEGER DEFAULT 0
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_cpt_code ON cpt_codes(code);`;

  await sql`
    CREATE TABLE IF NOT EXISTS drug_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      drug_code VARCHAR(50) NOT NULL UNIQUE,
      trade_name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      dosage_form VARCHAR(100),
      strength VARCHAR(100),
      unit VARCHAR(50),
      is_generic BOOLEAN NOT NULL DEFAULT false,
      mohap_code VARCHAR(50)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_drug_code ON drug_codes(drug_code);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_drug_trade_name ON drug_codes(trade_name);`;

  console.log("🎉 All UAE Healthcare & Claims tables successfully created and synchronized!");
}

initHealthcareDb().catch((err) => {
  console.error("❌ DB Init failed:", err);
  process.exit(1);
});
