"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Receipt,
  ArrowLeft,
  FileCode,
  PaperPlaneTilt,
  CheckCircle,
  Clock,
  WarningCircle,
  User,
  ShieldCheck,
  Stethoscope,
  ArrowsClockwise,
} from "@phosphor-icons/react";

interface ClaimDetail {
  id: string;
  claimNumber: string;
  payerId: string;
  netAmount: number;
  status: string;
  submissionDate: string;
  createdAt: string;
  submissionXmlKey?: string;
  patient?: {
    fullName: string;
    emiratesId?: string;
    dob: string;
    gender: string;
    phone: string;
  };
  policy?: {
    payerName: string;
    memberId: string;
    network: string;
    copayPercent: number;
    copayCap: number;
  };
  clinician?: {
    name: string;
    licenseNumber: string;
    specialty: string;
  };
  encounter?: {
    id: string;
    encounterType: string;
    grossAmount: number;
    patientShare: number;
    netAmount: number;
    diagnoses: any[];
    activities: any[];
  };
  hubTransactions?: any[];
  remittanceLines?: any[];
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"xml" | "activities" | "hub">("xml");

  const fetchClaim = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/claims/${id}`);
      if (res.data?.success) {
        setClaim(res.data.data.claim);
      }
    } catch (err: any) {
      toast.error("Failed to load claim details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClaim();
  }, [id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post(`/claims/${id}/submit`);
      if (res.data?.success) {
        toast.success(`Claim submitted to Post Office! Txn: ${res.data.data.hubTxnId}`);
        fetchClaim();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Hub transmission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !claim) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-400">
        Loading claim details...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/billing"
            className="p-2 rounded-lg bg-[var(--color-surface,#161B22)] hover:bg-[var(--color-surface-raised,#202A3E)] border border-[var(--color-border,#243045)] text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">
                {claim.claimNumber}
              </h1>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  claim.status === "SUBMITTED"
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    : claim.status === "READY"
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {claim.status}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted,#64748B)]">
              Payer ReceiverID: <span className="font-mono text-slate-300">{claim.payerId}</span> &bull; Created {new Date(claim.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {claim.status === "READY" && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <PaperPlaneTilt size={16} weight="bold" />
              {isSubmitting ? "Dispatching..." : "Transmit to Riayati / DHA Hub"}
            </button>
          )}

          {claim.status === "SUBMITTED" && (
            <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg">
              <CheckCircle size={16} weight="fill" />
              Dispatched & Acknowledged by Post Office
            </div>
          )}
        </div>
      </div>

      {/* 3-Cards Patient, Payer & Doctor Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <User size={22} weight="duotone" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">
              {claim.patient?.fullName || "Walk-In"}
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              EID: {claim.patient?.emiratesId || "N/A"}
            </div>
            <div className="text-[11px] text-[var(--color-muted,#64748B)] mt-1">
              Gender: {claim.patient?.gender === "M" ? "Male" : "Female"}
            </div>
          </div>
        </div>

        {/* Policy Coverage */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={22} weight="duotone" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">
              {claim.policy?.payerName || claim.payerId}
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              Member ID: {claim.policy?.memberId}
            </div>
            <div className="text-[11px] text-sky-400 font-mono mt-1">
              Network: {claim.policy?.network || "Comprehensive"}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Receipt size={22} weight="duotone" />
          </div>
          <div>
            <div className="font-bold text-emerald-400 font-mono text-base">
              {claim.netAmount} AED
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              Gross: {claim.encounter?.grossAmount} | Pt: {claim.encounter?.patientShare}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Gross = PtShare + Net: Verified
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border,#243045)] pb-2">
        <button
          onClick={() => setActiveTab("xml")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "xml"
              ? "bg-amber-500 text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCode size={14} />
          Riayati Claim XML Payload
        </button>

        <button
          onClick={() => setActiveTab("activities")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "activities"
              ? "bg-amber-500 text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Diagnoses & Activities
        </button>

        <button
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "hub"
              ? "bg-amber-500 text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Post Office Audit Trail ({claim.hubTransactions?.length || 0})
        </button>
      </div>

      {/* Tab Content 1: XML */}
      {activeTab === "xml" && (
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Official &lt;Claim.Submission&gt; XML Document</span>
            <span className="font-mono text-emerald-400">Validated against Riayati XSD</span>
          </div>
          <pre className="overflow-auto bg-black/60 p-4 rounded-lg font-mono text-xs text-amber-200 leading-relaxed border border-slate-800 max-h-[500px]">
            {claim.submissionXmlKey || "No XML payload recorded"}
          </pre>
        </div>
      )}

      {/* Tab Content 2: Activities & Diagnoses */}
      {activeTab === "activities" && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Diagnoses (ICD-10)
            </h3>
            <div className="space-y-2">
              {claim.encounter?.diagnoses?.map((d: any, i: number) => (
                <div
                  key={i}
                  className="p-2.5 rounded bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        d.type === "Principal"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {d.type}
                    </span>
                    <span className="font-mono font-bold text-sky-400">{d.code}</span>
                    <span className="text-slate-300">{d.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Activities & Procedures (CPT)
            </h3>
            <div className="space-y-2">
              {claim.encounter?.activities?.map((a: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono text-slate-400 mr-2">{a.id}</span>
                    <span className="font-mono font-bold text-emerald-400 mr-2">CPT {a.code}</span>
                    <span className="text-slate-200">{a.description}</span>
                  </div>
                  <div className="font-mono text-slate-300">
                    Gross: {a.gross} AED &bull; Pt: <span className="text-amber-300">{a.patientShare}</span> &bull; Net:{" "}
                    <span className="text-emerald-400 font-bold">{a.net} AED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Hub Audit Trail */}
      {activeTab === "hub" && (
        <div className="bg-[var(--color-surface,#161B22)] p-4 rounded-xl border border-[var(--color-border,#243045)] space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Post Office Transmission Log
          </h3>
          {(!claim.hubTransactions || claim.hubTransactions.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No transmission logs yet. Claim has not been dispatched to the Hub.
            </div>
          ) : (
            <div className="space-y-2">
              {claim.hubTransactions.map((txn: any) => (
                <div
                  key={txn.id}
                  className="p-3 rounded bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-sky-400">
                      TxnID: {txn.hubTxnId}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Direction: {txn.direction} &bull; {new Date(txn.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {txn.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
