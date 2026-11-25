"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Pill,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  WarningCircle,
  Receipt,
  User,
  ShieldCheck,
  CreditCard,
  FileCode,
  ArrowRight,
  Printer,
} from "@phosphor-icons/react";

interface Medication {
  drugCode: string;
  tradeName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  unitPrice?: number;
  instructions?: string;
}

interface Prescription {
  id: string;
  erxRefNo: string;
  dispenseStatus: "PENDING" | "DISPENSED" | "CANCELLED";
  medications: Medication[];
  erxXmlKey?: string;
  createdAt: string;
  patient?: {
    fullName: string;
    emiratesId?: string;
    dob: string;
    gender: string;
  };
  policy?: {
    payerName: string;
    memberId: string;
    copayPercent: number;
    copayCap: number;
  };
  clinician?: {
    name: string;
    licenseNo: string;
  };
}

export default function PharmacyDispensingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  // Fetch recent prescriptions
  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/prescriptions");
      if (res.data?.success) {
        setPrescriptions(res.data.data.prescriptions || []);
        if (res.data.data.prescriptions.length > 0 && !selectedPrescription) {
          setSelectedPrescription(res.data.data.prescriptions[0]);
        }
      }
    } catch (err: any) {
      toast.error("Failed to load prescriptions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  // Search by reference or Emirates ID
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchPrescriptions();
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get(`/prescriptions/lookup?ref=${encodeURIComponent(searchQuery)}&emirates_id=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        setPrescriptions(res.data.data.prescriptions || []);
        if (res.data.data.prescriptions.length > 0) {
          setSelectedPrescription(res.data.data.prescriptions[0]);
        } else {
          toast.warning("No e-Prescriptions matched your query.");
        }
      }
    } catch (err: any) {
      toast.error("Lookup failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Select prescription to inspect
  const handleSelect = async (p: Prescription) => {
    try {
      const res = await api.get(`/prescriptions/${p.id}`);
      if (res.data?.success) {
        setSelectedPrescription(res.data.data.prescription);
      }
    } catch {
      setSelectedPrescription(p);
    }
  };

  // Calculate prescription financials
  const calculateMedFinancials = (p: Prescription | null) => {
    if (!p) return { totalGross: 0, patientCopay: 0, insurerNet: 0 };
    const copayPct = p.policy?.copayPercent !== undefined ? p.policy.copayPercent : 20;
    const copayCap = p.policy?.copayCap !== undefined ? p.policy.copayCap : 50;

    let gross = 0;
    p.medications.forEach((m) => {
      gross += (m.unitPrice || 35) * (m.quantity || 1);
    });

    let copay = Math.round((gross * copayPct) / 100);
    if (copayCap && copay > copayCap) copay = copayCap;
    const net = gross - copay;

    return { totalGross: gross, patientCopay: copay, insurerNet: net };
  };

  // Dispense medications
  const handleDispense = async () => {
    if (!selectedPrescription) return;
    const { patientCopay } = calculateMedFinancials(selectedPrescription);

    setIsDispensing(true);
    try {
      const res = await api.post(`/prescriptions/${selectedPrescription.id}/dispense`, {
        copayCollected: patientCopay,
        paymentMethod: "CASH",
        notes: "Dispensed at central dispensary counter.",
      });

      if (res.data?.success) {
        toast.success(`eRx ${selectedPrescription.erxRefNo} dispensed successfully!`);
        setLastReceipt(res.data.data?.receiptNumber || "REC-PHARM-SUCCESS");
        // Update local state
        setSelectedPrescription({
          ...selectedPrescription,
          dispenseStatus: "DISPENSED",
        });
        fetchPrescriptions();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to dispense prescription");
    } finally {
      setIsDispensing(false);
    }
  };

  const financials = calculateMedFinancials(selectedPrescription);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Pill className="text-emerald-400" size={26} weight="duotone" />
            MoHAP Riayati / DHA e-Prescription Dispensing Hub
          </h1>
          <p className="text-xs text-[var(--color-muted,#64748B)] mt-1">
            Search eRx reference or Emirates ID, verify medication coverage, collect copay, and dispense medications.
          </p>
        </div>

        {/* Quick Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Enter ERX ref or Emirates ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            Lookup
          </button>
        </form>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Prescription Queue */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border,#243045)]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Prescriptions ({prescriptions.length})
            </h2>
            <button
              onClick={fetchPrescriptions}
              className="text-[11px] text-sky-400 hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading eRx list...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No prescriptions found.
              </div>
            ) : (
              prescriptions.map((p) => {
                const isSelected = selectedPrescription?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[var(--color-surface-raised,#202A3E)] border-emerald-500/50 shadow-md"
                        : "bg-[var(--color-surface-raised,#192131)]/50 border-[var(--color-border,#243045)] hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {p.erxRefNo}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          p.dispenseStatus === "DISPENSED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {p.dispenseStatus}
                      </span>
                    </div>

                    <div className="font-medium text-white text-xs mt-1">
                      {p.patient?.fullName || "Walk-In Patient"}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mt-1">
                      <span>{p.medications?.length || 0} items</span>
                      <span>{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Prescription Inspector & Dispensing Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPrescription ? (
            <div className="bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)] space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border,#243045)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-muted,#64748B)] uppercase font-semibold">
                      e-Prescription Order:
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {selectedPrescription.erxRefNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prescribed by: <span className="text-white font-medium">{selectedPrescription.clinician?.name || "Dr. Tariq Al Hashimi"}</span> &bull; {new Date(selectedPrescription.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPrescription.erxXmlKey && (
                    <button
                      onClick={() => setShowXmlModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-xs text-sky-400 border border-[var(--color-border,#243045)] transition-colors cursor-pointer"
                    >
                      <FileCode size={14} />
                      View Riayati XML
                    </button>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 text-xs uppercase font-bold px-2.5 py-1 rounded ${
                      selectedPrescription.dispenseStatus === "DISPENSED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {selectedPrescription.dispenseStatus === "DISPENSED" ? (
                      <CheckCircle size={14} weight="fill" />
                    ) : (
                      <Clock size={14} />
                    )}
                    {selectedPrescription.dispenseStatus}
                  </span>
                </div>
              </div>

              {/* Patient and Insurance Policy Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Patient Identification
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedPrescription.patient?.fullName || "Walk-In"}
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    EID: {selectedPrescription.patient?.emiratesId || "N/A"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Gender: {selectedPrescription.patient?.gender === "M" ? "Male" : "Female"}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Insurance Pharmacy Benefits
                  </div>
                  <div className="text-sm font-bold text-sky-400">
                    {selectedPrescription.policy?.payerName || "Self-Pay"}
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    Member ID: {selectedPrescription.policy?.memberId || "None"}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-1">
                    Pharmacy Copay: {selectedPrescription.policy ? `${selectedPrescription.policy.copayPercent}% (Cap: ${selectedPrescription.policy.copayCap} AED)` : "100% Cash"}
                  </div>
                </div>
              </div>

              {/* Prescribed Medications Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Prescribed Medication Lines
                </h3>
                <div className="border border-[var(--color-border,#243045)] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[var(--color-surface-raised,#1C2433)] text-[11px] text-slate-400 border-b border-[var(--color-border,#243045)] uppercase font-semibold">
                        <th className="py-2.5 px-3">DDC Code</th>
                        <th className="py-2.5 px-3">Medication Name</th>
                        <th className="py-2.5 px-3">Dosage / Freq</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border,#243045)] text-slate-200">
                      {selectedPrescription.medications.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                            {m.drugCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{m.tradeName}</div>
                            {m.instructions && (
                              <div className="text-[10px] text-slate-400 italic">
                                {m.instructions}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {m.dosage} &bull; {m.frequency}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {m.duration} days
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {m.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {(m.unitPrice || 35) * (m.quantity || 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation & Action Banner */}
              <div className="bg-[var(--color-surface-raised,#1C2433)] p-4 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-300">
                    Gross Medications Value: <span className="font-mono font-bold text-white">{financials.totalGross} AED</span>
                  </div>
                  <div className="text-xs text-amber-300">
                    Patient Co-payment (To Collect): <span className="font-mono font-bold text-base">{financials.patientCopay} AED</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    Insurer Portion (Direct Billing): {financials.insurerNet} AED
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedPrescription.dispenseStatus === "PENDING" ? (
                    <button
                      onClick={handleDispense}
                      disabled={isDispensing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Pill size={16} weight="bold" />
                      {isDispensing ? "Dispensing..." : "Dispense & Collect Copay"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1.5">
                        <CheckCircle size={16} weight="fill" />
                        Medications Dispensed
                      </div>
                      {lastReceipt && (
                        <div className="text-[11px] text-slate-300 font-mono">
                          Receipt: {lastReceipt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--color-surface,#161B22)] p-12 rounded-xl border border-[var(--color-border,#243045)] text-center text-slate-400 text-xs">
              Select a prescription from the queue or search by eRx reference number.
            </div>
          )}
        </div>
      </div>

      {/* XML Viewer Modal */}
      {showXmlModal && selectedPrescription?.erxXmlKey && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileCode size={18} className="text-emerald-400" />
                Riayati ePrescription XML Payload
              </h3>
              <button
                onClick={() => setShowXmlModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            <pre className="flex-1 overflow-auto bg-black/50 p-4 rounded-lg font-mono text-xs text-emerald-300 leading-relaxed border border-slate-800">
              {selectedPrescription.erxXmlKey}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
