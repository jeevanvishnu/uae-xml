# Product Requirements Document (PRD)
**Project Name:** UAE Healthcare & Insurance e-Claims Integration Platform (EMR, Pharmacy & Payer Exchange)  
**Document Version:** 1.0  
**Date:** November 24, 2026  
**Target Markets:** United Arab Emirates — Dubai (DHA eClaimLink / NABIDH) & Northern Emirates (MoHAP Riayati)  

---

## 1. Executive Summary & Vision
The **UAE Healthcare & Insurance e-Claims Integration Platform** is a multi-tenant healthcare management and regulatory middleware system designed for licensed clinics, medical centers, and pharmacies in the UAE. 

In the UAE, healthcare providers cannot submit manual paper invoices or unstructured files to insurance companies. Every patient encounter, electronic prescription (`eRx`), eligibility verification, and insurance claim must be standardized into regulator-mandated **XML schemas** and transmitted through central government hubs (**DHA eClaimLink** in Dubai or **MoHAP Riayati** in the Northern Emirates).

This platform bridges the operational gap between **Reception**, **Doctors**, **Pharmacies**, and **Insurance Payers**, automating XML generation, XSD schema validation, hub transmission, and remittance reconciliation to minimize claim denials and accelerate cash flow.

---

## 2. Target Audience & User Personas
1. **Clinic Receptionist / Front-Desk Officer:**
   * Registers patients via **Emirates ID** or **Passport**.
   * Verifies real-time insurance policy eligibility and network coverage.
   * Calculates and collects upfront patient co-pay / deductible shares.
2. **Physician / Dentist / Clinician:**
   * Conducts patient consultations and records clinical findings.
   * Assigns standardized diagnosis codes (**ICD-10**) and procedure/service codes (**CPT**).
   * Issues electronic prescriptions (**eRx**) mapped to official **UAE / Dubai Drug Codes (DDC)**.
3. **Pharmacist (In-House or External Pharmacy):**
   * Retrieves active e-Prescriptions via the patient's **Emirates ID** or **eRx Reference Number**.
   * Dispenses approved medications, collects pharmacy co-pay, and submits pharmacy claims.
4. **Insurance Billing Officer / Revenue Cycle Manager:**
   * Reviews completed encounters, validates claim readiness, and submits batch `ClaimSubmission.xml` files to the government hub.
   * Reconciles incoming `RemittanceAdvice.xml` files from payers.
   * Investigates rejected line items using official denial codes, attaches clinical justifications, and triggers resubmissions.
5. **System / Tenant Administrator:**
   * Manages facility license credentials (`SenderID`, hub usernames/passwords, X.509 certificates), doctor licenses, and master tariff/code dictionaries.

---

## 3. Regional Regulatory Scope (UAE Hub Architecture)
The system must support multi-tenant routing based on the facility's licensing authority:

| Emirate / Jurisdiction | Regulatory Authority | Claims & eRx Hub | Clinical Exchange | Primary Format |
| :--- | :--- | :--- | :--- | :--- |
| **Dubai** | Dubai Health Authority (DHA) | **DHA eClaimLink (DHPO)** | **NABIDH** | XML (`ClaimSubmission`, `PriorRequest`, `ePrescription`, `RemittanceAdvice`) |
| **Northern Emirates** *(Sharjah, Ajman, RAK, Fujairah, UAQ)* | Ministry of Health & Prevention (MoHAP) | **Riayati e-Claims Post Office** | **Riayati NUMR** | XML (`eClaims Post Office XSD`) & HL7/FHIR |

---

## 4. End-to-End Functional Requirements

### Module 1: Patient Identity & Insurance Eligibility Check
* **FR-1.1 Identity Capture:** Support manual entry and smart-card reader ingestion of **Emirates ID** (`784-YYYY-NNNNNNN-C`) and Passport numbers (for tourists/non-residents).
* **FR-1.2 Distinct Identity vs. Policy State:** Separate `Patient Identity` (who the person is) from `Insurance Policy Status` (whether coverage is active).
* **FR-1.3 Eligibility Verification:** Send `PriorRequest` / Eligibility inquiry XML to the hub using `EmiratesIDNumber`, `MemberID`, and `PayerID` (`ReceiverID`) to verify active status, network inclusion, and co-pay/deductible rules.
* **FR-1.4 Fallback Handling:** Allow self-pay / cash billing workflows when a patient's policy is expired, inactive, or out-of-network.

