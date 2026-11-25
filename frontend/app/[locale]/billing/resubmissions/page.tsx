"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  useBilling,
  buildResubmissionXml,
  ResubmissionAttachment,
} from "@/app/context/BillingContext";
import { XmlPreviewModal } from "@/app/components/doctor/XmlPreviewModal";
import { toast } from "sonner";
import {
  ArrowsClockwise,
  WarningCircle,
  CheckCircle,
  Paperclip,
  FilePdf,
  Trash,
  FileCode,
  PaperPlaneTilt,
  DownloadSimple,
} from "@phosphor-icons/react";

function ResubmissionWorkbenchInner() {
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");

  const {
    resubmissions,
    facilityProfile,
    updateResubmissionDraft,
    submitResubmission,
  } = useBilling();

  const [selectedId, setSelectedId] = useState<string>(
    draftIdParam || resubmissions[0]?.id || ""
  );
  const [showXmlModal, setShowXmlModal] = useState(false);

  useEffect(() => {
    if (draftIdParam && resubmissions.some((r) => r.id === draftIdParam)) {
      setSelectedId(draftIdParam);
    }
  }, [draftIdParam, resubmissions]);

  const activeDraft = useMemo(
    () =>
      resubmissions.find((r) => r.id === selectedId) || resubmissions[0] || null,
    [resubmissions, selectedId]
  );

  const generatedXml = useMemo(() => {
    if (!activeDraft) return "";
    return buildResubmissionXml(activeDraft, facilityProfile.licenseNo);
  }, [activeDraft, facilityProfile.licenseNo]);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeDraft) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const newAtt: ResubmissionAttachment = {
      id: `ATT-${Date.now()}`,
      name: file.name,
      size: `${Math.max(12, Math.round(file.size / 1024))} KB`,
      type: file.type || "application/pdf",
    };
    updateResubmissionDraft(activeDraft.id, {
      attachments: [...activeDraft.attachments, newAtt],
    });
    toast.success(`Attached ${file.name}`);
  };

  const handleQuickAttachSample = () => {
    if (!activeDraft) return;
    const sampleName =
      activeDraft.denialCode === "MNEC-004"
        ? "Lab_Report_Metabolic_Panel.pdf"
        : activeDraft.denialCode === "AUTH-002"
        ? "PriorAuth_Approval_Letter.pdf"
        : "Clinical_Justification_Note.pdf";
    const newAtt: ResubmissionAttachment = {
      id: `ATT-${Date.now()}`,
      name: sampleName,
      size: "248 KB",
      type: "application/pdf",
    };
    updateResubmissionDraft(activeDraft.id, {
      attachments: [...activeDraft.attachments, newAtt],
    });
    toast.success(`Attached ${sampleName}`);
  };

  const handleDownloadXml = () => {
    if (!activeDraft) return;
    const filename = `Resubmission_${activeDraft.claimNumber}.xml`;
    const blob = new Blob([generatedXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleSubmit = () => {
    if (!activeDraft) return;
    const hubRef = submitResubmission(activeDraft.id);
    toast.success(
      `Resubmitted ${activeDraft.claimNumber} (${activeDraft.resubmissionType}) • Ref: ${hubRef}`
    );
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          Denial Management &amp; Resubmission
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Remediate rejected or partially paid claims, attach supporting clinical reports or CPT modifiers, and dispatch compliant <span className="font-mono font-semibold text-slate-700">&lt;Resubmission&gt;&lt;Type&gt;correction&lt;/Type&gt;...&lt;/Resubmission&gt;</span> XML.
        </p>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Queue: Denied Claims */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Denied Queue ({resubmissions.length})
            </span>
            <span className="text-[11px] font-semibold text-red-600">
              {resubmissions.filter((r) => r.status === "OPEN").length} Open
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {resubmissions.map((item) => {
              const isSelected = activeDraft?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/70 border-l-4 border-l-blue-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {item.claimNumber}
                    </span>
                    {item.status === "RESUBMITTED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={11} weight="fill" /> Resubmitted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                        {item.denialCode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {item.patientName}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="font-mono">{item.receiverId}</span>
                    <span className="font-mono font-bold text-red-600">
                      Denied: AED {item.deniedAmount.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Workbench: Remediation & XML */}
        {activeDraft ? (
          <div className="lg:col-span-8 space-y-5">
            {/* Denial Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                      {activeDraft.denialCode}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {activeDraft.claimNumber} &bull; {activeDraft.receiverId} &bull; Attempt #{activeDraft.attemptNumber}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1.5">
                    {activeDraft.denialLabel}
                  </h2>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[11px] text-slate-400 uppercase">
                    Denied Amount
                  </div>
                  <div className="text-lg font-extrabold text-red-600">
                    AED {activeDraft.deniedAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-900">
                <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Payer Remark: </span>
                  {activeDraft.payerRemark}
                </div>
              </div>

              {/* Correction Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    Resubmission Type
                  </label>
                  <select
                    value={activeDraft.resubmissionType}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        resubmissionType: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="correction">correction</option>
                    <option value="internal complaint">internal complaint</option>
                    <option value="legacy">legacy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    Adjusted Net Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={activeDraft.adjustedNet}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        adjustedNet: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    CPT / Activity Code
                  </label>
                  <input
                    type="text"
                    value={activeDraft.activityCode}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        activityCode: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    CPT Modifier (e.g. 25, 59, TC)
                  </label>
                  <input
                    type="text"
                    value={activeDraft.modifier}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        modifier: e.target.value.replace(/^-/, ""),
                      })
                    }
                    placeholder="e.g. 25"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    Prior Authorization Reference (if applicable)
                  </label>
                  <input
                    type="text"
                    value={activeDraft.priorAuthRef}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        priorAuthRef: e.target.value,
                      })
                    }
                    placeholder="e.g. PA-NXT-77412"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                    Clinical &amp; Billing Justification (&lt;Comment&gt;)
                  </label>
                  <textarea
                    rows={3}
                    value={activeDraft.clinicalComment}
                    onChange={(e) =>
                      updateResubmissionDraft(activeDraft.id, {
                        clinicalComment: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Supporting Attachments */}
              <div className="pt-2 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Supporting Attachments ({activeDraft.attachments.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickAttachSample}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Attach Sample Report
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                      <Paperclip size={14} />
                      <span>Upload PDF / Lab</span>
                      <input
                        type="file"
                        onChange={handleFileAttach}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {activeDraft.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeDraft.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                      >
                        <FilePdf size={15} className="text-red-600" />
                        <span className="font-medium text-slate-800">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {att.size}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateResubmissionDraft(activeDraft.id, {
                              attachments: activeDraft.attachments.filter(
                                (a) => a.id !== att.id
                              ),
                            })
                          }
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Resubmission XML Preview + Submit Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-200/80 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileCode size={17} className="text-blue-600" />
                  <span>Live &lt;Resubmission&gt; XML Payload</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowXmlModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Expand XML
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 cursor-pointer"
                  >
                    <DownloadSimple size={14} weight="bold" />
                    <span>Download XML</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeDraft.status === "RESUBMITTED"}
                    onClick={handleSubmit}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold ${
                      activeDraft.status === "RESUBMITTED"
                        ? "bg-emerald-100 text-emerald-700 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                    }`}
                  >
                    <PaperPlaneTilt size={14} weight="bold" />
                    <span>
                      {activeDraft.status === "RESUBMITTED"
                        ? `Resubmitted (${activeDraft.hubRef})`
                        : "Submit Resubmission to Hub"}
                    </span>
                  </button>
                </div>
              </div>

              <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64">
                {generatedXml}
              </pre>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-500">
            <ArrowsClockwise size={32} className="mx-auto text-slate-300 mb-2" />
            No denied claims in the queue.
          </div>
        )}
      </div>

      <XmlPreviewModal
        isOpen={showXmlModal}
        onClose={() => setShowXmlModal(false)}
        title={`Resubmission XML — ${activeDraft?.claimNumber || ""}`}
        subtitle={`Type: ${activeDraft?.resubmissionType || "correction"}`}
        filename={`Resubmission_${activeDraft?.claimNumber || "claim"}.xml`}
        xmlContent={generatedXml}
        referenceBadge={activeDraft?.denialCode}
      />
    </div>
  );
}

export default function DenialResubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-xs font-mono text-slate-500">
          Loading Denial Management Workbench...
        </div>
      }
    >
      <ResubmissionWorkbenchInner />
    </Suspense>
  );
}
