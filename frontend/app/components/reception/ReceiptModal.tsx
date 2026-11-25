"use client";

import React from "react";
import { ReceiptRecord, useReception } from "@/app/context/ReceptionContext";
import {
  Printer,
  X,
  CheckCircle,
  ShareNetwork,
  DownloadSimple,
  Hospital,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";

interface ReceiptModalProps {
  receipt: ReceiptRecord | null;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
    toast.success("Sending receipt to thermal receipt printer (80mm)...");
  };

  const handleDownload = () => {
    toast.info(`Receipt ${receipt.id} prepared for download.`);
  };

  const formattedDate = new Date(receipt.date).toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {receipt.receiptType === "CASH_INVOICE" ? "Official Cash Receipt" : "Co-Pay Collection Receipt"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Print (80mm)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Printable White Thermal Docket Simulation */}
          <div
            id="thermal-receipt"
            className="bg-white text-slate-900 rounded-xl p-5 shadow-inner border border-slate-200 font-mono text-xs space-y-3 leading-relaxed"
          >
            {/* Clinic Branding */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <div className="font-bold text-sm tracking-wider uppercase text-slate-950">
                Al Noor Medical Center LLC
              </div>
              <div className="text-[11px] text-slate-600">مركز النور الطبي ذ.م.م</div>
              <div className="text-[10px] text-slate-500 mt-1">
                DHA Facility ID: FAC-DXB-98765 &bull; TRN: 100482910300003
              </div>
              <div className="text-[10px] text-slate-500">
                Sheikh Zayed Rd, Dubai, UAE &bull; Tel: +971 4 399 0000
              </div>
            </div>

            {/* Token Badge */}
            <div className="text-center py-1 bg-slate-100 rounded border border-slate-200">
              <div className="text-[10px] font-sans font-semibold text-slate-500 uppercase">Queue Token</div>
              <div className="text-2xl font-black tracking-widest text-sky-700">{receipt.tokenNumber}</div>
            </div>

            {/* Receipt Meta */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-900">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time (GST):</span>
                <span className="font-medium text-slate-800">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receptionist:</span>
                <span className="text-slate-800">{receipt.receptionistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-bold text-slate-900 uppercase">{receipt.paymentMethod}</span>
              </div>
              {receipt.cardAuthCode && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Card Auth Code:</span>
                  <span className="font-mono">{receipt.cardAuthCode}</span>
                </div>
              )}
            </div>

            {/* Patient & Doctor Details */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{receipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emirates ID:</span>
                <span className="font-mono text-slate-800">{receipt.emiratesId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="text-slate-900">{receipt.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-800">{receipt.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payer:</span>
                <span className="text-slate-900 truncate max-w-[190px]">{receipt.payerName}</span>
              </div>
              {receipt.memberId && receipt.memberId !== "N/A" && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-mono text-slate-800">{receipt.memberId}</span>
                </div>
              )}
            </div>

            {/* Financial Ledger */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between font-semibold text-[11px] text-slate-700">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 truncate max-w-[220px]">{receipt.serviceName}</span>
                <span className="font-mono">{receipt.grossAmount.toFixed(2)} AED</span>
              </div>
              {receipt.insuranceCovered > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>Insurance Share ({100 - receipt.copayPercent}%)</span>
                  <span className="font-mono">-{receipt.insuranceCovered.toFixed(2)} AED</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>VAT (0% Healthcare)</span>
                <span className="font-mono">0.00 AED</span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="pt-1 flex items-center justify-between text-sm font-bold bg-slate-50 p-2 rounded">
              <span className="text-slate-900">Total Patient Paid:</span>
              <span className="text-base font-black text-sky-800 font-mono">
                {receipt.copayCollected.toFixed(2)} AED
              </span>
            </div>

            {/* Barcode & Hub Compliance Stamp */}
            <div className="text-center pt-2 space-y-1.5 text-[10px] text-slate-500">
              <div className="flex items-center justify-center gap-1 text-emerald-700 font-sans font-semibold text-[10px]">
                <ShieldCheck size={14} weight="fill" />
                <span>eClaimLink Real-Time Verified</span>
              </div>
              <div className="h-7 w-3/4 mx-auto bg-slate-900 flex items-center justify-center text-white tracking-[6px] font-mono text-[9px] rounded">
                ||||||||||||||||||||||||||||||
              </div>
              <div className="text-[9px] text-slate-400">
                Keep this receipt for your personal health records.
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-sky-800 flex items-center gap-2">
            <CheckCircle size={18} className="shrink-0 text-sky-600" />
            <span>
              Patient is queued at <strong>{receipt.department}</strong>. Token <strong>{receipt.tokenNumber}</strong> has been announced on clinic display.
            </span>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2">
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <DownloadSimple size={14} />
            <span>Download</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={15} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
