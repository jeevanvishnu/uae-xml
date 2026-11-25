"use client";

import React from "react";
import { DoctorProvider } from "@/app/context/DoctorContext";
import { DoctorSidebar } from "@/app/components/doctor/DoctorSidebar";

export default function DashboardDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorProvider>
      <div className="min-h-screen bg-[#EFF2F6] text-slate-800 flex flex-col md:flex-row font-sans">
        <DoctorSidebar />
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </DoctorProvider>
  );
}
