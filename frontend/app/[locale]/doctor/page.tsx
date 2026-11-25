"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import {
  Stethoscope,
  PlusCircle,
  MagnifyingGlass,
  Clock,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  User,
  ShieldCheck,
  CreditCard,
  FileText,
  CalendarBlank,
} from "@phosphor-icons/react";

interface Encounter {
  id: string;
  encounterType: string;
  startTime: string;
  endTime?: string;
  grossAmount: number;
  patientShare: number;
  netAmount: number;
  claimStatus: "DRAFT" | "READY" | "SUBMITTED" | "APPROVED" | "REJECTED";
  paymentStatus: "UNPAID" | "COLLECTED" | "WAIVED";
  diagnoses: any[];
  activities: any[];
  patientId: string;
  patient?: {
    id: string;
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
    eligibilityStatus: string;
  };
}

export default function DoctorConsultationQueue() {
  const router = useRouter();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchEncounters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/encounters");
      if (res.data?.success) {
        setEncounters(res.data.data.encounters || []);
      }
    } catch (err: any) {
      toast.error("Failed to load patient queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, []);

  const filtered = encounters.filter((e) => {
    const matchesStatus =
      filterStatus === "ALL" || e.claimStatus === filterStatus;
    const nameMatch = e.patient?.fullName
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const eidMatch = e.patient?.emiratesId
      ?.toLowerCase()
      .includes(search.toLowerCase());
    return matchesStatus && (nameMatch || eidMatch || search === "");
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Stethoscope className="text-sky-400" size={26} weight="duotone" />
            Doctor Consultation Workspace
          </h1>
          <p className="text-xs text-[var(--color-muted,#64748B)] mt-1">
            Review checked-in patients, document clinical findings, code ICD-10 & CPT procedures, and issue e-prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reception"
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusCircle size={16} weight="bold" />
            Check-In New Patient
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted,#64748B)]"
          />
          <input
            type="text"
            placeholder="Search patient name or Emirates ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-[var(--color-muted,#64748B)] focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {["ALL", "DRAFT", "READY", "SUBMITTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === st
                  ? "bg-[var(--color-surface-raised,#202A3E)] text-sky-400 border border-sky-500/30"
                  : "text-[var(--color-muted,#64748B)] hover:text-white"
              }`}
            >
              {st === "ALL" ? "All Visits" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List Table */}
      <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border,#243045)] bg-[var(--color-surface-raised,#1C2433)] text-[11px] font-semibold uppercase text-[var(--color-muted,#64748B)] tracking-wider">
                <th className="py-3 px-4">Patient Info</th>
                <th className="py-3 px-4">Coverage & Copay</th>
                <th className="py-3 px-4">Diagnoses (ICD-10)</th>
                <th className="py-3 px-4">Activities (CPT)</th>
                <th className="py-3 px-4">Financials (AED)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border,#243045)] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading consultation queue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No consultation encounters found.
                  </td>
                </tr>
              ) : (
                filtered.map((enc) => {
                  const hasPrincipal = enc.diagnoses?.some(
                    (d) => d.type === "Principal"
                  );
                  return (
                    <tr
                      key={enc.id}
                      className="hover:bg-[var(--color-surface-raised,#192131)]/50 transition-colors"
                    >
                      {/* Patient Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {enc.patient?.fullName || "Walk-In Patient"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{enc.patient?.emiratesId || "No EID (Self-Pay)"}</span>
                          <span>&bull;</span>
                          <span>{enc.patient?.gender === "M" ? "Male" : "Female"}</span>
                        </div>
                      </td>

                      {/* Coverage & Copay */}
                      <td className="py-3.5 px-4">
                        {enc.policy ? (
                          <div>
                            <div className="font-medium text-slate-200">
                              {enc.policy.payerName}
                            </div>
                            <div className="text-[11px] text-sky-400 font-mono mt-0.5">
                              {enc.policy.copayPercent}% Copay (Cap: {enc.policy.copayCap} AED)
                            </div>
                          </div>
                        ) : (
                          <div className="text-amber-400 font-medium">Self-Pay (100% Cash)</div>
                        )}
                      </td>

                      {/* Diagnoses */}
                      <td className="py-3.5 px-4">
                        {enc.diagnoses && enc.diagnoses.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {enc.diagnoses.map((d, i) => (
                              <span
                                key={i}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  d.type === "Principal"
                                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold"
                                    : "bg-slate-700/50 text-slate-300"
                                }`}
                                title={d.description}
                              >
                                {d.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-400/80 text-[11px] flex items-center gap-1">
                            <WarningCircle size={14} /> Missing ICD-10
                          </span>
                        )}
                      </td>

                      {/* Activities */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {enc.activities?.length || 0} items
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-white text-xs">
                          {enc.grossAmount} AED
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Pt: <span className="text-amber-300">{enc.patientShare}</span> | Net:{" "}
                          <span className="text-emerald-400">{enc.netAmount}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            enc.claimStatus === "READY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : enc.claimStatus === "DRAFT"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {enc.claimStatus === "READY" ? (
                            <CheckCircle size={12} weight="fill" />
                          ) : (
                            <Clock size={12} />
                          )}
                          {enc.claimStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/doctor/encounters/${enc.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised,#202A3E)] hover:bg-sky-500 hover:text-white text-sky-400 text-xs font-medium transition-all"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight size={14} />
                        </Link>
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
