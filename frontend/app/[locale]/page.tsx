"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  Hospital,
  IdentificationCard,
  Stethoscope,
  Pill,
  Receipt,
  Money,
  Buildings,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  SignIn,
} from "@phosphor-icons/react";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.role === "doctor") router.replace("/doctor");
      else if (user?.role === "pharmacist") router.replace("/pharmacy");
      else if (user?.role === "billing") router.replace("/billing");
      else if (user?.role === "reception") router.replace("/reception");
      else router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  const personas = [
    {
      role: "Reception Desk",
      desc: "Emirates ID reading, smart card check-in, real-time Riayati PriorRequest insurance eligibility checks.",
      href: "/reception",
      icon: IdentificationCard,
      color: "text-sky-400",
      border: "hover:border-sky-500/50",
    },
    {
      role: "Doctor Consultation",
      desc: "Clinical documentation, ICD-10 medical coding (1 Principal mandatory), CPT activities, and eRx prescribing.",
      href: "/doctor",
      icon: Stethoscope,
      color: "text-purple-400",
      border: "hover:border-purple-500/50",
    },
    {
      role: "Pharmacy Hub",
      desc: "Instant eRx lookup, DDC UAE Drug Formulary verification, copay calculations & medication dispensing.",
      href: "/pharmacy",
      icon: Pill,
      color: "text-emerald-400",
      border: "hover:border-emerald-500/50",
    },
    {
      role: "Billing & Claims",
      desc: "Pre-submission XSD validations, <Claim.Submission> XML serialization & direct transmission to Riayati Post Office.",
      href: "/billing",
      icon: Receipt,
      color: "text-amber-400",
      border: "hover:border-amber-500/50",
    },
    {
      role: "Remittance Reconciliation",
      desc: "Parse incoming <RemittanceAdvice> XML, investigate denial codes, and resubmit corrected claims.",
      href: "/billing/remittance",
      icon: Money,
      color: "text-rose-400",
      border: "hover:border-rose-500/50",
    },
    {
      role: "Facility Administration",
      desc: "Manage facility SenderID, MoHAP Riayati / DHA eClaimLink switches, and licensed healthcare clinicians.",
      href: "/admin/facility",
      icon: Buildings,
      color: "text-indigo-400",
      border: "hover:border-indigo-500/50",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg,#0D1117)] text-slate-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[var(--color-border,#243045)] bg-[var(--color-surface,#161B22)] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Hospital size={24} weight="duotone" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">
              UAE Healthcare & Insurance e-Claims
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                MoHAP Riayati & DHA eClaimLink
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                SenderID: FAC-MOH-98765
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-500/20"
            >
              <span>Go to Operations Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-500/20"
            >
              <SignIn size={16} />
              <span>Sign In to Healthcare Portal</span>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <ShieldCheck size={16} weight="fill" />
            Federal Standard XML Integration & Post Office Hub Connector
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            UAE Healthcare Insurance & e-Claims Management
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Full-lifecycle insurance claims integration platform engineered strictly to UAE MoHAP Riayati and DHA eClaimLink regulations. Pure DB JWT authentication with zero external caching.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <span>Explore Role Dashboards</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>

        {/* 6 Core Functional Persona Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personas.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.href}
                href={p.href}
                className={`bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] ${p.border} rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-xl`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-xl bg-[var(--color-surface-raised,#192131)] flex items-center justify-center ${p.color} border border-slate-700/50`}>
                    <Icon size={26} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-sky-400 transition-colors">
                      {p.role}
                    </h3>
                    <p className="text-xs text-[var(--color-muted,#64748B)] mt-1.5 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--color-border,#243045)] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-sky-400">
                  <span>Enter Workspace</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border,#243045)] bg-[var(--color-surface,#161B22)] px-6 py-4 text-center text-xs text-slate-400">
        Al Noor Medical Center &bull; Riayati Post Office Switch (TEST) &bull; Compliant with MoHAP & DHA eClaimLink Standards
      </footer>
    </div>
  );
}
