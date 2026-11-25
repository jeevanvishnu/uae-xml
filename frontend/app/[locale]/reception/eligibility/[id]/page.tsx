"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldCheck,
  Code,
  Clock,
  CircleNotch,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
} from "@phosphor-icons/react";

interface HubTxn {
  id: string;
  referenceType: string;
  referenceId: string;
  direction: "OUTBOUND" | "INBOUND";
  hubTxnId: string;
  rawXml: string;
  status: string;
  createdAt: string;
}

export default function EligibilityAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<HubTxn[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<HubTxn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [patRes, histRes] = await Promise.all([
          api.get(`/patients/${id}`),
          api.get(`/patients/${id}/eligibility/history`),
        ]);

        if (patRes.data?.success) setPatient(patRes.data.data.patient);
        if (histRes.data?.success) {
          setHistory(histRes.data.data.history);
          if (histRes.data.data.history.length > 0) {
            setSelectedTxn(histRes.data.data.history[0]);
          }
        }
      } catch (err: any) {
        toast.error("Failed to load audit trail");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("XML copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/reception"
          className="text-xs font-medium text-[var(--color-secondary,#94A3B8)] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Riayati Hub XML Transaction Audit Trail
        </span>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400">
          <CircleNotch size={28} className="animate-spin mx-auto mb-2 text-sky-400" />
          Loading regulatory audit trail...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Transaction List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl p-4">
              <h3 className="font-semibold text-sm text-white">{patient?.fullName}</h3>
              <p className="text-xs font-mono text-sky-400 mt-0.5">
                {patient?.emiratesId || `Passport: ${patient?.passportNo}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Policy: {patient?.policies?.[0]?.payerName || "Self-Pay"}
              </p>
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Hub Transactions ({history.length})
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-6 bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl text-center text-xs text-slate-500">
                  No hub transactions logged yet for this patient.
                </div>
              ) : (
                history.map((t) => {
                  const isSelected = selectedTxn?.id === t.id;
                  const isOutbound = t.direction === "OUTBOUND";
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTxn(t)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-sky-500/10 border-sky-500/50"
                          : "bg-[var(--color-surface,#161B22)] border-[var(--color-border,#243045)] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isOutbound
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {t.direction}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(t.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 mt-1.5 truncate">
                        {t.hubTxnId || "Inquiry XML"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: XML Payload Viewer */}
          <div className="lg:col-span-8">
            {selectedTxn ? (
              <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
                  <div className="flex items-center gap-2">
                    <Code size={20} className="text-sky-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        {selectedTxn.hubTxnId}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {selectedTxn.direction} &bull; {new Date(selectedTxn.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(selectedTxn.rawXml || "")}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised,#202A3E)] hover:bg-[var(--color-border,#243045)] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--color-border,#243045)]"
                  >
                    <Copy size={14} /> Copy XML
                  </button>
                </div>

                <div className="bg-[var(--color-bg,#0D1117)] p-4 rounded-xl border border-[var(--color-border,#243045)] overflow-x-auto max-h-[480px]">
                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                    {selectedTxn.rawXml || "No XML payload stored"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl p-12 text-center text-xs text-slate-500">
                Select a transaction to inspect raw XML payload.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
