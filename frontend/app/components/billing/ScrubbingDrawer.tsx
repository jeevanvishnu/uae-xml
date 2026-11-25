"use client";

import React, { useState, useEffect } from "react";
import {
  BillingClaim,
  evaluateScrubbing,
  useBilling,
} from "@/app/context/BillingContext";
import { toast } from "sonner";
import {
  X,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  ArrowRight,
  Wrench,
  CurrencyDollar,
  IdentificationCard,
  FirstAidKit,
  Key,
} from "@phosphor-icons/react";

interface ScrubbingDrawerProps {
  claim: BillingClaim | null;
  onClose: () => void;
}

export function ScrubbingDrawer({ claim, onClose }: ScrubbingDrawerProps) {
  const { fixClaimData, promoteClaimToBatch } = useBilling();

  const [icdCode, setIcdCode] = useState("");
  const [icdDesc, setIcdDesc] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [priorAuthRefs, setPriorAuthRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!claim) return;
    const principal = claim.diagnoses.find((d) => d.type === "Principal");
    setIcdCode(principal?.code || "");
    setIcdDesc(principal?.description || "");
    setEmiratesId(claim.patient.emiratesId);
    setMemberId(claim.insurance.memberId);

    const refs: Record<string, string> = {};
    claim.procedures.forEach((p) => {
      if (p.requiresPriorAuth) {
        refs[p.id] = p.priorAuthRef || "";
      }
    });
    setPriorAuthRefs(refs);
  }, [claim]);

  if (!claim) return null;

  const scrub = evaluateScrubbing(claim);

  const handleSaveFixes = (recalculateNet = false) => {
    fixClaimData(claim.id, {
      principalIcdCode: icdCode || undefined,
      principalIcdDesc: icdDesc || undefined,
      emiratesId,
      memberId,
      priorAuthRefs,
      recalculateNet,
    });
    toast.success(`Updated scrubbing fields for ${claim.claimNumber}`);
  };

  const handlePromote = () => {
    const ok = promoteClaimToBatch(claim.id);
    if (ok) {
      toast.success(
        `${claim.claimNumber} passed 4/4 checks and moved to ${claim.insurance.receiverId} batch`
      );
      onClose();
    } else {
      toast.error("All 4 scrubbing checks must pass before XML batching.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {claim.claimNumber}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {claim.encounterId} &bull; {claim.tokenNumber}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              Pre-Submission Scrubbing Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Patient & Payer Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Patient
              </span>
              <div className="font-bold text-slate-900 mt-0.5">
                {claim.patient.fullName}
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                {claim.patient.emiratesId}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Payer (ReceiverID)
              </span>
              <div className="font-bold text-slate-900 mt-0.5">
                {claim.insurance.payerName}
              </div>
              <div className="font-mono text-[11px] text-blue-700 font-semibold">
                {claim.insurance.receiverId} &bull; {claim.insurance.memberId}
              </div>
            </div>
          </div>

          {/* 4 Scrubbing Gates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Automated UAE Scrubbing Gates ({scrub.passedCount}/
                {scrub.totalCount})
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  scrub.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {scrub.passed ? (
                  <>
                    <CheckCircle size={13} weight="fill" /> Clean for XML
                  </>
                ) : (
                  <>
                    <WarningCircle size={13} weight="fill" /> Action Required
                  </>
                )}
              </span>
            </div>

            {/* Gate 1: Principal ICD-10 */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                scrub.checks.principalIcd.passed
                  ? "bg-emerald-50/40 border-emerald-200/80"
                  : "bg-red-50/50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FirstAidKit
                    size={18}
                    weight="duotone"
                    className={
                      scrub.checks.principalIcd.passed
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      1. Principal ICD-10 Diagnosis
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {scrub.checks.principalIcd.message}
                    </div>
                  </div>
                </div>
                {scrub.checks.principalIcd.passed ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0" />
                )}
              </div>

              {!scrub.checks.principalIcd.passed && (
                <div className="pt-2 border-t border-red-200/60 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                    placeholder="ICD-10 (e.g. J06.9)"
                    className="col-span-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    value={icdDesc}
                    onChange={(e) => setIcdDesc(e.target.value)}
                    placeholder="Diagnosis description..."
                    className="col-span-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveFixes(false)}
                    className="col-span-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Wrench size={14} /> Apply Principal ICD-10
                  </button>
                </div>
              )}
            </div>

            {/* Gate 2: Financial Balance */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                scrub.checks.mathBalance.passed
                  ? "bg-emerald-50/40 border-emerald-200/80"
                  : "bg-red-50/50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CurrencyDollar
                    size={18}
                    weight="duotone"
                    className={
                      scrub.checks.mathBalance.passed
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      2. Financial Balance (Gross = PatientShare + Net)
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      {scrub.checks.mathBalance.message}
                    </div>
                  </div>
                </div>
                {scrub.checks.mathBalance.passed ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0" />
                )}
              </div>

              {!scrub.checks.mathBalance.passed && (
                <div className="pt-2 border-t border-red-200/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-red-700">
                    Recalculate Net = Gross ({claim.grossAmount.toFixed(2)}) − Share (
                    {claim.patientShare.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveFixes(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Wrench size={14} /> Auto-Balance Net
                  </button>
                </div>
              )}
            </div>

            {/* Gate 3: Active Emirates ID & Member ID */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                scrub.checks.activeIds.passed
                  ? "bg-emerald-50/40 border-emerald-200/80"
                  : "bg-red-50/50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IdentificationCard
                    size={18}
                    weight="duotone"
                    className={
                      scrub.checks.activeIds.passed
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      3. Active Emirates ID &amp; Member ID
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {scrub.checks.activeIds.message}
                    </div>
                  </div>
                </div>
                {scrub.checks.activeIds.passed ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0" />
                )}
              </div>

              {!scrub.checks.activeIds.passed && (
                <div className="pt-2 border-t border-red-200/60 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={emiratesId}
                    onChange={(e) => setEmiratesId(e.target.value)}
                    placeholder="784-YYYY-NNNNNNN-C"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900"
                  />
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="Member ID"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveFixes(false)}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Wrench size={14} /> Verify &amp; Update IDs
                  </button>
                </div>
              )}
            </div>

            {/* Gate 4: Prior Auth */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                scrub.checks.priorAuth.passed
                  ? "bg-emerald-50/40 border-emerald-200/80"
                  : "bg-red-50/50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Key
                    size={18}
                    weight="duotone"
                    className={
                      scrub.checks.priorAuth.passed
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      4. Prior Authorization Reference
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {scrub.checks.priorAuth.message}
                    </div>
                  </div>
                </div>
                {scrub.checks.priorAuth.passed ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0" />
                )}
              </div>

              {!scrub.checks.priorAuth.passed && (
                <div className="pt-2 border-t border-red-200/60 space-y-2">
                  {claim.procedures
                    .filter((p) => p.requiresPriorAuth)
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-700 shrink-0">
                          CPT {p.code}:
                        </span>
                        <input
                          type="text"
                          value={priorAuthRefs[p.id] || ""}
                          onChange={(e) =>
                            setPriorAuthRefs((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="Enter Prior Auth # (e.g. PA-DAM-88412)"
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    ))}
                  <button
                    type="button"
                    onClick={() => handleSaveFixes(false)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Wrench size={14} /> Save Prior Authorization #
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Net Claim:{" "}
            <span className="font-mono font-bold text-slate-900">
              AED {claim.netAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!scrub.passed || claim.workflowStatus !== "READY_FOR_CLAIM"}
              onClick={handlePromote}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scrub.passed && claim.workflowStatus === "READY_FOR_CLAIM"
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <ShieldCheck size={16} weight="bold" />
              <span>
                {claim.workflowStatus === "READY_FOR_CLAIM"
                  ? "Approve & Queue for XML Batch"
                  : "Already in Batch Queue"}
              </span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
