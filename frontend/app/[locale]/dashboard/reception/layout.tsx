"use client";

import React from "react";
import { ReceptionProvider, useReception } from "@/app/context/ReceptionContext";
import { ReceptionSidebar } from "@/app/components/reception/ReceptionSidebar";
import { ReceiptModal } from "@/app/components/reception/ReceiptModal";

function ReceptionModalHost() {
  const { selectedReceipt, setSelectedReceipt } = useReception();
  return (
    <ReceiptModal
      receipt={selectedReceipt}
      onClose={() => setSelectedReceipt(null)}
    />
  );
}

export default function DashboardReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReceptionProvider>
      <div className="min-h-screen bg-[#EFF2F6] text-slate-800 flex flex-col md:flex-row font-sans">
        {/* Full-Height Persistent Reception Sidebar */}
        <ReceptionSidebar />

        {/* Main Workstation Workspace */}
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto min-h-screen">
          {children}
        </main>

        <ReceptionModalHost />
      </div>
    </ReceptionProvider>
  );
}
