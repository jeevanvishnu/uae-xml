"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Receipt,
  FileCode,
  PaperPlaneTilt,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Funnel,
  FileText,
  Eye,
  PlusCircle,
} from "@phosphor-icons/react";

interface Claim {
  id: string;
  claimNumber: string;
  payerId: string;
  netAmount: number;
  status: "READY" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "PAID" | "PARTIALLY_PAID" | "RESUBMITTED";
  submissionDate: string;
  createdAt: string;
  submissionXmlKey?: string;
  patient?: {
    fullName: string;
    emiratesId?: string;
  };
  encounter?: {
    id: string;
    encounterType: string;
    grossAmount: number;
    patientShare: number;
    netAmount: number;
  };
}

interface ReadyEncounter {
  id: string;
  encounterType: string;
  startTime: string;
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  claimStatus: string;
  patient?: {
    fullName: string;
    emiratesId?: string;
  };
  policy?: {
    payerName: string;
    payerId: string;
    memberId: string;
  };
  diagnoses: any[];
  activities: any[];
}

export default function BillingClaimsWorkspace() {
  const [activeTab, setActiveTab] = useState<"claims" | "ready">("claims");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [readyEncounters, setReadyEncounters] = useState<ReadyEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // XML Preview Modal
  const [previewXml, setPreviewXml] = useState<string | null>(null);

  const fetchClaimsAndReady = async () => {
    setIsLoading(true);
    try {
      const [claimsRes, readyRes] = await Promise.all([
        api.get("/claims"),
        api.get("/encounters?status=READY"),
      ]);

      if (claimsRes.data?.success) {
        setClaims(claimsRes.data.data.claims || []);
      }
      if (readyRes.data?.success) {
        setReadyEncounters(readyRes.data.data.encounters || []);
      }
    } catch (err: any) {
      toast.error("Failed to load claims & encounters");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimsAndReady();
  }, []);

  // Validate & Generate Claim XML from Encounter
  const handleGenerateClaim = async (encounterId: string) => {
    setProcessingId(encounterId);
    try {
      const res = await api.post("/claims/generate", { encounterId });
      if (res.data?.success) {
        toast.success("Claim XML generated and verified against Riayati rules!");
        fetchClaimsAndReady();
        setActiveTab("claims");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to generate claim";
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(`${msg}: ${errors.join(", ")}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setProcessingId(null);
    }
  };

  // Submit Claim to Riayati / DHA Hub
  const handleSubmitToHub = async (claimId: string) => {
    setProcessingId(claimId);
    try {
      const res = await api.post(`/claims/${claimId}/submit`);
      if (res.data?.success) {
        toast.success(`Claim dispatched! Hub Txn: ${res.data.data?.hubTxnId}`);
        fetchClaimsAndReady();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Hub transmission failed");
    } finally {
      setProcessingId(null);
    }
  };

  // Stats
  const totalSubmitted = claims.filter((c) => c.status === "SUBMITTED" || c.status === "ACCEPTED").length;
  const totalNetClaimed = claims.reduce((acc, c) => acc + (c.netAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-slate-400">Ready for Claiming</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {readyEncounters.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Encounters finalized by doctor</div>
        </div>

        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-slate-400">Submitted to Hub</div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {totalSubmitted}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched to Riayati / DHA</div>
        </div>

        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Net Claimed</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalNetClaimed} <span className="text-xs text-slate-400 font-sans">AED</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pending payer adjudication</div>
        </div>

        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex flex-col justify-between">
          <div className="text-[11px] uppercase font-bold text-slate-400">Hub Gateway Status</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Post Office Online
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Disposition: <span className="text-amber-300">TEST</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-[var(--color-border,#243045)] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "claims"
                ? "bg-amber-500 text-slate-900 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white bg-[var(--color-surface,#161B22)]"
            }`}
          >
            Claims Submissions ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab("ready")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ready"
                ? "bg-amber-500 text-slate-900 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white bg-[var(--color-surface,#161B22)]"
            }`}
          >
            Pending Doctor Finalizations ({readyEncounters.length})
          </button>
        </div>

        <button
          onClick={fetchClaimsAndReady}
          className="text-xs text-sky-400 hover:underline cursor-pointer"
        >
          Refresh Lists
        </button>
      </div>

      {/* Tab 1: Claims List */}
      {activeTab === "claims" && (
        <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border,#243045)] bg-[var(--color-surface-raised,#1C2433)] text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Claim Number</th>
                  <th className="py-3 px-4">Patient Info</th>
                  <th className="py-3 px-4">Target Payer (ReceiverID)</th>
                  <th className="py-3 px-4 text-right">Net Claim (AED)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border,#243045)] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading claims...
                    </td>
                  </tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No claims generated yet. Convert ready doctor encounters into claims above.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-[var(--color-surface-raised,#192131)]/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/billing/claims/${claim.id}`}
                          className="hover:text-amber-400 transition-colors"
                        >
                          {claim.claimNumber}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {claim.patient?.fullName || "Walk-In Patient"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {claim.patient?.emiratesId || "N/A"}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-sky-400">
                        {claim.payerId}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {claim.netAmount} AED
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            claim.status === "SUBMITTED"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : claim.status === "READY"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : claim.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {claim.status === "SUBMITTED" ? (
                            <Clock size={12} />
                          ) : (
                            <CheckCircle size={12} weight="fill" />
                          )}
                          {claim.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        {claim.submissionXmlKey && (
                          <button
                            onClick={() => setPreviewXml(claim.submissionXmlKey || "")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-sky-400 text-xs transition-colors cursor-pointer"
                          >
                            <FileCode size={13} />
                            XML
                          </button>
                        )}

                        {claim.status === "READY" && (
                          <button
                            onClick={() => handleSubmitToHub(claim.id)}
                            disabled={processingId === claim.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <PaperPlaneTilt size={13} weight="bold" />
                            {processingId === claim.id ? "Sending..." : "Transmit"}
                          </button>
                        )}

                        <Link
                          href={`/billing/claims/${claim.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                        >
                          <Eye size={13} />
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Encounters Ready for Claiming */}
      {activeTab === "ready" && (
        <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border,#243045)] bg-[var(--color-surface-raised,#1C2433)] text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Patient Info</th>
                  <th className="py-3 px-4">Insurance Coverage</th>
                  <th className="py-3 px-4">Diagnoses (ICD-10)</th>
                  <th className="py-3 px-4">Activities</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-right">Pre-Validation & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border,#243045)] text-xs">
                {readyEncounters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No encounters pending billing.
                    </td>
                  </tr>
                ) : (
                  readyEncounters.map((enc) => (
                    <tr
                      key={enc.id}
                      className="hover:bg-[var(--color-surface-raised,#192131)]/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {enc.patient?.fullName || "Walk-In"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {enc.patient?.emiratesId || "N/A"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-sky-400">
                          {enc.policy?.payerName || "Self-Pay"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Receiver: {enc.policy?.payerId || "N/A"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {enc.diagnoses.map((d: any, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            >
                              {d.code}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {enc.activities?.length || 0} activities
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {enc.netAmount} AED
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleGenerateClaim(enc.id)}
                          disabled={processingId === enc.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        >
                          <FileText size={14} weight="bold" />
                          {processingId === enc.id ? "Validating..." : "Validate & Build Claim"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* XML Viewer Modal */}
      {previewXml && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-4xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileCode size={18} className="text-amber-400" />
                Riayati / DHA &lt;Claim.Submission&gt; XML Payload
              </h3>
              <button
                onClick={() => setPreviewXml(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <pre className="flex-1 overflow-auto bg-black/60 p-4 rounded-lg font-mono text-xs text-amber-200 leading-relaxed border border-slate-800">
              {previewXml}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
