"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Stethoscope,
  ArrowLeft,
  User,
  ShieldCheck,
  CreditCard,
  Plus,
  Trash,
  CheckCircle,
  WarningCircle,
  MagnifyingGlass,
  FloppyDisk,
  PaperPlaneTilt,
  Pill,
  Lock,
} from "@phosphor-icons/react";

interface Diagnosis {
  code: string;
  description: string;
  type: "Principal" | "Secondary";
}

interface Activity {
  id: string;
  type: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gross: number;
  patientShare: number;
  net: number;
}

interface EncounterData {
  id: string;
  encounterType: string;
  startTime: string;
  endTime?: string;
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  claimStatus: "DRAFT" | "READY" | "SUBMITTED" | "APPROVED" | "REJECTED";
  paymentStatus: "UNPAID" | "COLLECTED" | "WAIVED";
  diagnoses: Diagnosis[];
  activities: Activity[];
  clinicalNotes: string;
  patient: {
    id: string;
    fullName: string;
    emiratesId?: string;
    dob: string;
    gender: string;
    phone: string;
  };
  policy?: {
    id: string;
    payerName: string;
    memberId: string;
    network: string;
    copayPercent: number;
    copayCap: number;
    eligibilityStatus: string;
  };
  clinician?: {
    id: string;
    name: string;
    licenseNo: string;
    specialty: string;
  };
  prescriptions?: any[];
}

