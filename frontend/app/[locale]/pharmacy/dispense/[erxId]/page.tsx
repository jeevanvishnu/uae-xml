"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  usePharmacy,
  calculateOrderFinancials,
  getActiveMedicationValues,
  ErxMedicationLine,
  TatmeenStatus,
} from "@/app/context/PharmacyContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  QrCode,
  CheckCircle,
  WarningOctagon,
  Clock,
  Swap,
  LockSimple,
  Pill,
  ShieldCheck,
  CreditCard,
  Money,
  Receipt,
  Barcode,
  ArrowRight,
  Stethoscope,
} from "@phosphor-icons/react";

const TATMEEN_BADGE: Record<
  TatmeenStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  UNVERIFIED: {
    label: "Awaiting GS1 Scan",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Clock,
  },
  VERIFIED: {
    label: "Tatmeen Verified",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  EXPIRED: {
    label: "EXPIRED — BLOCKED",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: WarningOctagon,
  },
  RECALLED: {
    label: "RECALLED — BLOCKED",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: WarningOctagon,
  },
  MISMATCH: {
    label: "GTIN / Format Mismatch",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: WarningOctagon,
  },
};

export default function DispenseWorkbenchPage() {
  const params = useParams();
  const router = useRouter();
  const erxIdParam = typeof params?.erxId === "string" ? params.erxId : "";

  const {
    erxQueue,
    facilityProfile,
    setActiveErxId,
    toggleGenericSubstitution,
    updateLineDispenseQty,
    scanTatmeenBarcode,
    dispenseOrder,
  } = usePharmacy();

  const order = useMemo(
    () =>
      erxQueue.find(
        (o) => o.id === erxIdParam || o.erxRefNo === erxIdParam
      ) || erxQueue[0],
    [erxQueue, erxIdParam]
  );

  useEffect(() => {
    if (order) setActiveErxId(order.id);
  }, [order, setActiveErxId]);

  const [scanInputs, setScanInputs] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CARD");
  const [dispenseResult, setDispenseResult] = useState<{
    receiptNo: string;
    claimNumber: string;
  } | null>(null);

  const financials = useMemo(() => calculateOrderFinancials(order), [order]);

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <p className="text-sm text-slate-500">Prescription not found in queue.</p>
        <Link
          href="/pharmacy/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back to eRx Queue
        </Link>
      </div>
    );
  }

  const linesToDispense = order.medications.filter((m) => m.selectedDispenseQty > 0);
  const allSelectedVerified =
    linesToDispense.length > 0 &&
    linesToDispense.every((m) => m.tatmeenScan.status === "VERIFIED");

  const handleScanSubmit = (line: ErxMedicationLine, rawOverride?: string) => {
    const raw = rawOverride ?? scanInputs[line.id] ?? "";
    if (!raw.trim()) {
      toast.error("Scan or enter a GS1 2D DataMatrix barcode string.");
      return;
    }
    setScanInputs((prev) => ({ ...prev, [line.id]: raw }));
    const res = scanTatmeenBarcode(order.id, line.id, raw);
    if (res.status === "VERIFIED") {
      toast.success(`Tatmeen verified: ${res.serialNumber} (Batch ${res.batchLot})`);
    } else {
      toast.error(res.message);
    }
  };

  const simulateGs1 = (line: ErxMedicationLine, mode: "VALID" | "EXPIRED" | "RECALLED") => {
    const active = getActiveMedicationValues(line);
    const exp = mode === "EXPIRED" ? "240115" : "280630";
    const lot = mode === "RECALLED" ? "RECALL-99" : `LOT${active.drugCode.slice(-4)}`;
    const sn = `SN${Math.floor(1000000 + Math.random() * 9000000)}`;
    const gs1 = `(01)${active.gtin}(17)${exp}(10)${lot}(21)${sn}`;
    handleScanSubmit(line, gs1);
  };

  const handleCompleteDispense = () => {
    const res = dispenseOrder(order.id, paymentMethod);
    if (!res.success) {
      toast.error(res.error || "Unable to complete dispense.");
      return;
    }
    setDispenseResult({
      receiptNo: res.receiptNo!,
      claimNumber: res.claimNumber!,
    });
    toast.success(
      `Dispensed ${order.erxRefNo} — Receipt ${res.receiptNo} & Pharmacy Claim ${res.claimNumber} created.`
    );
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pharmacy/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back to Queue</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 font-mono">
                {order.erxRefNo}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  order.status === "DISPENSED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.status === "PARTIALLY_DISPENSED"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dispensing &amp; Tatmeen GS1 Verification Workbench &bull; Facility{" "}
              <span className="font-mono font-semibold text-slate-700">
                {facilityProfile.pharmacyLicenseId}
              </span>
            </p>
          </div>
        </div>

        <Link
          href="/pharmacy/claims"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto"
        >
          <span>View Pharmacy Claims</span>
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>

      {/* Dispense Confirmation Banner */}
      {dispenseResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-emerald-900">
                Medication Dispensed &amp; Pharmacy Claim Generated
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Co-Pay Receipt: <span className="font-mono font-bold">{dispenseResult.receiptNo}</span> &bull; Claim ID:{" "}
                <span className="font-mono font-bold">{dispenseResult.claimNumber}</span> (Activity Type = 5)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/pharmacy/claims")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            <span>Go to Claims &amp; XML Export</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Patient, Prescriber & Insurance Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Patient Identification
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            {order.patient.fullName}
          </div>
          <div className="font-mono text-xs font-semibold text-slate-700">
            EID: {order.patient.emiratesId}
          </div>
          <div className="text-[11px] text-slate-500">
            {order.patient.gender} &bull; DOB {order.patient.dob} &bull; {order.patient.phone}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Prescribing Clinician &amp; ICD-10
          </div>
          <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Stethoscope size={15} className="text-blue-600" />
            <span>{order.prescriber.name}</span>
          </div>
          <div className="font-mono text-xs font-semibold text-blue-700">
            License: {order.prescriber.licenseNo}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {order.diagnoses.map((d) => (
              <span
                key={d.code}
                title={d.description}
                className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200"
              >
                {d.code} ({d.type})
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Insurance Coverage &amp; Co-Pay Rules
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">
              {order.insurance.payerName}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={11} weight="fill" />
              {order.insurance.eligibilityStatus}
            </span>
          </div>
          <div className="font-mono text-xs text-slate-600">
            Member: {order.insurance.memberId} &bull; ReceiverID: {order.insurance.receiverId}
          </div>
          <div className="text-[11px] font-semibold text-emerald-700">
            Pharmacy Co-Pay: {order.insurance.copayPercent}% (Max Cap: {order.insurance.copayCap} AED)
          </div>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Medication Lines + Generic Substitution + Tatmeen Scanner */}
        <div className="lg:col-span-2 space-y-4">
          {order.medications.map((line) => {
            const active = getActiveMedicationValues(line);
            const remaining = Math.max(0, line.prescribedQty - line.dispensedQty);
            const isFullyDispensed = remaining === 0;
            const canSubstitute =
              line.doctorAllowsSubstitution &&
              line.insuranceAllowsSubstitution &&
              Boolean(line.genericEquivalent);
            const tatmeenMeta = TATMEEN_BADGE[line.tatmeenScan.status];
            const TatmeenIcon = tatmeenMeta.icon;
            const lineFinancial = financials.lineBreakdown.find((b) => b.id === line.id) || {
              gross: 0,
              patientShare: 0,
              net: 0,
            };

            return (
              <div
                key={line.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 ${
                  line.tatmeenScan.status === "EXPIRED" || line.tatmeenScan.status === "RECALLED"
                    ? "border-red-300 ring-2 ring-red-500/10"
                    : line.tatmeenScan.status === "VERIFIED"
                    ? "border-emerald-300"
                    : "border-slate-200/80"
                }`}
              >
                {/* Medication Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-bold">
                        {active.drugCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px] font-semibold">
                        ICD-10: {line.icd10Code}
                      </span>
                      {line.isSubstituted && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Generic Substituted
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Pill size={18} className="text-emerald-600 shrink-0" />
                      <span>{active.tradeName}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {active.genericName} &bull;{" "}
                      <span className="font-semibold text-slate-700">
                        {line.dosage}, {line.frequency}
                      </span>{" "}
                      for {line.durationDays} days
                    </p>
                    {line.instructions && (
                      <p className="text-[11px] text-slate-500 italic">
                        Note: {line.instructions}
                      </p>
                    )}
                  </div>

                  {/* Quantity & Line Price */}
                  <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Unit Price</div>
                      <div className="font-mono text-sm font-extrabold text-slate-900">
                        {active.unitPrice.toFixed(2)} AED
                      </div>
                    </div>

                    {isFullyDispensed ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        Fully Dispensed ({line.dispensedQty}/{line.prescribedQty})
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Dispense Qty:
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={line.selectedDispenseQty}
                          onChange={(e) =>
                            updateLineDispenseQty(
                              order.id,
                              line.id,
                              parseInt(e.target.value || "0", 10)
                            )
                          }
                          className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-center font-mono text-xs font-bold text-slate-900"
                        />
                        <span className="text-[11px] font-mono text-slate-400">
                          / {remaining} left
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generic Substitution Toggle */}
                {!isFullyDispensed && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
                    <div className="flex items-center gap-2.5">
                      {canSubstitute ? (
                        <Swap size={18} className="text-blue-600 shrink-0" weight="bold" />
                      ) : (
                        <LockSimple size={18} className="text-slate-400 shrink-0" weight="bold" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Generic Substitution
                        </div>
                        {canSubstitute && line.genericEquivalent ? (
                          <div className="text-[11px] text-slate-500">
                            Approved equivalent:{" "}
                            <span className="font-semibold text-slate-700">
                              {line.genericEquivalent.tradeName}
                            </span>{" "}
                            ({line.genericEquivalent.unitPrice} AED/unit — saves{" "}
                            {(line.unitPrice - line.genericEquivalent.unitPrice).toFixed(0)} AED/unit)
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">
                            {!line.doctorAllowsSubstitution
                              ? "Locked: Prescribing doctor marked Dispense As Written (DAW)."
                              : !line.insuranceAllowsSubstitution
                              ? "Locked: Insurance formulary requires brand product."
                              : "No approved generic equivalent mapped."}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canSubstitute}
                      onClick={() => toggleGenericSubstitution(order.id, line.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        !canSubstitute
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : line.isSubstituted
                          ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      }`}
                    >
                      {line.isSubstituted ? "Using Generic (Revert)" : "Switch to Generic"}
                    </button>
                  </div>
                )}

                {/* Tatmeen GS1 2D DataMatrix Verification */}
                {!isFullyDispensed && line.selectedDispenseQty > 0 && (
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <QrCode size={18} className="text-emerald-600" weight="duotone" />
                        <span className="text-xs font-bold text-slate-900">
                          Tatmeen GS1 2D DataMatrix Verification
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Expected GTIN: {active.gtin}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tatmeenMeta.className}`}
                      >
                        <TatmeenIcon size={13} weight="fill" />
                        {tatmeenMeta.label}
                      </span>
                    </div>

                    {/* Barcode Scanner Input + Quick Simulate Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Barcode
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={scanInputs[line.id] ?? line.tatmeenScan.rawGs1}
                          onChange={(e) =>
                            setScanInputs((prev) => ({ ...prev, [line.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleScanSubmit(line);
                            }
                          }}
                          placeholder={`Scan GS1: (01)${active.gtin}(17)280630(10)BATCH01(21)SN12345`}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScanSubmit(line)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Verify Scan
                      </button>
                    </div>

                    {/* Simulator Helpers + Parsed Tatmeen Fields */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          Quick Test:
                        </span>
                        <button
                          type="button"
                          onClick={() => simulateGs1(line, "VALID")}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold cursor-pointer"
                        >
                          Simulate Valid Pack
                        </button>
                        <button
                          type="button"
                          onClick={() => simulateGs1(line, "EXPIRED")}
                          className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-semibold cursor-pointer"
                        >
                          Simulate Expired
                        </button>
                        <button
                          type="button"
                          onClick={() => simulateGs1(line, "RECALLED")}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-semibold cursor-pointer"
                        >
                          Simulate Recalled Batch
                        </button>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500">
                        Line Total:{" "}
                        <span className="font-bold text-slate-900">
                          {lineFinancial.gross.toFixed(2)} AED
                        </span>
                      </div>
                    </div>

                    {line.tatmeenScan.status !== "UNVERIFIED" && (
                      <div
                        className={`rounded-xl p-2.5 text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 border ${
                          line.tatmeenScan.status === "VERIFIED"
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                            : "bg-red-50/70 border-red-200 text-red-900"
                        }`}
                      >
                        <div>
                          <span className="text-[10px] text-slate-500 block">GTIN</span>
                          <span className="font-bold">{line.tatmeenScan.gtin}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Batch / Lot</span>
                          <span className="font-bold">{line.tatmeenScan.batchLot}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Expiry Date</span>
                          <span className="font-bold">{line.tatmeenScan.expiryDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Serial Number</span>
                          <span className="font-bold">{line.tatmeenScan.serialNumber}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-4 text-[11px] font-sans font-semibold pt-1 border-t border-black/5">
                          {line.tatmeenScan.message}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Sticky Co-Pay & Insurance Split Checkout Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-5 lg:sticky lg:top-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Co-Pay &amp; Insurance Split
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
              Dispensary Billing Summary
            </h2>
          </div>

          <div className="space-y-2.5 text-xs border-y border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Gross Medication Value</span>
              <span className="font-mono font-bold text-slate-900">
                {financials.totalGross.toFixed(2)} AED
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                PatientShare (Co-Pay {order.insurance.copayPercent}%, Cap {order.insurance.copayCap} AED)
              </span>
              <span className="font-mono font-extrabold text-amber-600 text-sm">
                {financials.patientShare.toFixed(2)} AED
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-800">
                Net Claimed from Insurer
              </span>
              <span className="font-mono font-extrabold text-emerald-600 text-base">
                {financials.insurerNet.toFixed(2)} AED
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Co-Pay Collection Method
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  paymentMethod === "CARD"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <CreditCard size={15} weight="bold" />
                <span>Card / POS</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  paymentMethod === "CASH"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Money size={15} weight="bold" />
                <span>Cash</span>
              </button>
            </div>
          </div>

          {/* Tatmeen Safety Gate Status */}
          <div
            className={`rounded-xl p-3 border text-xs ${
              allSelectedVerified
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {order.status === "DISPENSED" ? (
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                <span>All prescribed items have been dispensed.</span>
              </div>
            ) : allSelectedVerified ? (
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                <span>All selected packs passed Tatmeen GS1 verification. Ready to dispense.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-semibold">
                <WarningOctagon size={16} weight="fill" className="text-amber-600 shrink-0" />
                <span>Scan and verify every selected medication box via Tatmeen before dispensing.</span>
              </div>
            )}
          </div>

          {/* Primary Dispense CTA */}
          <button
            type="button"
            disabled={!allSelectedVerified || order.status === "DISPENSED"}
            onClick={handleCompleteDispense}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              !allSelectedVerified || order.status === "DISPENSED"
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 cursor-pointer"
            }`}
          >
            <Receipt size={16} weight="bold" />
            <span>
              {order.status === "DISPENSED"
                ? "Order Fully Dispensed"
                : `Collect ${financials.patientShare.toFixed(2)} AED & Dispense`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
