"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  UserPlus,
  ArrowLeft,
  IdentificationCard,
  CreditCard,
  CheckCircle,
  CircleNotch,
} from "@phosphor-icons/react";

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient Demographics State
  const [fullName, setFullName] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [dob, setDob] = useState("1990-01-01");
  const [gender, setGender] = useState<"M" | "F" | "OTHER">("M");
  const [phone, setPhone] = useState("+971 ");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("United Arab Emirates");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Optional Insurance Policy
  const [hasInsurance, setHasInsurance] = useState(true);
  const [payerId, setPayerId] = useState("INS-AXA-01");
  const [payerName, setPayerName] = useState("AXA Gulf Insurance");
  const [memberId, setMemberId] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [network, setNetwork] = useState("Comprehensive");
  const [copayPercent, setCopayPercent] = useState(20);
  const [copayCap, setCopayCap] = useState(50);
  const [deductible, setDeductible] = useState(0);
  const [expiryDate, setExpiryDate] = useState("2027-12-31");

  // Format Emirates ID
  const handleEIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const digitsOnly = val.replace(/[^0-9]/g, "");
    if (digitsOnly.startsWith("784") && digitsOnly.length <= 15) {
      if (digitsOnly.length > 3 && digitsOnly.length <= 7) {
        val = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
      } else if (digitsOnly.length > 7 && digitsOnly.length <= 14) {
        val = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
      } else if (digitsOnly.length > 14) {
        val = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7, 14)}-${digitsOnly.slice(14, 15)}`;
      }
    }
    setEmiratesId(val);
  };

  const handlePayerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "INS-AXA-01") {
      setPayerId("INS-AXA-01");
      setPayerName("AXA Gulf Insurance");
    } else if (val === "INS-DAMAN-01") {
      setPayerId("INS-DAMAN-01");
      setPayerName("National Health Insurance (Daman)");
    } else if (val === "INS-SUKOON-01") {
      setPayerId("INS-SUKOON-01");
      setPayerName("Sukoon Insurance (Oman)");
    } else if (val === "INS-MEDNET-01") {
      setPayerId("INS-MEDNET-01");
      setPayerName("Mednet UAE (TPA)");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter the patient's full name");
      return;
    }

    if (!emiratesId.trim() && !passportNo.trim()) {
      toast.error("Either Emirates ID or Passport Number must be provided");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Register Patient
      const patientRes = await api.post("/patients", {
        fullName,
        emiratesId: emiratesId.trim() || undefined,
        passportNo: passportNo.trim() || undefined,
        dob,
        gender,
        phone,
        email: email.trim() || undefined,
        nationality,
        address,
        emergencyContact,
      });

      if (!patientRes.data?.success) {
        throw new Error(patientRes.data?.message || "Failed to register patient");
      }

      const newPatientId = patientRes.data.data.patient.id;

      // 2. Attach Insurance Policy if enabled
      if (hasInsurance && memberId.trim()) {
        await api.post(`/patients/${newPatientId}/policies`, {
          payerId,
          payerName,
          memberId,
          policyNumber: policyNumber || undefined,
          network,
          copayPercent: Number(copayPercent),
          copayCap: Number(copayCap),
          deductible: Number(deductible),
          expiryDate,
        });

        // Trigger immediate live verification
        await api.post(`/patients/${newPatientId}/eligibility/verify`).catch(() => null);
      }

      toast.success("Patient successfully registered and verified!");
      router.push("/reception");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/reception"
          className="text-xs font-medium text-[var(--color-secondary,#94A3B8)] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </Link>
        <span className="text-xs font-mono text-slate-400">
          MoHAP Riayati / Northern Emirates
        </span>
      </div>

      <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl p-6 sm:p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus size={24} className="text-sky-400" />
            Register New Patient
          </h1>
          <p className="text-xs text-[var(--color-secondary,#94A3B8)] mt-1">
            Capture patient identity & link insurance policy for regulatory e-Claims submission
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Identity & Demographics */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary,#94A3B8)] flex items-center gap-2 pb-2 border-b border-[var(--color-border,#243045)]">
              <IdentificationCard size={18} className="text-sky-400" />
              1. Identity & Demographics (FR-1.1)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-300">
                  Full Name (as per Passport / Emirates ID) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mohammed Salem Al Dhaheri"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Emirates ID Number (784-YYYY-NNNNNNN-C)
                </label>
                <input
                  type="text"
                  value={emiratesId}
                  onChange={handleEIDChange}
                  placeholder="784-1990-1234567-1"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Passport Number (for Visitors / Tourists)
                </label>
                <input
                  type="text"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="e.g. N12345678"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.ae"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="United Arab Emirates"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Emergency Contact</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+971 50 999 8877 (Spouse)"
                  className="w-full bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Insurance Policy (FR-1.2 & FR-1.3) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border,#243045)]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary,#94A3B8)] flex items-center gap-2">
                <CreditCard size={18} className="text-sky-400" />
                2. Insurance Policy & Eligibility Coverage
              </h2>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={hasInsurance}
                  onChange={(e) => setHasInsurance(e.target.checked)}
                  className="accent-sky-500 w-4 h-4 rounded"
                />
                Attach Insurance Policy (or uncheck for Self-Pay)
              </label>
            </div>

            {hasInsurance ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--color-bg,#0D1117)] border border-[var(--color-border,#243045)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Insurance Payer / ReceiverID <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={payerId}
                    onChange={handlePayerSelect}
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  >
                    <option value="INS-AXA-01">AXA Gulf Insurance (INS-AXA-01)</option>
                    <option value="INS-DAMAN-01">National Health Insurance - Daman (INS-DAMAN-01)</option>
                    <option value="INS-SUKOON-01">Sukoon Insurance / Oman (INS-SUKOON-01)</option>
                    <option value="INS-MEDNET-01">Mednet UAE (INS-MEDNET-01)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Member ID / Card Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required={hasInsurance}
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="e.g. MEM-AXA-102938"
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Network Tier</label>
                  <input
                    type="text"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder="Comprehensive Plus"
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Policy Expiry Date</label>
                  <input
                    type="date"
                    required={hasInsurance}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Patient Co-Pay (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={copayPercent}
                    onChange={(e) => setCopayPercent(Number(e.target.value))}
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Co-Pay Cap (Max AED)</label>
                  <input
                    type="number"
                    min={0}
                    value={copayCap}
                    onChange={(e) => setCopayCap(Number(e.target.value))}
                    className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] focus:border-sky-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-300">
                Self-Pay Billing Selected: Patient will be marked as non-insured. All consultation and medical services will be billed directly to the patient at standard tariff.
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[var(--color-border,#243045)] flex items-center justify-end gap-3">
            <Link
              href="/reception"
              className="px-5 py-2.5 rounded-lg border border-[var(--color-border,#243045)] hover:bg-[var(--color-surface-raised,#202A3E)] text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <CircleNotch size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Complete Registration & Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
