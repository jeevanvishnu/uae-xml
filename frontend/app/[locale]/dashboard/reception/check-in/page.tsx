"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useReception } from "@/app/context/ReceptionContext";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  IdentificationCard,
  CreditCard,
  Money,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  SimCard,
  UserPlus,
  CircleNotch,
  Printer,
  Sparkle,
  Stethoscope,
  Buildings,
  User,
  CaretDown,
} from "@phosphor-icons/react";

// Mock database of returning patients for instant search
const RETURNING_PATIENTS = [
  {
    fullName: "Sultan Khalfan Al-Suwaidi",
    emiratesId: "784-1982-1928374-1",
    phone: "+971 50 123 4567",
    dob: "1982-05-14",
    gender: "Male" as const,
    nationality: "United Arab Emirates",
    payerName: "National Health Insurance (Daman)",
    payerId: "INS-DAMAN-01",
    memberId: "DAM-882190-01",
    network: "Enhanced Tier 1",
    copayPercent: 10,
    copayCap: 30,
  },
  {
    fullName: "Amina Abdulla Al-Zaabi",
    emiratesId: "784-1991-8899221-5",
    phone: "+971 52 987 6543",
    dob: "1991-08-22",
    gender: "Female" as const,
    nationality: "United Arab Emirates",
    payerName: "Sukoon Insurance (Oman)",
    payerId: "INS-SUKOON-01",
    memberId: "SUK-664421-00",
    network: "Comprehensive Plus",
    copayPercent: 20,
    copayCap: 50,
  },
  {
    fullName: "Rajesh Kumar Nair",
    emiratesId: "784-1988-5544332-9",
    phone: "+971 55 432 1098",
    dob: "1988-12-03",
    gender: "Male" as const,
    nationality: "India",
    payerName: "MedNet UAE (TPA)",
    payerId: "INS-MEDNET-01",
    memberId: "MDN-109283-04",
    network: "Standard Network",
    copayPercent: 20,
    copayCap: 50,
  },
  {
    fullName: "Fatima Noor Al-Hashemi",
    emiratesId: "784-1995-6543210-9",
    phone: "+971 50 918 3344",
    dob: "1995-09-14",
    gender: "Female" as const,
    nationality: "United Arab Emirates",
    payerName: "AXA Gulf Insurance",
    payerId: "INS-AXA-01",
    memberId: "AXA-882310-99",
    network: "MedNet Gold",
    copayPercent: 20,
    copayCap: 50,
  },
];

interface EligibilityResult {
  verified: boolean;
  status: "ACTIVE" | "INACTIVE";
  hubTxnId: string;
  verifiedAt: string;
  payerName: string;
  memberId: string;
  network: string;
  copayPercent: number;
  copayCap: number;
  deductible: number;
  preAuthRequired: boolean;
  remarks: string;
}

