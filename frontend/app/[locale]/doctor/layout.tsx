"use client";

import React from "react";
import { HealthcareNav } from "@/app/components/HealthcareNav";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen bg-[var(--color-bg,#0D1117)] text-[var(--color-primary,#E2E8F0)] flex flex-col font-sans">
      <HealthcareNav
        currentModuleTitle="Doctor Clinical Consultation & Medical Coding Workspace (ICD-10 / CPT)"
        badgeText="Physician"
        badgeColor="text-purple-400 bg-purple-500/10 border-purple-500/20"
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