export default function DoctorEncounterWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [encounter, setEncounter] = useState<EncounterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Editable state
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Search autocompletes
  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<any[]>([]);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);

  const [cptQuery, setCptQuery] = useState("");
  const [cptResults, setCptResults] = useState<any[]>([]);
  const [isSearchingCpt, setIsSearchingCpt] = useState(false);

  // eRx Modal State
  const [showErxModal, setShowErxModal] = useState(false);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([]);
  const [isIssuingErx, setIsIssuingErx] = useState(false);

  const fetchEncounter = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/encounters/${id}`);
      if (res.data?.success) {
        const enc = res.data.data.encounter;
        setEncounter(enc);
        setClinicalNotes(enc.clinicalNotes || "");
        setDiagnoses(enc.diagnoses || []);
        setActivities(enc.activities || []);
      }
    } catch (err: any) {
      toast.error("Failed to load encounter workspace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEncounter();
  }, [id]);

  // Recalculate local financials whenever activities change
  const calculateTotals = () => {
    const isInsured = encounter?.policy?.eligibilityStatus === "ACTIVE";
    const copayPercent = isInsured ? encounter?.policy?.copayPercent || 20 : 100;
    const copayCap = isInsured ? encounter?.policy?.copayCap || Infinity : Infinity;

    let totGross = 0;
    let totPtShare = 0;

    const recalculated = activities.map((act) => {
      const qty = Math.max(1, Number(act.quantity) || 1);
      const price = Math.max(0, Number(act.unitPrice) || 0);
      const gross = Math.round(qty * price);

      let ptShare = 0;
      if (isInsured) {
        ptShare = Math.min(Math.round((gross * copayPercent) / 100), copayCap);
      } else {
        ptShare = gross;
      }
      const net = gross - ptShare;

      totGross += gross;
      totPtShare += ptShare;

      return {
        ...act,
        quantity: qty,
        unitPrice: price,
        gross,
        patientShare: ptShare,
        net,
      };
    });

    if (isInsured && copayCap < Infinity && totPtShare > copayCap) {
      totPtShare = copayCap;
    }
    const totNet = totGross - totPtShare;

    return { recalculated, totGross, totPtShare, totNet };
  };

  // Search ICD-10
  useEffect(() => {
    if (icdQuery.trim().length < 2) {
      setIcdResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingIcd(true);
      try {
        const res = await api.get(`/codes/icd10?q=${encodeURIComponent(icdQuery)}`);
        if (res.data?.success) {
          setIcdResults(res.data.data.codes || []);
        }
      } catch (err) {
        // silent
      } finally {
        setIsSearchingIcd(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [icdQuery]);

  // Search CPT
  useEffect(() => {
    if (cptQuery.trim().length < 2) {
      setCptResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCpt(true);
      try {
        const res = await api.get(`/codes/cpt?q=${encodeURIComponent(cptQuery)}`);
        if (res.data?.success) {
          setCptResults(res.data.data.codes || []);
        }
      } catch (err) {
        // silent
      } finally {
        setIsSearchingCpt(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [cptQuery]);

  // Search Drugs
  useEffect(() => {
    if (drugQuery.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/codes/drugs?q=${encodeURIComponent(drugQuery)}`);
        if (res.data?.success) {
          setDrugResults(res.data.data.codes || []);
        }
      } catch (err) {
        // silent
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [drugQuery]);

  const addPrescribedMed = (drug: any) => {
    setPrescribedMeds([
      ...prescribedMeds,
      {
        drugCode: drug.drugCode,
        tradeName: drug.tradeName,
        genericName: drug.genericName,
        dosage: drug.strength || "500mg",
        frequency: "BID",
        duration: 7,
        quantity: 14,
        unitPrice: 35,
        instructions: "Take after meals",
      },
    ]);
    setDrugQuery("");
    setDrugResults([]);
  };

  const handleIssueErx = async () => {
    if (prescribedMeds.length === 0) {
      toast.warning("Please add at least one medication.");
      return;
    }
    setIsIssuingErx(true);
    try {
      const res = await api.post("/prescriptions", {
        encounterId: id,
        medications: prescribedMeds,
      });
      if (res.data?.success) {
        toast.success(`e-Prescription published! Ref: ${res.data.data.prescription.erxRefNo}`);
        setShowErxModal(false);
        setPrescribedMeds([]);
        fetchEncounter();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create eRx");
    } finally {
      setIsIssuingErx(false);
    }
  };

  const addDiagnosis = (codeObj: any) => {
    // If there is no principal diagnosis yet, mark first one as Principal
    const isFirst = diagnoses.length === 0;
    const exists = diagnoses.some((d) => d.code === codeObj.code);
    if (exists) {
      toast.warning("Diagnosis already added.");
      return;
    }
    setDiagnoses([
      ...diagnoses,
      {
        code: codeObj.code,
        description: codeObj.description,
        type: isFirst ? "Principal" : "Secondary",
      },
    ]);
    setIcdQuery("");
    setIcdResults([]);
  };

  const removeDiagnosis = (code: string) => {
    setDiagnoses(diagnoses.filter((d) => d.code !== code));
  };

  const toggleDiagnosisType = (code: string) => {
    setDiagnoses(
      diagnoses.map((d) => {
        if (d.code === code) {
          return {
            ...d,
            type: d.type === "Principal" ? "Secondary" : "Principal",
          };
        }
        // If we set this one to Principal, make others Secondary to prevent conflicts
        return {
          ...d,
          type: "Secondary",
        };
      })
    );
  };

  const addActivity = (cptObj: any) => {
    const nextIdx = activities.length + 1;
    const actId = `ACT-${String(nextIdx).padStart(3, "0")}`;
    const qty = 1;
    const unitPrice = cptObj.standardPrice || 100;
    const gross = qty * unitPrice;
    const isInsured = encounter?.policy?.eligibilityStatus === "ACTIVE";
    const copayPercent = isInsured ? encounter?.policy?.copayPercent || 20 : 100;
    const ptShare = isInsured ? Math.round((gross * copayPercent) / 100) : gross;
    const net = gross - ptShare;

    setActivities([
      ...activities,
      {
        id: actId,
        type: "3", // CPT procedure
        code: cptObj.code,
        description: cptObj.description,
        quantity: qty,
        unitPrice,
        gross,
        patientShare: ptShare,
        net,
      },
    ]);
    setCptQuery("");
    setCptResults([]);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const updateActivityRow = (id: string, field: "quantity" | "unitPrice", val: number) => {
    setActivities(
      activities.map((a) => {
        if (a.id === id) {
          const qty = field === "quantity" ? Math.max(1, val) : a.quantity;
          const price = field === "unitPrice" ? Math.max(0, val) : a.unitPrice;
          const gross = qty * price;
          const isInsured = encounter?.policy?.eligibilityStatus === "ACTIVE";
          const copayPercent = isInsured ? encounter?.policy?.copayPercent || 20 : 100;
          const ptShare = isInsured ? Math.round((gross * copayPercent) / 100) : gross;
          const net = gross - ptShare;

          return {
            ...a,
            quantity: qty,
            unitPrice: price,
            gross,
            patientShare: ptShare,
            net,
          };
        }
        return a;
      })
    );
  };

  // Save Progress
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put(`/encounters/${id}`, {
        clinicalNotes,
        diagnoses,
        activities,
      });
      if (res.data?.success) {
        toast.success("Encounter progress saved");
        fetchEncounter();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save encounter");
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize Encounter (Locks and marks READY for Claim Generation)
  const handleFinalize = async () => {
    const hasPrincipal = diagnoses.some((d) => d.type === "Principal");
    if (!hasPrincipal) {
      toast.error("Regulatory Rule: A Principal ICD-10 diagnosis is mandatory!");
      return;
    }
    if (activities.length === 0) {
      toast.error("Regulatory Rule: At least one CPT activity is required!");
      return;
    }

    setIsFinalizing(true);
    try {
      // First save changes
      await api.put(`/encounters/${id}`, {
        clinicalNotes,
        diagnoses,
        activities,
      });

      // Then finalize
      const res = await api.put(`/encounters/${id}/finalize`);
      if (res.data?.success) {
        toast.success("Encounter finalized and queued for Billing/Claims!");
        fetchEncounter();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to finalize encounter");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading || !encounter) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-400">
        Loading encounter details...
      </div>
    );
  }

  const { totGross, totPtShare, totNet } = calculateTotals();
  const isLocked = encounter.claimStatus !== "DRAFT";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/doctor"
            className="p-2 rounded-lg bg-[var(--color-surface,#161B22)] hover:bg-[var(--color-surface-raised,#202A3E)] border border-[var(--color-border,#243045)] text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                Clinical Consultation & Coding
              </h1>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  encounter.claimStatus === "READY"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                }`}
              >
                {encounter.claimStatus}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted,#64748B)]">
              Encounter ID: <span className="font-mono text-slate-300">{encounter.id}</span> &bull; {encounter.encounterType}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowErxModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer"
          >
            <Pill size={16} />
            e-Prescribe (eRx)
          </button>

          {!isLocked ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-[var(--color-border,#243045)] transition-all cursor-pointer"
              >
                <FloppyDisk size={16} />
                {isSaving ? "Saving..." : "Save Progress"}
              </button>

              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <PaperPlaneTilt size={16} weight="bold" />
                {isFinalizing ? "Finalizing..." : "Finalize & Send to Billing"}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <Lock size={16} weight="fill" />
              Finalized for Claims Submission
            </div>
          )}
        </div>
      </div>

      {/* Patient & Policy Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Info */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <User size={22} weight="duotone" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">
              {encounter.patient.fullName}
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              EID: {encounter.patient.emiratesId || "N/A (Passport/Self-Pay)"}
            </div>
            <div className="text-[11px] text-[var(--color-muted,#64748B)] mt-1">
              DOB: {new Date(encounter.patient.dob).toLocaleDateString()} &bull; {encounter.patient.gender === "M" ? "Male" : "Female"} &bull; {encounter.patient.phone}
            </div>
          </div>
        </div>

        {/* Policy Coverage */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={22} weight="duotone" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-sm">
                {encounter.policy?.payerName || "Self-Pay / Cash Patient"}
              </div>
              {encounter.policy && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {encounter.policy.eligibilityStatus}
                </span>
              )}
            </div>
            {encounter.policy ? (
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                Member: {encounter.policy.memberId} &bull; Network: {encounter.policy.network}
              </div>
            ) : (
              <div className="text-xs text-amber-300 mt-0.5">No active insurance policy</div>
            )}
            <div className="text-[11px] text-sky-400 font-mono mt-1">
              Copay Rule: {encounter.policy ? `${encounter.policy.copayPercent}% (Cap: ${encounter.policy.copayCap} AED)` : "100% Patient Share"}
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Stethoscope size={22} weight="duotone" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">
              {encounter.clinician?.name || "Dr. Tariq Al Hashimi"}
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              License: {encounter.clinician?.licenseNo || "MOH-DOC-4421"}
            </div>
            <div className="text-[11px] text-[var(--color-muted,#64748B)] mt-1">
              Specialty: {encounter.clinician?.specialty || "Internal Medicine"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Clinical Coding & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Diagnoses (ICD-10) & Clinical Notes */}
        <div className="space-y-6">
          {/* ICD-10 Coding Box */}
          <div className="bg-[var(--color-surface,#161B22)] p-5 rounded-xl border border-[var(--color-border,#243045)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Medical Diagnoses (ICD-10-CM)</span>
                  <span className="text-[10px] text-amber-400 font-normal">
                    *1 Principal Required
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--color-muted,#64748B)]">
                  Classify primary reason for encounter and any secondary conditions.
                </p>
              </div>
            </div>

            {/* ICD-10 Search Input */}
            {!isLocked && (
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search ICD-10 by code or disease (e.g., E11.9, Hypertension)..."
                  value={icdQuery}
                  onChange={(e) => setIcdQuery(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-sky-500"
                />

                {/* Autocomplete Dropdown */}
                {icdResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-[var(--color-surface-raised,#1C2433)] border border-sky-500/40 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[var(--color-border,#243045)]">
                    {icdResults.map((code) => (
                      <div
                        key={code.code}
                        onClick={() => addDiagnosis(code)}
                        className="p-2.5 hover:bg-sky-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-sky-400 mr-2">
                            {code.code}
                          </span>
                          <span className="text-slate-200">{code.description}</span>
                        </div>
                        <Plus size={14} className="text-sky-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Diagnoses List */}
            <div className="space-y-2">
              {diagnoses.length === 0 ? (
                <div className="p-4 rounded-lg bg-[var(--color-surface-raised,#192131)]/50 border border-dashed border-amber-500/30 text-center text-xs text-amber-300/80">
                  No ICD-10 diagnoses recorded. Riayati claims require at least one Principal diagnosis.
                </div>
              ) : (
                diagnoses.map((diag) => (
                  <div
                    key={diag.code}
                    className="p-3 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => !isLocked && toggleDiagnosisType(diag.code)}
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded cursor-pointer transition-all ${
                          diag.type === "Principal"
                            ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                            : "bg-slate-700/50 text-slate-300 hover:text-white"
                        }`}
                      >
                        {diag.type}
                      </button>
                      <div>
                        <span className="font-mono font-bold text-sky-300 mr-2">
                          {diag.code}
                        </span>
                        <span className="text-slate-300">{diag.description}</span>
                      </div>
                    </div>

                    {!isLocked && (
                      <button
                        onClick={() => removeDiagnosis(diag.code)}
                        className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="bg-[var(--color-surface,#161B22)] p-5 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
            <h3 className="text-sm font-bold text-white">
              Doctor Clinical Documentation
            </h3>
            <textarea
              rows={6}
              disabled={isLocked}
              placeholder="Record chief complaint, vital signs, physical exam findings, differential diagnosis, and treatment plan..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-3 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Right Column: CPT Procedures & Tariff Breakdown */}
        <div className="space-y-6">
          <div className="bg-[var(--color-surface,#161B22)] p-5 rounded-xl border border-[var(--color-border,#243045)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Procedures & Services (CPT / Type 3)</span>
                </h3>
                <p className="text-[11px] text-[var(--color-muted,#64748B)]">
                  Add billable consultations, diagnostics, or procedures.
                </p>
              </div>
            </div>

            {/* CPT Search Input */}
            {!isLocked && (
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search CPT codes (e.g., 99213 Consultation, 80053 Panel)..."
                  value={cptQuery}
                  onChange={(e) => setCptQuery(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-sky-500"
                />

                {/* Autocomplete Dropdown */}
                {cptResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-[var(--color-surface-raised,#1C2433)] border border-sky-500/40 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[var(--color-border,#243045)]">
                    {cptResults.map((cpt) => (
                      <div
                        key={cpt.code}
                        onClick={() => addActivity(cpt)}
                        className="p-2.5 hover:bg-sky-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-emerald-400 mr-2">
                            {cpt.code}
                          </span>
                          <span className="text-slate-200">{cpt.description}</span>
                          <span className="ml-2 font-mono text-slate-400">
                            ({cpt.standardPrice} AED)
                          </span>
                        </div>
                        <Plus size={14} className="text-sky-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activities Table */}
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="p-4 rounded-lg bg-[var(--color-surface-raised,#192131)]/50 border border-dashed border-[var(--color-border,#243045)] text-center text-xs text-slate-400">
                  No billable activities attached yet.
                </div>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 mr-2">
                          {act.id}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 mr-2">
                          CPT {act.code}
                        </span>
                        <span className="text-slate-200 font-medium">{act.description}</span>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => removeActivity(act.id)}
                          className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>

                    {/* Inputs & Financial split */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border,#243045)]/60 items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Qty</span>
                        <input
                          type="number"
                          min="1"
                          disabled={isLocked}
                          value={act.quantity}
                          onChange={(e) =>
                            updateActivityRow(act.id, "quantity", parseInt(e.target.value) || 1)
                          }
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Unit (AED)</span>
                        <input
                          type="number"
                          min="0"
                          disabled={isLocked}
                          value={act.unitPrice}
                          onChange={(e) =>
                            updateActivityRow(act.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Patient Share</span>
                        <div className="font-mono text-amber-300 font-bold px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                          {act.patientShare} AED
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Net Insurer</span>
                        <div className="font-mono text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          {act.net} AED
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary Box */}
            <div className="bg-[var(--color-surface-raised,#1C2433)] p-4 rounded-xl border border-sky-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Total Gross Amount:</span>
                <span className="font-mono font-bold text-white text-sm">{totGross} AED</span>
              </div>
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span>Total Patient Copay (Cash to collect):</span>
                <span className="font-mono font-bold text-sm">{totPtShare} AED</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-400 pt-2 border-t border-[var(--color-border,#243045)]">
                <span className="font-semibold">Net Claimable to Insurer:</span>
                <span className="font-mono font-bold text-base">{totNet} AED</span>
              </div>
              <div className="text-[10px] text-slate-400 text-right font-mono mt-1">
                Rule Check: Gross ({totGross}) = PatientShare ({totPtShare}) + Net ({totNet}) &bull; OK
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* e-Prescription (eRx) Modal */}
      {showErxModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Pill size={18} className="text-emerald-400" />
                Issue UAE MoHAP Riayati / DHA e-Prescription (eRx)
              </h3>
              <button
                onClick={() => setShowErxModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* DDC Search Input */}
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search UAE Drug Formulary / DDC (e.g., Amoxicillin, Glucophage, Panadol)..."
                value={drugQuery}
                onChange={(e) => setDrugQuery(e.target.value)}
                className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-emerald-500 font-mono"
              />

              {/* Autocomplete Dropdown */}
              {drugResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-[var(--color-surface-raised,#1C2433)] border border-emerald-500/40 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[var(--color-border,#243045)]">
                  {drugResults.map((drg) => (
                    <div
                      key={drg.drugCode}
                      onClick={() => addPrescribedMed(drg)}
                      className="p-2.5 hover:bg-emerald-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-400 mr-2">
                          {drg.drugCode}
                        </span>
                        <span className="text-slate-200 font-semibold">{drg.tradeName}</span>
                        <span className="ml-2 text-slate-400 text-[11px]">
                          ({drg.strength || drg.dosageForm || "standard"})
                        </span>
                      </div>
                      <Plus size={14} className="text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Medications List */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px] max-h-[300px]">
              {prescribedMeds.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
                  No medications selected. Search the UAE Drug Formulary above to add prescription lines.
                </div>
              ) : (
                prescribedMeds.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-emerald-400 mr-2">
                          {med.drugCode}
                        </span>
                        <span className="text-white font-semibold">{med.tradeName}</span>
                      </div>
                      <button
                        onClick={() =>
                          setPrescribedMeds(prescribedMeds.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-400 p-1 rounded"
                      >
                        <Trash size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Dosage</span>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => {
                            const updated = [...prescribedMeds];
                            updated[idx].dosage = e.target.value;
                            setPrescribedMeds(updated);
                          }}
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Frequency</span>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => {
                            const updated = [...prescribedMeds];
                            updated[idx].frequency = e.target.value;
                            setPrescribedMeds(updated);
                          }}
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Duration (Days)</span>
                        <input
                          type="number"
                          min="1"
                          value={med.duration}
                          onChange={(e) => {
                            const updated = [...prescribedMeds];
                            updated[idx].duration = parseInt(e.target.value) || 1;
                            setPrescribedMeds(updated);
                          }}
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Quantity</span>
                        <input
                          type="number"
                          min="1"
                          value={med.quantity}
                          onChange={(e) => {
                            const updated = [...prescribedMeds];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setPrescribedMeds(updated);
                          }}
                          className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[var(--color-border,#243045)] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Will be published immediately to Riayati eRx Post Office.
              </span>
              <button
                type="button"
                onClick={handleIssueErx}
                disabled={isIssuingErx || prescribedMeds.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <PaperPlaneTilt size={16} weight="bold" />
                {isIssuingErx ? "Publishing eRx..." : "Issue & Send eRx to Pharmacy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
