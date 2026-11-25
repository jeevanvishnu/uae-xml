"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import {
  usePharmacy,
  ErxDispenseStatus,
  ErxSource,
  ErxOrder,
} from "@/app/context/PharmacyContext";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  CloudArrowDown,
  Clock,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  Buildings,
  GlobeHemisphereEast,
  Pill,
  ShieldCheck,
  UserCheck,
} from "@phosphor-icons/react";

type StatusFilter = "ALL" | ErxDispenseStatus;
type SourceFilter = "ALL" | ErxSource;

const STATUS_BADGE: Record<
  ErxDispenseStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  PENDING_DISPENSE: {
    label: "PENDING_DISPENSE",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  PARTIALLY_DISPENSED: {
    label: "PARTIALLY_DISPENSED",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: WarningCircle,
  },
  DISPENSED: {
    label: "DISPENSED",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
};

export default function PharmacyQueuePage() {
  const router = useRouter();
  const {
    erxQueue,
    facilityProfile,
    setActiveErxId,
    pullExternalErxFromHub,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  const stats = useMemo(() => {
    const pending = erxQueue.filter((e) => e.status === "PENDING_DISPENSE").length;
    const partial = erxQueue.filter((e) => e.status === "PARTIALLY_DISPENSED").length;
    const dispensed = erxQueue.filter((e) => e.status === "DISPENSED").length;
    const external = erxQueue.filter((e) => e.source === "EXTERNAL_HUB").length;
    return { pending, partial, dispensed, external };
  }, [erxQueue]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return erxQueue.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && order.source !== sourceFilter) return false;
      if (!q) return true;

      return (
        order.erxRefNo.toLowerCase().includes(q) ||
        order.patient.emiratesId.toLowerCase().includes(q) ||
        order.patient.fullName.toLowerCase().includes(q) ||
        order.prescriber.licenseNo.toLowerCase().includes(q)
      );
    });
  }, [erxQueue, statusFilter, sourceFilter, searchQuery]);

  const handleOpenWorkbench = (order: ErxOrder) => {
    setActiveErxId(order.id);
    router.push(`/pharmacy/dispense/${order.id}`);
  };

  const handleHubPull = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      toast.info("Enter an Emirates ID or eRx Reference Number to pull from the government hub.");
      return;
    }
    const pulled = pullExternalErxFromHub(q);
    if (pulled) {
      toast.success(
        pulled.source === "EXTERNAL_HUB"
          ? `Retrieved ${pulled.erxRefNo} from MoHAP Riayati / DHA Hub`
          : `Located ${pulled.erxRefNo} in clinic queue`
      );
      setStatusFilter("ALL");
      setSourceFilter("ALL");
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {facilityProfile.pharmacyLicenseId}
            </span>
            <span className="text-xs text-slate-500">
              Pharmacist: <span className="font-mono font-semibold text-slate-700">{facilityProfile.pharmacistLicenseId}</span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Incoming eRx Queue &amp; Patient Lookup
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search active prescriptions by <span className="font-semibold text-slate-700">Emirates ID</span> or <span className="font-semibold text-slate-700">eRx Reference Number</span> from internal clinics and the government eRx hub.
          </p>
        </div>

        {/* Emirates ID / eRx Lookup & Gov Hub Pull */}
        <form onSubmit={handleHubPull} className="flex items-center gap-2 w-full lg:w-[480px]">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Emirates ID (784-...) or eRx Ref (ERX-...)"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-colors cursor-pointer shrink-0"
          >
            <CloudArrowDown size={16} weight="bold" />
            <span>Pull from Hub</span>
          </button>
        </form>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pending Dispense
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600 font-mono">
              {stats.pending}
            </span>
            <span className="text-[11px] text-slate-500">Awaiting Tatmeen</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Partially Dispensed
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-600 font-mono">
              {stats.partial}
            </span>
            <span className="text-[11px] text-slate-500">Remaining balance</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Dispensed Today
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-600 font-mono">
              {stats.dispensed}
            </span>
            <span className="text-[11px] text-slate-500">Claim ready</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Gov Hub External eRx
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {stats.external}
            </span>
            <span className="text-[11px] text-slate-500">Riayati / eClaimLink</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "ALL", label: "All Prescriptions" },
              { id: "PENDING_DISPENSE", label: "Pending Dispense" },
              { id: "PARTIALLY_DISPENSED", label: "Partially Dispensed" },
              { id: "DISPENSED", label: "Dispensed" },
            ] as { id: StatusFilter; label: string }[]
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Source:</span>
          {(
            [
              { id: "ALL", label: "All Sources" },
              { id: "INTERNAL_CLINIC", label: "Internal Clinic" },
              { id: "EXTERNAL_HUB", label: "Gov Hub" },
            ] as { id: SourceFilter; label: string }[]
          ).map((src) => {
            const active = sourceFilter === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => setSourceFilter(src.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {src.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">eRx Ref &amp; Source</th>
                <th className="py-3.5 px-4">Patient &amp; Emirates ID</th>
                <th className="py-3.5 px-4">Prescribing Doctor</th>
                <th className="py-3.5 px-4">Insurance Status</th>
                <th className="py-3.5 px-4">Rx Lines &amp; ICD-10</th>
                <th className="py-3.5 px-4">eRx Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No prescriptions match your search or filter. Try pulling an external eRx from the Gov Hub.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusMeta = STATUS_BADGE[order.status];
                  const StatusIcon = statusMeta.icon;
                  const isExternal = order.source === "EXTERNAL_HUB";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenWorkbench(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900">
                          {order.erxRefNo}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isExternal
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isExternal ? (
                              <GlobeHemisphereEast size={11} weight="bold" />
                            ) : (
                              <Buildings size={11} weight="bold" />
                            )}
                            {isExternal ? "External Gov Hub" : "Internal Clinic"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {order.createdAt}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <UserCheck size={14} className="text-emerald-600 shrink-0" />
                          <span>{order.patient.fullName}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                          {order.patient.emiratesId}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {order.patient.gender} &bull; DOB {order.patient.dob}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-800">
                          {order.prescriber.name}
                        </div>
                        <div className="font-mono text-[11px] text-blue-700 font-semibold mt-0.5">
                          {order.prescriber.licenseNo}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {order.prescriber.facilityName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              order.insurance.eligibilityStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            <ShieldCheck size={11} weight="fill" />
                            {order.insurance.eligibilityStatus}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 mt-1">
                          {order.insurance.payerName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Co-pay {order.insurance.copayPercent}% (Cap {order.insurance.copayCap} AED)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Pill size={14} className="text-emerald-600" />
                          <span>{order.medications.length} Meds</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {order.diagnoses.map((d) => (
                            <span
                              key={d.code}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200"
                            >
                              {d.code}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${statusMeta.className}`}
                        >
                          <StatusIcon size={12} weight="fill" />
                          {statusMeta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWorkbench(order);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>{order.status === "DISPENSED" ? "Inspect" : "Dispense"}</span>
                          <ArrowRight size={14} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