### Module 2: Clinical Consultation & Medical Coding
* **FR-2.1 Master Code Dictionaries:** Maintain searchable PostgreSQL tables for:
  * **ICD-10-CM** (Diagnosis codes)
  * **CPT / Local Service Codes** (Consultations, lab tests, radiology, dental procedures)
  * **UAE Drug Codes (DDC / MoHAP Drug List)** (Medication barcodes, generic/brand flags, dosage forms)
* **FR-2.2 Encounter Capture:** Link every visit to a licensed clinician (`ClinicianID`), encounter start/end timestamps, encounter type (Outpatient, Inpatient, Emergency), and principal/secondary diagnoses.
* **FR-2.3 Financial Split Calculation:** Automatically compute line-item and claim-level financials enforcing:
  $$\text{Gross} = \text{PatientShare} + \text{Net}$$

### Module 3: Electronic Prescription (`eRx`) & Pharmacy Dispensing
* **FR-3.1 eRx Generation:** Convert prescribed medications into regulator-compliant `ePrescription.xml` containing patient ID, clinician license, diagnosis code, drug code, dosage, frequency, duration, and quantity.
* **FR-3.2 Hub Transmission:** Push `ePrescription.xml` to the government hub (`eClaimLink` / `Riayati`) and store the returned `eRxReferenceNumber`.
* **FR-3.3 Pharmacy Dispensing Workflow:**
  * Allow pharmacy users to query pending prescriptions via `EmiratesIDNumber` or `eRxReferenceNumber`.
  * Apply generic vs. brand co-pay rules, dispense allowed quantities, collect `PatientShare`, and generate a pharmacy `ClaimSubmission.xml`.

### Module 4: XML Claim Generation, XSD Validation & Hub Post Office Connector
* **FR-4.1 XML Serialization:** Transform PostgreSQL encounter/billing records into strict XML payloads (`Claim.Submission`) containing `<Header>`, `<Claim>`, `<Encounter>`, `<Diagnosis>`, and `<Activity>` blocks.
* **FR-4.2 Pre-Submission XSD & Business Rule Validation:**
  * Validate generated XML against official regulator `.xsd` schemas before network transmission.
  * Enforce business rules (e.g., valid date formatting `DD/MM/YYYY HH:mm`, non-negative amounts, valid `SenderID` and `ReceiverID`, active clinician license).
* **FR-4.3 Government Hub Web Service Client (SOAP/REST):**
  * **`UploadTransaction`:** Transmit validated XML payloads to DHPO / Riayati and log the returned `TransactionID`.
  * **`SearchTransactions`:** Scheduled background worker (`node-cron`) polling the facility's hub inbox every 15 minutes for new payer responses.
  * **`DownloadTransaction`:** Retrieve inbound XML files (`RemittanceAdvice.xml`, prior authorization approvals/rejections) and archive raw payloads.

### Module 5: Remittance Reconciliation & Resubmission Management
* **FR-5.1 Automated Remittance Parsing:** Parse incoming `RemittanceAdvice.xml` files and match `<Claim><ID>` and `<Activity><ID>` against submitted records.
* **FR-5.2 Status Classification:**
  * **Paid / Settled:** Full `Net` amount approved (`PaymentAmount == Net`).
  * **Partially Paid / Rejected:** One or more activities denied (`PaymentAmount < Net`), displaying official `<DenialCode>` and payer remarks.
* **FR-5.3 Claim Resubmission Workflow:** Allow billing officers to attach clinical notes/supporting documents, apply corrections (`ResubmissionType: Correction` or `Internal Complaint`), increment resubmission counters, and transmit a linked resubmission XML within regulatory deadlines.

---

## 5. High-Level Technical Architecture

### Tech Stack
* **Frontend:** React (Vite), Tailwind CSS, TypeScript (Role-based dashboards for Reception, Doctor, Pharmacy, Billing).
* **Backend API & Worker Engine:** Node.js, Express, `xmlbuilder2` (XML generation), `libxmljs2` / `xsd-schema-validator` (schema validation), `soap` / `axios` (hub communication), `node-cron` (inbox polling).
* **Database:** PostgreSQL (Multi-tenant schema with JSONB support for flexible clinical metadata and full audit trails).
* **Hosting & Infrastructure:** UAE-region cloud hosting (e.g., AWS Middle East `me-central-1` UAE or Azure UAE North) to satisfy data residency laws.

