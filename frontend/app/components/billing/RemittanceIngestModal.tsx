"use client";

import React, { useState } from "react";
import { useBilling } from "@/app/context/BillingContext";
import { toast } from "sonner";
import { X, UploadSimple, FileCode, Play } from "@phosphor-icons/react";

interface RemittanceIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_RA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Remittance.Advice>
  <Header>
    <SenderID>INS-DAMAN</SenderID>
    <ReceiverID>DHA-F-0048291</ReceiverID>
    <TransactionDate>25/11/2026 10:15</TransactionDate>
    <RecordCount>2</RecordCount>
  </Header>
  <Claim>
    <ID>CLM-DAM-9039</ID>
    <Activity>
      <Code>73560</Code>
      <PatientName>Rashid Al Falasi</PatientName>
      <Gross>240.00</Gross>
      <PatientShare>24.00</PatientShare>
      <Net>216.00</Net>
      <PaymentAmount>216.00</PaymentAmount>
    </Activity>
  </Claim>
  <Claim>
    <ID>CLM-DAM-9040</ID>
    <Activity>
      <Code>99214</Code>
      <PatientName>Hamdan Al Maktoum</PatientName>
      <Gross>450.00</Gross>
      <PatientShare>50.00</PatientShare>
      <Net>400.00</Net>
      <PaymentAmount>0.00</PaymentAmount>
      <DenialCode>MNEC-004</DenialCode>
      <DenialRemark>Supporting clinical notes required for level 4 visit</DenialRemark>
    </Activity>
  </Claim>
</Remittance.Advice>`;

export function RemittanceIngestModal({
  isOpen,
  onClose,
}: RemittanceIngestModalProps) {
  const { ingestRemittanceXml } = useBilling();
  const [xmlText, setXmlText] = useState("");
  const [fileName, setFileName] = useState("RemittanceAdvice.xml");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setXmlText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const handleProcess = () => {
    if (!xmlText.trim()) {
      toast.warning("Please upload or paste a RemittanceAdvice.xml payload.");
      return;
    }
    const count = ingestRemittanceXml(xmlText, fileName);
    if (count > 0) {
      toast.success(`Parsed ${count} remittance claim lines from ${fileName}`);
      setXmlText("");
      onClose();
    } else {
      toast.error("No <Claim> elements found in the provided XML.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <FileCode size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Upload RemittanceAdvice.xml
              </h3>
              <p className="text-xs text-slate-500">
                Parse payer adjudication lines, approved AED, and UAE Denial Codes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
              <UploadSimple size={16} weight="bold" className="text-blue-600" />
              <span>Choose .xml File</span>
              <input
                type="file"
                accept=".xml,text/xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setXmlText(SAMPLE_RA_XML);
                setFileName("RA_INS-DAMAN_SAMPLE.xml");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold cursor-pointer"
            >
              Load Sample Daman Remittance XML
            </button>
          </div>

          <textarea
            value={xmlText}
            onChange={(e) => setXmlText(e.target.value)}
            rows={12}
            placeholder="Paste <Remittance.Advice>...</Remittance.Advice> XML here..."
            className="w-full rounded-xl border border-slate-300 bg-slate-950 text-slate-100 font-mono text-xs p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">{fileName}</span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcess}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Play size={14} weight="fill" />
              <span>Parse &amp; Reconcile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
