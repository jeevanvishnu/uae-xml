"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Money,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowsClockwise,
  UploadSimple,
  Play,
  FileCode,
  PaperPlaneTilt,
  Receipt,
  FileText,
} from "@phosphor-icons/react";

interface RemittanceLine {
  id: string;
  claimSubmissionId: string;
  activityId: string;
  gross: number;
  patientShare: number;
  net: number;
  paymentAmount: number;
  denialCode?: string;
  payerRemark?: string;
  status: "PAID" | "PARTIAL" | "REJECTED";
  claim?: {
    id: string;
    claimNumber: string;
    payerId: string;
    netAmount: number;
    status: string;
    resubmissionCount: number;
  };
}

export default function RemittanceReconciliationPage() {
  const [remittanceLines, setRemittanceLines] = useState<RemittanceLine[]>([]);
  const [submittedClaims, setSubmittedClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ingest XML Modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [rawXml, setRawXml] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Resubmit Modal
  const [selectedClaimForResub, setSelectedClaimForResub] = useState<any | null>(null);
  const [resubmissionType, setResubmissionType] = useState<string>("Correction");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [remitRes, claimsRes] = await Promise.all([
        api.get("/remittance"),
        api.get("/claims?status=SUBMITTED"),
      ]);

      if (remitRes.data?.success) {
        setRemittanceLines(remitRes.data.data.remittanceLines || []);
      }
      if (claimsRes.data?.success) {
        setSubmittedClaims(claimsRes.data.data.claims || []);
      }
    } catch (err: any) {
      toast.error("Failed to load remittance lines");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process uploaded XML
  const handleIngestXml = async () => {
    if (!rawXml.trim()) {
      toast.warning("Please paste or load a valid Remittance Advice XML.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await api.post("/remittance/process-xml", { xmlContent: rawXml });
      if (res.data?.success) {
        toast.success(`Remittance processed! Txn: ${res.data.data.hubTxnId}`);
        setShowIngestModal(false);
        setRawXml("");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process remittance XML");
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate Payer Adjudication for quick testing
  const handleSimulate = async (claimId: string, outcome: "APPROVED" | "PARTIAL" | "REJECTED") => {
    try {
      toast.info(`Simulating ${outcome} remittance from Payer...`);
      const res = await api.post(`/remittance/simulate/${claimId}`, { outcome });
      if (res.data?.success) {
        toast.success(`Simulated remittance processed successfully!`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Simulation failed");
    }
  };

  // Resubmit Claim
  const handleResubmit = async () => {
    if (!selectedClaimForResub) return;
    setIsResubmitting(true);
    try {
      const res = await api.post(`/remittance/claims/${selectedClaimForResub.id}/resubmit`, {
        resubmissionType,
        correctionNotes,
      });
      if (res.data?.success) {
        toast.success(`Claim resubmitted as ${res.data.data.resubmittedClaim.claimNumber}!`);
        setSelectedClaimForResub(null);
        setCorrectionNotes("");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Resubmission failed");
    } finally {
      setIsResubmitting(false);
    }
  };

  // Financial sums
  const totalBilled = remittanceLines.reduce((acc, l) => acc + (l.net || 0), 0);
  const totalSettled = remittanceLines.reduce((acc, l) => acc + (l.paymentAmount || 0), 0);
  const totalDenied = totalBilled - totalSettled;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)]">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/billing"
              className="p-1.5 rounded-lg bg-[var(--color-surface-raised,#202A3E)] text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Money className="text-emerald-400" size={26} weight="duotone" />
              Remittance Advice & Denial Reconciliation
            </h1>
          </div>
          <p className="text-xs text-[var(--color-muted,#64748B)] mt-1 ml-9">
            Reconcile incoming remittance advice from payers, investigate denial codes, and resubmit corrected claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold border border-[var(--color-border,#243045)] transition-all cursor-pointer"
          >
            <UploadSimple size={16} />
            Ingest Remittance XML
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Billed Net</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {totalBilled} <span className="text-xs text-slate-400 font-sans">AED</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sum of adjudicated claim lines</div>
        </div>

        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-emerald-400">Settled (Paid)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalSettled} <span className="text-xs text-slate-400 font-sans">AED</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Deposited by payers</div>
        </div>

        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)]">
          <div className="text-[11px] uppercase font-bold text-red-400">Denied / Underpaid</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">
            {Math.max(0, totalDenied)} <span className="text-xs text-slate-400 font-sans">AED</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Eligible for resubmission correction</div>
        </div>
      </div>

      {/* Testing Section: Quick Payer Simulation on Submitted Claims */}
      {submittedClaims.length > 0 && (
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-sky-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Play size={14} className="text-sky-400" weight="fill" />
              Live Simulation: Adjudicate Active Submitted Claims
            </h3>
            <span className="text-[11px] text-slate-400">
              Simulates Payer adjudication responses for claims waiting at Post Office
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {submittedClaims.slice(0, 3).map((claim) => (
              <div
                key={claim.id}
                className="p-3 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">{claim.claimNumber}</span>
                  <span className="font-mono text-emerald-400">{claim.netAmount} AED</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Payer: <span className="text-sky-400 font-mono">{claim.payerId}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleSimulate(claim.id, "APPROVED")}
                    className="flex-1 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    100% Paid
                  </button>
                  <button
                    onClick={() => handleSimulate(claim.id, "PARTIAL")}
                    className="flex-1 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    Partial
                  </button>
                  <button
                    onClick={() => handleSimulate(claim.id, "REJECTED")}
                    className="flex-1 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remittance Lines Table */}
      <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border,#243045)] bg-[var(--color-surface-raised,#1C2433)] text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Activity Ref</th>
                <th className="py-3 px-4 text-right">Billed Net</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4">Status & Denial Reason</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border,#243045)] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading remittance lines...
                  </td>
                </tr>
              ) : remittanceLines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No remittances reconciled yet. Ingest an XML advice above or simulate adjudication on submitted claims.
                  </td>
                </tr>
              ) : (
                remittanceLines.map((line) => {
                  const isDenied = line.status === "REJECTED" || line.status === "PARTIAL";
                  return (
                    <tr
                      key={line.id}
                      className="hover:bg-[var(--color-surface-raised,#192131)]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/billing/claims/${line.claim?.id || ""}`}
                          className="hover:text-amber-400"
                        >
                          {line.claim?.claimNumber || "Unknown Claim"}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          Payer: {line.claim?.payerId || "N/A"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {line.activityId}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {line.net} AED
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {line.paymentAmount} AED
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              line.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : line.status === "PARTIAL"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {line.status === "PAID" ? (
                              <CheckCircle size={12} weight="fill" />
                            ) : (
                              <XCircle size={12} weight="fill" />
                            )}
                            {line.status}
                          </span>
                          {line.denialCode && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                              {line.denialCode}
                            </span>
                          )}
                        </div>
                        {line.payerRemark && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">
                            {line.payerRemark}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isDenied && line.claim && (
                          <button
                            onClick={() => setSelectedClaimForResub(line.claim)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <ArrowsClockwise size={13} weight="bold" />
                            Resubmit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingest Remittance XML Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileCode size={18} className="text-emerald-400" />
                Ingest Payer &lt;RemittanceAdvice&gt; XML Document
              </h3>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste the XML payload downloaded from MoHAP Riayati / DHA eClaimLink Post Office to automatically reconcile claim lines.
            </p>

            <textarea
              rows={12}
              value={rawXml}
              onChange={(e) => setRawXml(e.target.value)}
              placeholder={`<?xml version="1.0" encoding="UTF-8"?>
<RemittanceAdvice>
  <Header>
    <SenderID>AXA-DXB-9021</SenderID>
    <ReceiverID>FAC-MOH-98765</ReceiverID>
    <TransactionDate>24/11/2026 16:30</TransactionDate>
  </Header>
  <Claim>
    <ID>CLM-XXXX</ID>
    <Activity>
      <ID>ACT-001</ID>
      <PaymentAmount>120</PaymentAmount>
    </Activity>
  </Claim>
</RemittanceAdvice>`}
              className="w-full bg-black/50 border border-[var(--color-border,#243045)] rounded-lg p-3 font-mono text-xs text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowIngestModal(false)}
                className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised,#202A3E)] text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleIngestXml}
                disabled={isProcessing}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Processing XML..." : "Parse & Reconcile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Claim Modal */}
      {selectedClaimForResub && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowsClockwise size={18} className="text-amber-400" />
                Resubmit Claim to Payer ({selectedClaimForResub.claimNumber})
              </h3>
              <button
                onClick={() => setSelectedClaimForResub(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Resubmission Reason</label>
                <select
                  value={resubmissionType}
                  onChange={(e) => setResubmissionType(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Correction">Correction (Corrected diagnosis or tariff code)</option>
                  <option value="Internal_Complaint">Internal Complaint / Dispute</option>
                  <option value="Prior_Authorization_Added">Prior Authorization Attached</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Correction Notes / Justification</label>
                <textarea
                  rows={4}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Explain reason for resubmission, corrected coding, or authorization number..."
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                A new versioned claim (<span className="font-mono">{selectedClaimForResub.claimNumber}-R{selectedClaimForResub.resubmissionCount + 1}</span>) will be built with the official <span className="font-mono">&lt;Resubmission&gt;</span> element and transmitted immediately to the Riayati Hub.
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedClaimForResub(null)}
                className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised,#202A3E)] text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmit}
                disabled={isResubmitting}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isResubmitting ? "Resubmitting..." : "Transmit Resubmission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
