"use client";

import React from "react";
import { DoctorEncounter } from "@/app/context/DoctorContext";
import { toast } from "sonner";
import {
  User,
  IdentificationCard,
  ShieldCheck,
  Warning,
  CheckCircle,
  Stethoscope,
  Copy,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/routing";

interface PatientClinicalHeaderProps {
  encounter: DoctorEncounter;
}

export function PatientClinicalHeader({ encounter }: PatientClinicalHeaderProps) {
  const { patient, insurance, clinician, tokenNumber, status } = encounter;
  const hasAllergies = patient.allergies && patient.allergies.length > 0;

  const copyEid = () => {
    navigator.clipboard.writeText(patient.emiratesId);
    toast.success("Emirates ID copied");
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-4">
      {/* Top Row: Back + Token + Patient Identity + Clinician Stamp */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <Link
            href="/dashboard/doctor"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
            title="Back to Patient Queue"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>

          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
            <User size={22} weight="duotone" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {patient.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {tokenNumber}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "IN_CONSULTATION"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {status === "COMPLETED"
                  ? "Visit Completed"
                  : status === "IN_CONSULTATION"
                  ? "In Consultation"
                  : "Waiting"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {patient.age} yrs &bull; {patient.gender}
              </span>
              <button
                type="button"
                onClick={copyEid}
                className="inline-flex items-center gap-1.5 font-mono text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                title="Copy Emirates ID"
              >
                <IdentificationCard size={14} className="text-slate-400" />
                <span>{patient.emiratesId}</span>
                <Copy size={12} className="text-slate-400" />
              </button>
              <span className="text-slate-400">DOB: {patient.dob}</span>
            </div>
          </div>
        </div>

        {/* Auto-linked Clinician License ID */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 self-start lg:self-auto">
          <Stethoscope size={18} className="text-blue-600 shrink-0" weight="duotone" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Attending Clinician (Auto-Linked)
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>{clinician.name}</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]">
                {clinician.licenseNo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Context Strip: Insurance Plan + Allergies Alert */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Insurance Plan Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
            <span>{insurance.planName}</span>
            <span className="text-emerald-600/70 font-mono text-[11px]">
              ({insurance.memberId})
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white text-emerald-700 text-[11px] font-bold border border-emerald-200">
              {insurance.copayPercent}% Co-pay
            </span>
          </div>

          {/* Allergies Alert Badge */}
          {hasAllergies ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <Warning size={16} weight="fill" className="text-red-600 animate-pulse" />
              <span>Allergies: {patient.allergies.join(", ")}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              <CheckCircle size={15} weight="fill" className="text-emerald-500" />
              <span>No Known Drug Allergies (NKDA)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Read-Only Clinical Context &bull; {clinician.roomNumber}
        </div>
      </div>
    </div>
  );
}
