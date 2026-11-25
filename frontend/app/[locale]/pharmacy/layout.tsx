"use client";

import React from "react";
import { PharmacyProvider } from "@/app/context/PharmacyContext";
import { PharmacySidebar } from "@/app/components/pharmacy/PharmacySidebar";

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PharmacyProvider>
      <div className="min-h-screen bg-[#EFF2F6] text-slate-800 flex flex-col md:flex-row font-sans">
        <PharmacySidebar />
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </PharmacyProvider>
  );
}
