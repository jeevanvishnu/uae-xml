"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useDoctor, DoctorEncounter } from "@/app/context/DoctorContext";
import {
  Stethoscope,
  MagnifyingGlass,
  Clock,
  CheckCircle,
  Warning,
  ArrowRight,
  ArrowUpRight,
  UsersThree,
  Pill,
  ShieldCheck,
  IdentificationCard,
  Hourglass,
} from "@phosphor-icons/react";

export default function DoctorQueuePage() {
  const router = useRouter();
  const { encounters, erxHistory, clinicianProfile, startConsultation } = useDoctor();
  const [filter, setFilter] = useState<"ALL" | DoctorEncounter["status"]>("ALL");
  const [search, setSearch] = useState("");

  const waitingPatients = encounters.filter((e) => e.status === "WAITING");
  const waitingCount = waitingPatients.length;
  const activeCount = encounters.filter((e) => e.status === "IN_CONSULTATION").length;
  const completedCount = encounters.filter((e) => e.status === "COMPLETED").length;
  const nextWaiting = waitingPatients[0] || null;

  const filtered = encounters.filter((e) => {
    const matchStatus = filter === "ALL" || e.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      e.patient.fullName.toLowerCase().includes(q) ||
      e.patient.emiratesId.toLowerCase().includes(q) ||
      e.tokenNumber.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleOpenWorkbench = (enc: DoctorEncounter) => {
    if (enc.status === "WAITING") {
      startConsultation(enc.id);
    }
    router.push(`/dashboard/doctor/consultation/${enc.id}`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top Header & Global Controls (Matching Receptionist Design Model) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Doctor Consultation Queue &amp; Workbench
          </h1>
          <p className="text-xs md:text-xs text-slate-500 mt-1">
            {clinicianProfile.name} &bull; {clinicianProfile.specialty} &bull;{" "}
            <span className="font-mono font-semibold text-slate-700">
              {clinicianProfile.licenseNo}
            </span>{" "}
            &bull; {clinicianProfile.roomNumber}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block w-64">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or token..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-md">
              &#8984; F
            </span>
          </div>

          {nextWaiting ? (
            <button
              type="button"
              onClick={() => handleOpenWorkbench(nextWaiting)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs md:text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Stethoscope size={16} weight="bold" />
              <span>Call Next ({nextWaiting.tokenNumber})</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 text-emerald-700 text-xs font-bold shadow-xs">
              <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
              <span>eClaimLink &amp; Riayati Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Hero Royal Blue Card + Clinical Vitals Cards (Matching Receptionist Row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Featured Royal Blue Hero Card */}
        <div className="md:col-span-5 lg:col-span-4 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 text-white p-6 shadow-md shadow-blue-600/15 flex flex-col justify-between min-h-[195px]">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-100 tracking-wider uppercase">
                Assigned Room Queue
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Patients Waiting
              </h2>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xs">
              <Hourglass size={18} weight="bold" />
            </div>
          </div>

          <div className="relative z-10 my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl lg:text-5xl font-black font-sans tracking-tight text-white">
                {waitingCount}
              </span>
              <span className="text-xs font-medium text-blue-100">
                Ready for Consultation
              </span>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 pt-1">
            {nextWaiting ? (
              <button
                type="button"
                onClick={() => handleOpenWorkbench(nextWaiting)}
                className="px-4 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start {nextWaiting.tokenNumber}</span>
                <ArrowUpRight size={14} weight="bold" />
              </button>
            ) : (
              <span className="px-4 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                Queue Clear
              </span>
            )}
            <button
              type="button"
              onClick={() => setFilter("WAITING")}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs backdrop-blur-sm transition-colors cursor-pointer"
            >
              Filter Waiting
            </button>
          </div>
        </div>

        {/* Clinical Summary Cards */}
        <div className="md:col-span-7 lg:col-span-8 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Consultation Shift Overview
              </h3>
              <p className="text-[11px] text-slate-500">
                Real-time clinical encounter &amp; eRx transmission status
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <ShieldCheck size={14} weight="fill" />
              Malaffi &amp; DHA Synced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  In Consultation
                </span>
                <span className="text-2xl font-black text-blue-600 font-mono mt-1 block">
                  {activeCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center">
                <UsersThree size={20} weight="duotone" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Completed Visits
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
                  {completedCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
                <CheckCircle size={20} weight="duotone" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  eRx Transmitted
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  {erxHistory.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center">
                <Pill size={20} weight="duotone" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Patient Queue Card (Matching Receptionist Row 3 Table Card) */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] shadow-xs overflow-hidden">
        {/* Top Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto scrollbar-none">
            {(["ALL", "WAITING", "IN_CONSULTATION", "COMPLETED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filter === st
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                    : "text-slate-600 hover:text-blue-700 hover:bg-white/60"
                }`}
              >
                {st === "ALL"
                  ? `All Encounters (${encounters.length})`
                  : st === "WAITING"
                  ? `Waiting (${waitingCount})`
                  : st === "IN_CONSULTATION"
                  ? `In Consultation (${activeCount})`
                  : `Completed (${completedCount})`}
              </button>
            ))}
          </div>

          <div className="sm:hidden relative w-full">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, token, or Emirates ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900"
            />
          </div>
        </div>

        {/* Queue Rows */}
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No patients match your current filter.
            </div>
          ) : (
            filtered.map((enc) => {
              const hasAllergies = enc.patient.allergies.length > 0;
              return (
                <div
                  key={enc.id}
                  className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold uppercase text-blue-500">
                        Token
                      </span>
                      <span className="text-xs font-mono font-extrabold">
                        {enc.tokenNumber}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {enc.patient.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {enc.patient.age}y &bull; {enc.patient.gender}
                        </span>
                        {enc.priority !== "NORMAL" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              enc.priority === "URGENT"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {enc.priority}
                          </span>
                        )}
                        {hasAllergies && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                            <Warning size={11} weight="fill" />
                            Allergies: {enc.patient.allergies.join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <IdentificationCard size={14} className="text-slate-400" />
                          {enc.patient.emiratesId}
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck size={14} weight="fill" />
                          {enc.insurance.planName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        enc.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : enc.status === "IN_CONSULTATION"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {enc.status === "WAITING" && <Clock size={13} />}
                      {enc.status === "IN_CONSULTATION" && <Stethoscope size={13} weight="fill" />}
                      {enc.status === "COMPLETED" && <CheckCircle size={13} weight="fill" />}
                      {enc.status === "COMPLETED"
                        ? "Completed"
                        : enc.status === "IN_CONSULTATION"
                        ? "In Consultation"
                        : "Waiting"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenWorkbench(enc)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
                    >
                      <span>
                        {enc.status === "COMPLETED"
                          ? "View Summary"
                          : enc.status === "IN_CONSULTATION"
                          ? "Resume Workbench"
                          : "Start Consultation"}
                      </span>
                      <ArrowRight size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
