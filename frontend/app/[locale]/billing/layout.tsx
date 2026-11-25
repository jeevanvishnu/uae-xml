"use client";

import React from "react";
import { BillingProvider } from "@/app/context/BillingContext";
import { BillingSidebar } from "@/app/components/billing/BillingSidebar";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillingProvider>
      <div className="min-h-screen bg-[#EFF2F6] text-slate-800 flex flex-col md:flex-row font-sans">
        <BillingSidebar />
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </BillingProvider>
  );
}