### Core Database Entities (PostgreSQL)
1. **`facilities`:** `id`, `tenant_id`, `name`, `emirate` (`DXB` | `NE`), `license_id` (`SenderID`), `facility_type` (`CLINIC` | `PHARMACY`), `hub_username`, `hub_password_enc`, `disposition_flag` (`TEST` | `PRODUCTION`).
2. **`patients`:** `id`, `emirates_id`, `passport_no`, `full_name`, `dob`, `gender`, `phone`.
3. **`patient_policies`:** `id`, `patient_id`, `payer_id` (`ReceiverID`), `member_id`, `network`, `copay_percent`, `copay_cap`, `expiry_date`, `eligibility_status`, `last_verified_at`.
4. **`encounters`:** `id`, `facility_id`, `patient_id`, `policy_id`, `clinician_license_id`, `encounter_type`, `start_time`, `end_time`, `diagnoses` (JSONB), `activities` (JSONB), `gross_amount`, `patient_share`, `net_amount`, `claim_status`.
5. **`prescriptions`:** `id`, `encounter_id`, `facility_id`, `patient_id`, `erx_ref_no`, `medications` (JSONB), `dispense_status`.
6. **`hub_transactions`:** `id`, `facility_id`, `reference_type` (`CLAIM` | `ERX` | `ELIGIBILITY` | `REMITTANCE`), `reference_id`, `direction` (`OUTBOUND` | `INBOUND`), `hub_txn_id`, `raw_xml`, `validation_errors` (JSONB), `status`, `created_at`.

---

## 6. Security, Compliance & Non-Functional Requirements
* **NFR-1 Data Residency:** All Protected Health Information (PHI) and raw XML transaction logs must be stored exclusively on servers physically located within the UAE in compliance with **UAE Federal Law No. 2 of 2019** on the Use of Information and Communication Technology (ICT) in Health Fields.
* **NFR-2 Encryption & Secrets Management:** Encrypt all facility hub credentials, certificates, and patient identifiers at rest (AES-256) and enforce TLS 1.2+ in transit.
* **NFR-3 Immutable Audit Logging:** Retain original inbound and outbound XML files alongside timestamps, user IDs, and hub transaction receipts for mandatory regulatory audit windows.
* **NFR-4 High Availability & Retry Logic:** Implement exponential backoff and dead-letter queuing for outbound `UploadTransaction` calls in case the government hub undergoes scheduled maintenance.

---

## 7. Phased Delivery Roadmap
* **Phase 1: Core EMR, Pharmacy & Master Code Setup (Weeks 1–3)**
  * Multi-tenant facility setup, Reception Emirates ID & policy screens, Doctor ICD-10/CPT/DDC coding UI, and PostgreSQL schema deployment.
* **Phase 2: XML Engine, XSD Validator & Mock Hub Simulator (Weeks 4–5)**
  * Build Node.js JSON-to-XML builders (`ClaimSubmission`, `ePrescription`), integrate official `.xsd` validation, and build a local Mock Post Office server for end-to-end testing.
* **Phase 3: Government Sandbox Integration & Conformance Testing (Weeks 6–8)**
  * Onboard pilot UAE clinic/pharmacy, connect to **DHA eClaimLink** / **Riayati Sandbox**, complete conformance test cases, and obtain Go-Live certification.
* **Phase 4: Remittance Automation, Resubmission & Production Launch (Weeks 9–10)**
  * Deploy automated `RemittanceAdvice` polling, denial code analytics, resubmission workflows, and switch tenant disposition to `PRODUCTION`.

---

## 8. Success Metrics (KPIs)
* **First-Pass Claim Acceptance Rate:** $> 95\%$ of submitted XML claims accepted by the government hub without schema or technical validation errors.
* **Clean Claim Rate (Payer Approval):** $> 90\%$ of submitted claim value approved on first submission without medical/coding denial.
* **Eligibility Check Latency:** $< 3\text{ seconds}$ average turnaround time at reception check-in.
* **Denial Recovery Turnaround:** Reduce average rejected claim resubmission time from days to $< 24\text{ hours}$.