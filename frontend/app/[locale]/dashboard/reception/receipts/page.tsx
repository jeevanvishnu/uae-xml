"use client";

import React, { useState } from "react";
import { useReception, ReceiptRecord } from "@/app/context/ReceptionContext";
import { toast } from "sonner";
import {
  Receipt,
  Printer,
  CreditCard,
  Money,
  CheckCircle,
  MagnifyingGlass,
  User,
  Lock,
  LockOpen,
  X,
  FileCsv,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";

export default function DashboardFrontDeskReceiptsPage() {
  const { receipts, shift, setSelectedReceipt, closeShift, reopenShift } = useReception();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "CARD" | "CASH" | "WAIVED">("ALL");

  // Shift Closing Modal State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [physicalCashCount, setPhysicalCashCount] = useState<number>(
    shift.openingFloat + shift.cashCollected
  );
  const [closingNotes, setClosingNotes] = useState(
    "All POS terminal transaction batches settled. Cash counted and placed in safe."
  );

  // Filtered Receipts
  const filteredReceipts = receipts.filter((rc) => {
    if (paymentFilter === "CARD" && rc.paymentMethod !== "Card") return false;
    if (paymentFilter === "CASH" && rc.paymentMethod !== "Cash") return false;
    if (paymentFilter === "WAIVED" && rc.paymentMethod !== "Waived") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = rc.id.toLowerCase().includes(q);
      const matchToken = rc.tokenNumber.toLowerCase().includes(q);
      const matchPatient = rc.patientName.toLowerCase().includes(q);
      const matchEID = rc.emiratesId.toLowerCase().includes(q);
      const matchDoc = rc.doctorName.toLowerCase().includes(q);
      const matchPayer = rc.payerName.toLowerCase().includes(q);
      return matchId || matchToken || matchPatient || matchEID || matchDoc || matchPayer;
    }

    return true;
  });

  const expectedCashInDrawer = shift.openingFloat + shift.cashCollected;
  const cashVariance = physicalCashCount - expectedCashInDrawer;

  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    closeShift(closingNotes);
    toast.success("Shift Successfully Closed & Reconciled!", {
      description: `Daily Z-Report generated for ${shift.receptionistName}.`,
    });
    setIsClosingModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      "Receipt ID",
      "Token",
      "Date",
      "Patient Name",
      "Emirates ID",
      "Doctor",
      "Department",
      "Payer",
      "Gross Amount (AED)",
      "Co-Pay Collected (AED)",
      "Payment Channel",
      "Receptionist",
    ];

    const rows = receipts.map((r) => [
      r.id,
      r.tokenNumber,
      r.date,
      `"${r.patientName}"`,
      r.emiratesId,
      `"${r.doctorName}"`,
      `"${r.department}"`,
      `"${r.payerName}"`,
      r.grossAmount.toFixed(2),
      r.copayCollected.toFixed(2),
      r.paymentMethod,
      `"${r.receptionistName}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AlNoor_Receipts_Shift_${shift.shiftDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Daily receipts exported to CSV");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Page Title & Shift Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Receipt size={24} weight="duotone" />
            </span>
            <span>Front-Desk Receipts & Daily Cash Closing</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Audit patient co-pay receipts, POS terminal settlements, and daily receptionist shift accounting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileCsv size={16} weight="bold" className="text-blue-600" />
            <span>Export CSV</span>
          </button>

          {!shift.isClosed ? (
            <button
              onClick={() => {
                setPhysicalCashCount(expectedCashInDrawer);
                setIsClosingModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lock size={16} weight="bold" />
              <span>Close Shift & Z-Report</span>
            </button>
          ) : (
            <button
              onClick={reopenShift}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <LockOpen size={16} weight="bold" />
              <span>Reopen Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* End-of-Day Shift Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <User size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-base text-slate-900">{shift.receptionistName}</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
                  {shift.counterId}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    shift.isClosed
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${shift.isClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                  {shift.isClosed ? "Shift Closed" : "Active Shift"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {shift.shiftTitle} &bull; Date: <span className="font-mono text-slate-700 font-semibold">{shift.shiftDate}</span>
              </p>
            </div>
          </div>

          {shift.closedAt && (
            <div className="text-right text-xs text-slate-500 bg-[#F6F8FA] px-3.5 py-2 rounded-xl border border-slate-200/70">
              Closed at: <span className="font-mono text-slate-900 font-bold ml-1">{new Date(shift.closedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Financial Breakdown Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Cash Collections */}
          <div className="bg-[#F6F8FA] border border-slate-200/80 rounded-2xl p-4.5 transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Cash Co-Pays</span>
              <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-700">
                <Money size={18} weight="duotone" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black font-mono text-slate-900">
              {shift.cashCollected.toFixed(2)}{" "}
              <span className="text-xs text-emerald-600 font-bold">AED</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Drawer Float: <span className="font-mono text-slate-700 font-semibold">{shift.openingFloat.toFixed(2)} AED</span>
            </div>
          </div>

          {/* Card 2: Card / POS Collections */}
          <div className="bg-[#F6F8FA] border border-slate-200/80 rounded-2xl p-4.5 transition-all hover:border-blue-300">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Card / POS Terminals</span>
              <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                <CreditCard size={18} weight="duotone" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black font-mono text-slate-900">
              {shift.cardCollected.toFixed(2)}{" "}
              <span className="text-xs text-blue-600 font-bold">AED</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Merchant Batch Settled</div>
          </div>

          {/* Card 3: Total Expected Cash in Drawer */}
          <div className="bg-[#F6F8FA] border border-slate-200/80 rounded-2xl p-4.5 transition-all hover:border-amber-300">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Expected Cash in Drawer</span>
              <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-700">
                <CurrencyCircleDollar size={18} weight="duotone" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black font-mono text-slate-900">
              {expectedCashInDrawer.toFixed(2)}{" "}
              <span className="text-xs text-amber-600 font-bold">AED</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Float + Cash Collections</div>
          </div>

          {/* Card 4: Total Shift Revenue */}
          <div className="bg-[#F6F8FA] border border-slate-200/80 rounded-2xl p-4.5 transition-all hover:border-blue-300">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Revenue Collected</span>
              <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                <Receipt size={18} weight="duotone" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black font-mono text-blue-600">
              {shift.totalCollected.toFixed(2)}{" "}
              <span className="text-xs text-blue-700 font-bold">AED</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium">
              {shift.transactionCount} Receipts &bull; {shift.waivedCount} Waived
            </div>
          </div>
        </div>
      </div>

      {/* Patient Receipts List Table */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          {/* Payment Type Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#EFF2F6] rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setPaymentFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                paymentFilter === "ALL"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              All Receipts ({receipts.length})
            </button>
            <button
              onClick={() => setPaymentFilter("CARD")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                paymentFilter === "CARD"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              Card Only
            </button>
            <button
              onClick={() => setPaymentFilter("CASH")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                paymentFilter === "CASH"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              Cash Only
            </button>
            <button
              onClick={() => setPaymentFilter("WAIVED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                paymentFilter === "WAIVED"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              0 AED / Waived
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, patient, EID, or doctor..."
              className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-5 py-3.5">Receipt #</th>
                <th className="px-5 py-3.5">Token #</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Patient & Emirates ID</th>
                <th className="px-5 py-3.5">Doctor & Specialty</th>
                <th className="px-5 py-3.5">Payer / Insurance</th>
                <th className="px-5 py-3.5">Total / Co-Pay</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">
                    No receipts match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rc) => {
                  const formattedTime = new Date(rc.date).toLocaleTimeString("en-AE", {
                    timeZone: "Asia/Dubai",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={rc.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
                        {rc.id}
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                        {rc.tokenNumber}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 font-mono">
                        {formattedTime}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{rc.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{rc.emiratesId}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 font-semibold">{rc.doctorName}</div>
                        <div className="text-[10px] text-slate-500">{rc.department}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-slate-700 font-medium truncate max-w-[160px]">{rc.payerName}</div>
                        {rc.memberId && rc.memberId !== "N/A" && (
                          <div className="text-[10px] font-mono text-slate-400">{rc.memberId}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                          <span>{rc.copayCollected.toFixed(2)} AED</span>
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block ${
                              rc.paymentMethod === "Cash"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : rc.paymentMethod === "Card"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {rc.paymentMethod}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(rc)}
                            title="Reprint 80mm thermal receipt"
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Printer size={14} weight="bold" />
                            <span>Reprint</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* End-of-Day Shift Closing & Z-Report Modal */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-[24px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#F6F8FA]">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-blue-600" weight="bold" />
                <span>Daily Receptionist Shift Closing (Z-Report)</span>
              </h3>
              <button
                onClick={() => setIsClosingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseShift} className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-[#F6F8FA] border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Cashier:</span>
                  <span className="font-semibold text-slate-900">{shift.receptionistName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Terminal Station:</span>
                  <span className="font-mono text-slate-900 font-semibold">{shift.counterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Opening Cash Float:</span>
                  <span className="font-mono text-slate-900 font-semibold">{shift.openingFloat.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Cash Co-Pays Collected:</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    +{shift.cashCollected.toFixed(2)} AED
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span className="text-slate-800">Expected Physical Cash:</span>
                  <span className="font-mono text-blue-700 text-sm">
                    {expectedCashInDrawer.toFixed(2)} AED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Total Card (POS) Settled:</span>
                  <span className="font-mono text-slate-700 font-semibold">{shift.cardCollected.toFixed(2)} AED</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Physical Cash Counted in Drawer (AED) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={physicalCashCount}
                  onChange={(e) => setPhysicalCashCount(Number(e.target.value))}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-medium ${
                  cashVariance === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <span>Cash Variance (Physical vs. Expected):</span>
                <span className="font-mono font-bold text-sm">
                  {cashVariance > 0 ? `+${cashVariance.toFixed(2)}` : cashVariance.toFixed(2)} AED{" "}
                  {cashVariance === 0 ? "(Balanced)" : "(Variance Detected)"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Shift Handover Remarks & Reconciliation Notes
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  Confirm & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
