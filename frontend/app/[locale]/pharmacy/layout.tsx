"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { HealthcareNav } from "@/app/components/HealthcareNav";

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg,#0D1117)] text-[var(--color-primary,#E2E8F0)] flex flex-col font-sans">
      <HealthcareNav
        currentModuleTitle="Pharmacy e-Prescription (eRx) Verification & Medication Dispensing Desk"
        badgeText="Pharmacist"
        badgeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
