"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { useBilling, RemittanceLine } from "@/app/context/BillingContext";
import { RemittanceIngestModal } from "@/app/components/billing/RemittanceIngestModal";
import { toast } from "sonner";
import {
  UploadSimple,
  CloudArrowDown,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowsClockwise,
  Receipt,
} from "@phosphor-icons/react";

type StatusFilter = "ALL" | "PAID" | "PARTIAL" | "REJECTED";

export default function RemittanceReconciliationPage() {
  const router = useRouter();
  const {
    remittanceLines,
    autoFetchRemittanceFromHub,
    sendLineToResubmission,
  } = useBilling();

  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const metrics = useMemo(() => {
    const claimed = remittanceLines.reduce((s, r) => s + r.net, 0);
    const approved = remittanceLines.reduce((s, r) => s + r.approvedAmount, 0);
    const denied = remittanceLines.reduce((s, r) => s + r.deniedAmount, 0);
    const rate = claimed > 0 ? Math.round((approved / claimed) * 100) : 0;
    return { claimed, approved, denied, rate };
  }, [remittanceLines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return remittanceLines.filter((line) => {
      if (statusFilter !== "ALL" && line.status !== statusFilter) return false;
      if (!q) return true;
      return (
        line.claimNumber.toLowerCase().includes(q) ||
        line.patientName.toLowerCase().includes(q) ||
        line.receiverId.toLowerCase().includes(q) ||
        (line.denialCode || "").toLowerCase().includes(q) ||
        line.activityCode.toLowerCase().includes(q)
      );
    });
  }, [remittanceLines, statusFilter, search]);

  const handleAutoFetch = () => {
    const count = autoFetchRemittanceFromHub();
    toast.success(
      `Fetched ${count} new remittance lines from eClaimLink / Riayati Hub`
    );
  };

  const handleSendToResubmission = (line: RemittanceLine) => {
    const draftId = sendLineToResubmission(line.id);
    toast.info(`Opened ${line.claimNumber} in Denial Management`);
    router.push(`/billing/resubmissions?draftId=${draftId}`);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Remittance Advice &amp; Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload or auto-fetch payer <span className="font-mono font-semibold text-slate-700">RemittanceAdvice.xml</span> files to reconcile Approved vs. Denied AED and exact UAE Denial Codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsIngestOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
          >
            <UploadSimple size={16} weight="bold" className="text-blue-600" />
            <span>Upload RemittanceAdvice.xml</span>
          </button>

          <button
            type="button"
            onClick={handleAutoFetch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <CloudArrowDown size={16} weight="bold" />
            <span>Auto-Fetch from Hub</span>
          </button>
        </div>
      </div>

      {/* KPI Strip + Collection Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Claimed (Net)
          </span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            AED {metrics.claimed.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {remittanceLines.length} adjudicated lines
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Approved &amp; Paid
          </span>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-2">
            AED {metrics.approved.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            Settled by payers
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Denied / Rejected
          </span>
          <div className="text-2xl font-extrabold font-mono text-red-600 mt-2">
            AED {metrics.denied.toFixed(2)}
          </div>
          <div className="text-[11px] text-red-600 mt-1">
            Eligible for resubmission
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              First-Pass Collection Rate
            </span>
            <span className="text-xs font-mono font-bold text-blue-700">
              {metrics.rate}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-red-100 overflow-hidden mt-3 flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${metrics.rate}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>Approved ({metrics.rate}%)</span>
            <span>Denied ({100 - metrics.rate}%)</span>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "PAID", "PARTIAL", "REJECTED"] as StatusFilter[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {tab === "ALL" ? "All Lines" : tab}
                </button>
              )
            )}
          </div>

          <div className="relative w-64">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Claim #, Denial Code, Payer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Claim &amp; Activity</th>
                <th className="py-3.5 px-4">Patient &amp; Payer</th>
                <th className="py-3.5 px-4 text-right">Claimed Net</th>
                <th className="py-3.5 px-4 text-right">Approved</th>
                <th className="py-3.5 px-4 text-right">Denied</th>
                <th className="py-3.5 px-4">UAE Denial Code &amp; Remark</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/70">
                  <td className="py-4 px-5">
                    <div className="font-mono font-bold text-slate-900">
                      {line.claimNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold text-slate-700">
                        CPT {line.activityCode}
                      </span>{" "}
                      &bull; {line.activityDescription}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-900">
                      {line.patientName}
                    </div>
                    <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {line.receiverId}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right font-mono font-semibold text-slate-700">
                    AED {line.net.toFixed(2)}
                  </td>

                  <td className="py-4 px-4 text-right font-mono font-bold text-emerald-700">
                    AED {line.approvedAmount.toFixed(2)}
                  </td>

                  <td className="py-4 px-4 text-right font-mono font-bold text-red-600">
                    AED {line.deniedAmount.toFixed(2)}
                  </td>

                  <td className="py-4 px-4 max-w-xs">
                    {line.denialCode ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                          {line.denialCode}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {line.payerRemark || line.denialLabel}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={12} weight="fill" /> Paid in Full
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-right">
                    {line.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <Receipt size={14} /> Reconciled
                      </span>
                    ) : line.resubmissionStatus === "RESUBMITTED" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <CheckCircle size={13} weight="fill" /> Resubmitted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendToResubmission(line)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold cursor-pointer"
                      >
                        <ArrowsClockwise size={14} weight="bold" />
                        <span>Fix &amp; Resubmit</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-xs text-slate-500"
                  >
                    No remittance lines match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RemittanceIngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
      />
    </div>
  );
}
