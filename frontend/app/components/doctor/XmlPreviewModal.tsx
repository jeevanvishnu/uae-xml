"use client";

import React from "react";
import { toast } from "sonner";
import { X, Copy, DownloadSimple, FileCode, CheckCircle } from "@phosphor-icons/react";

interface XmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  filename: string;
  xmlContent: string;
  referenceBadge?: string;
}

export function XmlPreviewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  filename,
  xmlContent,
  referenceBadge,
}: XmlPreviewModalProps) {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    toast.success(`${filename} copied to clipboard`);
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <FileCode size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900">{title}</h3>
                {referenceBadge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle size={12} weight="fill" />
                    {referenceBadge}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* XML Viewer */}
        <div className="flex-1 overflow-auto p-5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap break-words">{xmlContent}</pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">{filename}</span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy size={15} />
              Copy XML
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <DownloadSimple size={15} weight="bold" />
              Download {filename}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