export default function DashboardPatientCheckInPage() {
  const router = useRouter();
  const { doctors, checkInPatient, setSelectedReceipt } = useReception();

  // Instant Search & EID state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Patient Demographics State
  const [fullName, setFullName] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [phone, setPhone] = useState("+971 ");
  const [dob, setDob] = useState("1992-06-15");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [nationality, setNationality] = useState("United Arab Emirates");
  const [visitPriority, setVisitPriority] = useState<"NORMAL" | "PRIORITY" | "URGENT">("NORMAL");

  // Insurance & Eligibility State
  const [isCashPatient, setIsCashPatient] = useState(false);
  const [payerId, setPayerId] = useState("INS-DAMAN-01");
  const [payerName, setPayerName] = useState("National Health Insurance (Daman)");
  const [memberId, setMemberId] = useState("DAM-882190-01");
  const [network, setNetwork] = useState("Enhanced Tier 1");
  const [copayPercent, setCopayPercent] = useState<number>(10);
  const [copayCap, setCopayCap] = useState<number>(50);

  // Verification Engine State
  const [isVerifying, setIsVerifying] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  // Doctor & Co-Pay Collection State
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "doc-1");
  const [reasonForVisit, setReasonForVisit] = useState("General consultation & follow-up");
  const [paymentMethod, setPaymentMethod] = useState<"Card" | "Cash" | "Waived">("Card");
  const [collectedAmount, setCollectedAmount] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Auto-format Emirates ID input (784-YYYY-NNNNNNN-C)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setSearchQuery(val);
    setShowSearchResults(val.length > 2);
  };

  const handleEIDInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Select Returning Patient
  const selectReturningPatient = (patient: (typeof RETURNING_PATIENTS)[0]) => {
    setFullName(patient.fullName);
    setEmiratesId(patient.emiratesId);
    setPhone(patient.phone);
    setDob(patient.dob);
    setGender(patient.gender);
    setNationality(patient.nationality);

    setIsCashPatient(false);
    setPayerId(patient.payerId);
    setPayerName(patient.payerName);
    setMemberId(patient.memberId);
    setNetwork(patient.network);
    setCopayPercent(patient.copayPercent);
    setCopayCap(patient.copayCap);

    const baseFee = selectedDoctor ? selectedDoctor.consultationFee : 300;
    const calcCopay = Math.min(patient.copayCap, (baseFee * patient.copayPercent) / 100);
    setCollectedAmount(calcCopay);

    setEligibilityResult(null);
    setShowSearchResults(false);
    setSearchQuery(patient.fullName);
    toast.success(`Loaded profile for ${patient.fullName}`);
  };

  // Smart Card Reader Simulation (USB EID reader)
  const handleSmartCardInsert = () => {
    toast.loading("Reading UAE Emirates ID Smart Card via ICA Chip...", { id: "eid-chip" });
    setTimeout(() => {
      const demo = RETURNING_PATIENTS[0];
      selectReturningPatient(demo);
      toast.success("Emirates ID Smart Card Read Successfully!", {
        id: "eid-chip",
        description: `Verified biometric record: ${demo.fullName} (${demo.emiratesId})`,
      });
    }, 900);
  };

  // Switch Payer
  const handlePayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPayerId(val);
    setEligibilityResult(null);

    if (val === "INS-DAMAN-01") {
      setPayerName("National Health Insurance (Daman)");
      setNetwork("Enhanced Tier 1");
      setCopayPercent(10);
      setCopayCap(30);
      setCollectedAmount(30);
    } else if (val === "INS-SUKOON-01") {
      setPayerName("Sukoon Insurance (Oman Insurance)");
      setNetwork("Comprehensive Plus");
      setCopayPercent(20);
      setCopayCap(50);
      setCollectedAmount(50);
    } else if (val === "INS-THIQA-01") {
      setPayerName("Thiqa (Daman Government)");
      setNetwork("Full UAE Network");
      setCopayPercent(0);
      setCopayCap(0);
      setPaymentMethod("Waived");
      setCollectedAmount(0);
    } else if (val === "INS-AXA-01") {
      setPayerName("AXA Gulf Insurance");
      setNetwork("MedNet Gold");
      setCopayPercent(20);
      setCopayCap(50);
      setCollectedAmount(50);
    } else if (val === "INS-MEDNET-01") {
      setPayerName("MedNet UAE (TPA)");
      setNetwork("Standard Network");
      setCopayPercent(20);
      setCopayCap(50);
      setCollectedAmount(50);
    }
  };

  // Toggle Cash / Self Pay
  const handleToggleCash = (isCash: boolean) => {
    setIsCashPatient(isCash);
    setEligibilityResult(null);
    if (isCash) {
      setPayerName("Self-Pay / Cash Patient");
      setPayerId("CASH");
      setMemberId("N/A");
      setCopayPercent(100);
      setPaymentMethod("Cash");
      setCollectedAmount(selectedDoctor ? selectedDoctor.consultationFee : 300);
    } else {
      setPayerId("INS-DAMAN-01");
      setPayerName("National Health Insurance (Daman)");
      setMemberId("DAM-882190-01");
      setCopayPercent(10);
      setPaymentMethod("Card");
      setCollectedAmount(30);
    }
  };

  // Doctor change handler
  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find((d) => d.id === docId);
    if (!doc) return;

    if (isCashPatient) {
      setCollectedAmount(doc.consultationFee);
    } else if (payerId === "INS-THIQA-01") {
      setCollectedAmount(0);
    } else {
      const calc = Math.min(copayCap, (doc.consultationFee * copayPercent) / 100);
      setCollectedAmount(calc);
    }
  };

  // Real-Time Live Eligibility Verification Handshake
  const handleVerifyEligibility = () => {
    if (!memberId.trim() && !isCashPatient) {
      toast.error("Please enter a valid Member ID / Card Number");
      return;
    }

    setIsVerifying(true);
    toast.loading("Connecting to DHA eClaimLink / Riayati Hub...", { id: "hub-verify" });

    setTimeout(() => {
      setIsVerifying(false);
      const isEligible = memberId !== "INVALID";

      if (isEligible) {
        setEligibilityResult({
          verified: true,
          status: "ACTIVE",
          hubTxnId: `DHA-ELIG-${Math.floor(100000 + Math.random() * 900000)}`,
          verifiedAt: new Date().toLocaleTimeString("en-AE", { timeZone: "Asia/Dubai" }),
          payerName,
          memberId,
          network,
          copayPercent,
          copayCap,
          deductible: 0,
          preAuthRequired: false,
          remarks: "Outpatient Consultation Approved with standard policy co-insurance.",
        });

        toast.success("Policy Verified: Active & Eligible", {
          id: "hub-verify",
          description: `Hub Confirmed: ${payerName} &bull; Co-Pay: ${copayPercent}% (Cap: ${copayCap} AED)`,
        });
      } else {
        setEligibilityResult({
          verified: true,
          status: "INACTIVE",
          hubTxnId: `DHA-ELIG-ERR-${Math.floor(100000 + Math.random() * 900000)}`,
          verifiedAt: new Date().toLocaleTimeString("en-AE", { timeZone: "Asia/Dubai" }),
          payerName,
          memberId,
          network,
          copayPercent: 100,
          copayCap: 0,
          deductible: 0,
          preAuthRequired: true,
          remarks: "Policy suspended due to premium arrears or invalid Emirates ID pairing.",
        });

        toast.error("Policy Rejected / Inactive", {
          id: "hub-verify",
          description: "Patient must settle as Cash or contact insurer.",
        });
      }
    }, 1200);
  };

  // Final Action: Check-In & Print Receipt
  const handleCheckInAndPrint = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter patient full name");
      return;
    }

    if (!emiratesId.trim()) {
      toast.error("Please enter a valid 15-digit Emirates ID");
      return;
    }

    setIsSubmitting(true);

    try {
      const { patient, receipt } = checkInPatient({
        patientName: fullName.trim(),
        emiratesId: emiratesId.trim(),
        phone: phone.trim() || "+971 50 000 0000",
        dob,
        gender,
        priority: visitPriority,
        visitType: "Walk-In",
        insuranceStatus: isCashPatient ? "CASH" : "ACTIVE",
        payerName: isCashPatient ? "Self-Pay / Cash Patient" : payerName,
        payerId: isCashPatient ? "CASH" : payerId,
        memberId: isCashPatient ? "N/A" : memberId,
        network: isCashPatient ? "Direct Settlement" : network,
        copayPercent: isCashPatient ? 100 : copayPercent,
        copayAmount: collectedAmount,
        paymentMethod,
        paymentStatus: paymentMethod === "Waived" ? "WAIVED" : "COLLECTED",
        assignedDoctorId: selectedDoctor.id,
        assignedDoctorName: selectedDoctor.name,
        department: selectedDoctor.specialty.split("&")[0].trim(),
        roomNumber: selectedDoctor.roomNumber,
        notes: reasonForVisit,
      });

      toast.success(`Check-In Completed! Token: ${patient.tokenNumber}`, {
        description: `Assigned to ${selectedDoctor.name} (${selectedDoctor.roomNumber}).`,
      });

      setSelectedReceipt(receipt);

      setTimeout(() => {
        router.push("/dashboard/reception");
      }, 700);
    } catch (err: any) {
      toast.error("Failed to complete check-in: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchedPatients = RETURNING_PATIENTS.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.emiratesId.includes(searchQuery) ||
      p.phone.includes(searchQuery)
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Patient Check-In &amp; Eligibility
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time DHA eClaimLink eligibility check, doctor dispatch, and upfront co-pay collection.
          </p>
        </div>

        {/* Smart Card CTA Button */}
        <button
          type="button"
          onClick={handleSmartCardInsert}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200/90 text-xs font-semibold shadow-xs hover:border-blue-300 transition-all cursor-pointer self-start md:self-auto"
        >
          <SimCard size={18} weight="bold" className="text-blue-600" />
          <span>Insert Emirates ID (Smart Card)</span>
        </button>
      </div>

      {/* 1. Instant Patient Search Card */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs relative">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <MagnifyingGlass size={16} className="text-blue-600" />
            <span>Instant Patient Search (Returning Patients)</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Type Emirates ID (784-XXXX-XXXXXXX-X) or Mobile Number
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setShowSearchResults(searchQuery.length > 1)}
            placeholder="Search by 784-XXXX-XXXXXXX-X, Mobile (+971 50...), or Patient Name..."
            className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕ Clear
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSearchResults && matchedPatients.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
              <div className="px-4 py-2.5 bg-[#F6F8FA] text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Matched UAE Registered Patients ({matchedPatients.length})
              </div>
              {matchedPatients.map((patient) => (
                <div
                  key={patient.emiratesId}
                  onClick={() => selectReturningPatient(patient)}
                  className="p-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {patient.fullName}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-700 font-semibold">{patient.emiratesId}</span>
                      <span>&bull;</span>
                      <span>{patient.phone}</span>
                      <span>&bull;</span>
                      <span className="text-blue-600 font-medium">{patient.payerName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      {patient.copayPercent}% Co-Pay
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">Click to auto-populate</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleCheckInAndPrint} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Patient Demographics & Live Eligibility */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Patient Demographics */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IdentificationCard size={18} className="text-blue-600" />
                <span>Patient Demographics</span>
              </h2>
              <span className="text-[11px] text-slate-400">Identity details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Full Name (as per Emirates ID) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sultan Khalfan Al-Suwaidi"
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Emirates ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Emirates ID (784-XXXX-XXXXXXX-X) *
                </label>
                <input
                  type="text"
                  required
                  value={emiratesId}
                  onChange={handleEIDInput}
                  placeholder="784-1988-1234567-1"
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-semibold placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* DOB */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="Male">Male (ذكر)</option>
                  <option value="Female">Female (أنثى)</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Triage Priority
                </label>
                <select
                  value={visitPriority}
                  onChange={(e) => setVisitPriority(e.target.value as any)}
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="NORMAL">Normal Queue</option>
                  <option value="PRIORITY">Priority (Elderly / Children)</option>
                  <option value="URGENT">Urgent / Acute Care</option>
                </select>
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nationality
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card: Insurance & Live Eligibility */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <span>Insurance &amp; Live Hub Eligibility</span>
              </h2>

              {/* Cash vs Insurance Toggle */}
              <div className="flex items-center gap-1 bg-[#EFF2F6] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleToggleCash(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isCashPatient
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Insurance
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCash(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCashPatient
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Self-Pay / Cash
                </button>
              </div>
            </div>

            {!isCashPatient ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Payer Select */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Insurance Payer *
                    </label>
                    <select
                      value={payerId}
                      onChange={handlePayerChange}
                      className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="INS-DAMAN-01">National Health Insurance (Daman)</option>
                      <option value="INS-SUKOON-01">Sukoon Insurance (Oman Insurance)</option>
                      <option value="INS-THIQA-01">Thiqa (Daman Government - 100%)</option>
                      <option value="INS-AXA-01">AXA Gulf / GIG Insurance</option>
                      <option value="INS-MEDNET-01">MedNet UAE (TPA)</option>
                    </select>
                  </div>

                  {/* Member ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Member ID / Policy Number *
                    </label>
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. DAM-882190-01"
                      className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-semibold placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Network Tier */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Network Tier
                    </label>
                    <input
                      type="text"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Co-Pay % */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Co-Pay Share (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={copayPercent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCopayPercent(val);
                          const fee = selectedDoctor ? selectedDoctor.consultationFee : 300;
                          setCollectedAmount(Math.min(copayCap, (fee * val) / 100));
                        }}
                        className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                      <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Live Eligibility Verification Trigger Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifyEligibility}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <CircleNotch size={16} className="animate-spin" />
                        <span>Verifying with DHA eClaimLink Gateway...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} weight="bold" />
                        <span>Verify Eligibility (DHA / Riayati)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Eligibility Result Banner */}
                {eligibilityResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      eligibilityResult.status === "ACTIVE"
                        ? "bg-blue-50/70 border-blue-200 text-blue-950"
                        : "bg-red-50 border-red-200 text-red-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {eligibilityResult.status === "ACTIVE" ? (
                          <>
                            <CheckCircle size={18} weight="fill" className="text-blue-600" />
                            <span className="text-blue-800">ELIGIBLE &amp; ACTIVE POLICY</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} weight="fill" className="text-red-600" />
                            <span className="text-red-800">POLICY INACTIVE / REJECTED</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        Ref: {eligibilityResult.hubTxnId}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">{eligibilityResult.remarks}</p>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Co-Pay:</span>
                        <span className="font-bold text-slate-900">{eligibilityResult.copayPercent}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Deductible:</span>
                        <span className="font-bold text-slate-900">{eligibilityResult.deductible} AED</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Pre-Auth:</span>
                        <span className="font-bold text-slate-900">
                          {eligibilityResult.preAuthRequired ? "Required" : "Not Required"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Cash Patient Explanation */
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold text-amber-800 flex items-center gap-2">
                  <Money size={18} weight="bold" />
                  <span>Self-Pay / Cash Billing Selected</span>
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Patient is paying directly without insurance claim submission. A standard Tax Invoice with clinic TRN will be generated.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Assign Doctor & Collect Co-Pay */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope size={18} className="text-blue-600" />
                <span>Doctor Assignment &amp; Co-Pay</span>
              </h2>
              <span className="text-[11px] text-slate-400">Queue dispatch</span>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Assign Doctor &amp; Suite *
              </label>
              <div className="space-y-2">
                {doctors.map((doc) => {
                  const isSelected = doc.id === selectedDoctorId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleDoctorChange(doc.id)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/70 border-2 border-blue-600 text-slate-900 shadow-sm"
                          : "bg-[#F6F8FA] border-slate-200/80 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{doc.name}</span>
                        <span className="font-mono text-[11px] text-blue-700 font-bold">
                          {doc.consultationFee} AED
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.specialty}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                        <span className="font-medium text-slate-600">{doc.roomNumber}</span>
                        <span
                          className={`font-semibold ${
                            doc.status === "AVAILABLE" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          &bull; {doc.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visit Reason */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Chief Complaint / Reason for Visit
              </label>
              <input
                type="text"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. Acute migraine, routine follow-up"
                className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Co-Pay Calculation Box */}
            <div className="p-4 rounded-2xl bg-[#F6F8FA] border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Consultation Standard Fee:</span>
                <span className="font-mono text-slate-900 font-bold">
                  {selectedDoctor ? selectedDoctor.consultationFee.toFixed(2) : "300.00"} AED
                </span>
              </div>

              {!isCashPatient && (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span className="font-medium">Insurance Share ({100 - copayPercent}%):</span>
                  <span className="font-mono font-bold">
                    -
                    {(
                      (selectedDoctor ? selectedDoctor.consultationFee : 300) - collectedAmount
                    ).toFixed(2)}{" "}
                    AED
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Amount to Collect:</span>
                  <span className="text-[10px] text-slate-500">
                    {isCashPatient ? "100% Patient Cash" : `Patient Co-Pay (${copayPercent}%)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                    className="w-24 bg-white border-2 border-blue-600 rounded-lg px-2.5 py-1 text-sm font-black font-mono text-blue-700 text-right focus:outline-none shadow-xs"
                  />
                  <span className="text-xs text-slate-700 font-mono font-bold">AED</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Payment Channel *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Card")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === "Card"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-[#F6F8FA] border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <CreditCard size={18} />
                  <span>Card (POS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("Cash")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === "Cash"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-[#F6F8FA] border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Money size={18} />
                  <span>Cash Drawer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("Waived");
                    setCollectedAmount(0);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === "Waived"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-[#F6F8FA] border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <ShieldCheck size={18} />
                  <span>0 AED / Waived</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    <span>Processing Check-In...</span>
                  </>
                ) : (
                  <>
                    <Printer size={18} weight="bold" />
                    <span>Check-In &amp; Print Receipt</span>
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-2">
                Generates queue token, notifies {selectedDoctor.name}, and prints thermal docket.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
