"use client";

import React, { useState, useMemo } from "react";
import { Link } from "@/i18n/routing";
import {
  useBilling,
  evaluateScrubbing,
  BillingClaim,
} from "@/app/context/BillingContext";
import { ScrubbingDrawer } from "@/app/components/billing/ScrubbingDrawer";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  ClipboardText,
  Package,
  SlidersHorizontal,
  ArrowRight,
  Wrench,
} from "@phosphor-icons/react";

type FilterTab = "ALL" | "CLEAN" | "BLOCKED" | "QUEUED";

export default function ClaimsWorkbenchPage() {
  const {
    claims,
    facilityProfile,
    promoteClaimToBatch,
    promoteAllCleanClaims,
  } = useBilling();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const selectedClaim = useMemo(
    () => claims.find((c) => c.id === selectedClaimId) || null,
    [claims, selectedClaimId]
  );

  const enrichedClaims = useMemo(
    () =>
      claims.map((claim) => ({
        claim,
        scrub: evaluateScrubbing(claim),
      })),
    [claims]
  );

  const stats = useMemo(() => {
    const readyToday = enrichedClaims.filter(
      (x) => x.claim.workflowStatus === "READY_FOR_CLAIM"
    );
    const clean = readyToday.filter((x) => x.scrub.passed);
    const blocked = readyToday.filter((x) => !x.scrub.passed);
    const queued = enrichedClaims.filter(
      (x) => x.claim.workflowStatus !== "READY_FOR_CLAIM"
    );
    return {
      readyCount: readyToday.length,
      readyGross: readyToday.reduce((s, x) => s + x.claim.grossAmount, 0),
      cleanCount: clean.length,
      blockedCount: blocked.length,
      queuedCount: queued.length,
      queuedNet: queued.reduce((s, x) => s + x.claim.netAmount, 0),
    };
  }, [enrichedClaims]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedClaims.filter(({ claim, scrub }) => {
      if (filter === "CLEAN") {
        if (claim.workflowStatus !== "READY_FOR_CLAIM" || !scrub.passed)
          return false;
      } else if (filter === "BLOCKED") {
        if (claim.workflowStatus !== "READY_FOR_CLAIM" || scrub.passed)
          return false;
      } else if (filter === "QUEUED") {
        if (claim.workflowStatus === "READY_FOR_CLAIM") return false;
      }

      if (!q) return true;
      const icdMatch = claim.diagnoses.some((d) =>
        d.code.toLowerCase().includes(q)
      );
      return (
        claim.patient.fullName.toLowerCase().includes(q) ||
        claim.patient.emiratesId.toLowerCase().includes(q) ||
        claim.claimNumber.toLowerCase().includes(q) ||
        claim.insurance.receiverId.toLowerCase().includes(q) ||
        icdMatch
      );
    });
  }, [enrichedClaims, filter, search]);

  const handlePromoteAll = () => {
    const count = promoteAllCleanClaims();
    if (count > 0) {
      toast.success(
        `Moved ${count} clean claim${count > 1 ? "s" : ""} to ReceiverID XML batches`
      );
    } else {
      toast.info("No clean READY_FOR_CLAIM visits waiting to be queued.");
    }
  };

  const handleQuickPromote = (claim: BillingClaim) => {
    const ok = promoteClaimToBatch(claim.id);
    if (ok) {
      toast.success(
        `${claim.claimNumber} queued for ${claim.insurance.receiverId} XML batch`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Home Screen
            </span>
            <span className="text-xs font-mono text-slate-500">
              {facilityProfile.licenseNo} &bull; Today&apos;s Queue
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Claims Workbench &amp; Scrubbing Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visits marked <span className="font-mono font-semibold text-slate-700">READY_FOR_CLAIM</span> by physicians today. All 4 UAE scrubbing gates must pass before XML batching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient, Emirates ID, Payer, ICD-10..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={handlePromoteAll}
            disabled={stats.cleanCount === 0}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              stats.cleanCount > 0
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <ShieldCheck size={16} weight="bold" />
            <span>Queue All Clean ({stats.cleanCount})</span>
          </button>

          <Link
            href="/billing/batches"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <Package size={16} className="text-blue-600" />
            <span>Go to Batches</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Ready for Claim (Today)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardText size={18} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {stats.readyCount}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Gross: AED {stats.readyGross.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Scrubbing Passed (Clean)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={18} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            {stats.cleanCount}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            4/4 UAE gates verified
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Blocked (Action Needed)
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <WarningCircle size={18} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-red-600 mt-2">
            {stats.blockedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Click row to fix ICD-10 / Auth / Math
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Queued for XML Batch
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package size={18} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2">
            {stats.queuedCount}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Net: AED {stats.queuedNet.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Tabs + Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />
            {(
              [
                { id: "ALL", label: `All Visits (${enrichedClaims.length})` },
                { id: "CLEAN", label: `Clean (${stats.cleanCount})` },
                { id: "BLOCKED", label: `Blocked (${stats.blockedCount})` },
                { id: "QUEUED", label: `In Batch Queue (${stats.queuedCount})` },
              ] as { id: FilterTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === tab.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Encounter / Claim</th>
                <th className="py-3.5 px-4">Patient &amp; Emirates ID</th>
                <th className="py-3.5 px-4">Payer (ReceiverID)</th>
                <th className="py-3.5 px-4">Scrubbing Gates (4)</th>
                <th className="py-3.5 px-4 text-right">Financials (AED)</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map(({ claim, scrub }) => {
                const isQueued = claim.workflowStatus !== "READY_FOR_CLAIM";
                return (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">
                        {claim.claimNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {claim.encounterId} &bull; {claim.readyTime}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">
                        {claim.patient.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        {claim.patient.emiratesId}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {claim.insurance.receiverId}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {claim.insurance.memberId}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            ["ICD-10", scrub.checks.principalIcd.passed],
                            ["Math", scrub.checks.mathBalance.passed],
                            ["IDs", scrub.checks.activeIds.passed],
                            ["Auth", scrub.checks.priorAuth.passed],
                          ] as [string, boolean][]
                        ).map(([label, ok]) => (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              ok
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {ok ? "✓" : "✕"} {label}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right font-mono">
                      <div className="font-bold text-slate-900">
                        Net {claim.netAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gross {claim.grossAmount.toFixed(2)} &bull; Share{" "}
                        {claim.patientShare.toFixed(2)}
                      </div>
                    </td>

                    <td
                      className="py-4 px-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isQueued ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Package size={13} weight="fill" />
                          {claim.workflowStatus === "SUBMITTED_TO_HUB"
                            ? "Submitted"
                            : "In Batch"}
                        </span>
                      ) : scrub.passed ? (
                        <button
                          type="button"
                          onClick={() => handleQuickPromote(claim)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-xs cursor-pointer"
                        >
                          <ShieldCheck size={14} weight="bold" />
                          Queue Batch
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedClaimId(claim.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold cursor-pointer"
                        >
                          <Wrench size={14} weight="bold" />
                          Fix ({scrub.passedCount}/4)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-slate-500"
                  >
                    No claims match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScrubbingDrawer
        claim={selectedClaim}
        onClose={() => setSelectedClaimId(null)}
      />
    </div>
  );
}
