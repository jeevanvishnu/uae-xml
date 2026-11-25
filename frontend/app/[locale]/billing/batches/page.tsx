"use client";

import React, { useState } from "react";
import { Link } from "@/i18n/routing";
import {
  useBilling,
  buildBatchSubmissionXml,
  PayerBatch,
} from "@/app/context/BillingContext";
import { XmlPreviewModal } from "@/app/components/doctor/XmlPreviewModal";
import { toast } from "sonner";
import {
  Package,
  DownloadSimple,
  PaperPlaneTilt,
  FileCode,
  CheckCircle,
  CaretDown,
  CaretUp,
  Trash,
  ArrowLeft,
} from "@phosphor-icons/react";

export default function XmlBatchExportPage() {
  const {
    batches,
    facilityProfile,
    markBatchDownloaded,
    submitBatchToHub,
    removeClaimFromBatch,
  } = useBilling();

  const [expandedReceiver, setExpandedReceiver] = useState<string | null>(
    batches[0]?.receiverId || null
  );
  const [previewBatch, setPreviewBatch] = useState<{
    receiverId: string;
    xml: string;
    filename: string;
  } | null>(null);

  const totalClaims = batches.reduce((s, b) => s + b.claims.length, 0);
  const totalNet = batches.reduce((s, b) => s + b.totalNet, 0);
  const submittedBatches = batches.filter(
    (b) => b.status === "SUBMITTED_TO_HUB"
  ).length;

  const handleDownloadXml = (batch: PayerBatch) => {
    const xml = buildBatchSubmissionXml(
      batch.receiverId,
      batch.claims,
      facilityProfile.licenseNo
    );
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `ClaimSubmission_${batch.receiverId}_${dateTag}.xml`;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    markBatchDownloaded(batch.receiverId);
    toast.success(`Downloaded ${filename} (${batch.claims.length} claims)`);
  };

  const handlePreviewXml = (batch: PayerBatch) => {
    const xml = buildBatchSubmissionXml(
      batch.receiverId,
      batch.claims,
      facilityProfile.licenseNo
    );
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    setPreviewBatch({
      receiverId: batch.receiverId,
      xml,
      filename: `ClaimSubmission_${batch.receiverId}_${dateTag}.xml`,
    });
  };

  const handleSubmitHub = (batch: PayerBatch) => {
    const refId = submitBatchToHub(batch.receiverId);
    toast.success(
      `Submitted ${batch.claims.length} ${batch.receiverId} claims via Hub API (${refId})`
    );
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {facilityProfile.dispositionFlag}
            </span>
            <span className="text-xs text-slate-500">
              1 ClaimSubmission.xml per ReceiverID
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            XML Batch Export &amp; Hub Submission
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clean, scrubbed claims are automatically grouped by Insurance Payer (<span className="font-mono font-semibold text-slate-700">ReceiverID</span>) for manual portal download or direct Hub API dispatch.
          </p>
        </div>

        <Link
          href="/billing/claims"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
        >
          <ArrowLeft size={15} />
          <span>Back to Claims Workbench</span>
        </Link>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Payer Batches (ReceiverID)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {batches.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {submittedBatches} submitted to Hub
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Clean Claims Batched
          </span>
          <div className="text-2xl font-extrabold text-blue-700 mt-2">
            {totalClaims}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Passed 4/4 scrubbing checks
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Batch Net Value
          </span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            AED {totalNet.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            Ready for eClaimLink / Riayati
          </div>
        </div>
      </div>

      {/* Payer Batch Cards */}
      <div className="space-y-4">
        {batches.map((batch) => {
          const isExpanded = expandedReceiver === batch.receiverId;
          const isSubmitted = batch.status === "SUBMITTED_TO_HUB";

          return (
            <div
              key={batch.receiverId}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
                    <Package size={22} weight="duotone" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">
                        {batch.payerName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        ReceiverID: {batch.receiverId}
                      </span>
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} weight="fill" />
                          Submitted ({batch.hubReferenceId})
                        </span>
                      ) : batch.status === "DOWNLOADED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          XML Downloaded ({batch.exportedAt})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Ready to Export
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      RecordCount: <strong>{batch.claims.length}</strong> &bull;
                      Gross: AED {batch.totalGross.toFixed(2)} &bull; Share: AED{" "}
                      {batch.totalPatientShare.toFixed(2)} &bull;{" "}
                      <strong className="text-slate-900">
                        Net: AED {batch.totalNet.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePreviewXml(batch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <FileCode size={15} className="text-slate-500" />
                    <span>Preview XML</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadXml(batch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 cursor-pointer"
                  >
                    <DownloadSimple size={15} weight="bold" />
                    <span>Download .xml Batch</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSubmitHub(batch)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSubmitted
                        ? "bg-emerald-100 text-emerald-700 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                    }`}
                  >
                    <PaperPlaneTilt size={15} weight="bold" />
                    <span>
                      {isSubmitted ? "Dispatched via Hub" : "Submit via Hub API"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReceiver(isExpanded ? null : batch.receiverId)
                    }
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                    aria-label="Toggle claim manifest"
                  >
                    {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expandable Manifest Table */}
              {isExpanded && (
                <div className="border-t border-slate-200/80 bg-slate-50/50 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/70 text-[11px] font-bold uppercase text-slate-400">
                        <th className="py-2.5 px-5">Claim #</th>
                        <th className="py-2.5 px-4">Patient</th>
                        <th className="py-2.5 px-4">Member ID</th>
                        <th className="py-2.5 px-4">Principal ICD-10</th>
                        <th className="py-2.5 px-4 text-right">Net (AED)</th>
                        <th className="py-2.5 px-5 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {batch.claims.map((c) => (
                        <tr key={c.id} className="hover:bg-white/70">
                          <td className="py-3 px-5 font-mono font-bold text-slate-900">
                            {c.claimNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {c.patient.fullName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {c.insurance.memberId}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {c.diagnoses.find((d) => d.type === "Principal")?.code ||
                              "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {c.netAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-5 text-right">
                            {!isSubmitted && (
                              <button
                                type="button"
                                onClick={() => {
                                  removeClaimFromBatch(c.id);
                                  toast.info(
                                    `Returned ${c.claimNumber} to Claims Workbench`
                                  );
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash size={13} /> Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {batches.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <Package size={36} className="mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-800">
              No claims queued for XML batching yet
            </div>
            <p className="text-xs text-slate-500">
              Scrub and approve clean visits in the Claims Workbench to group them by ReceiverID.
            </p>
            <Link
              href="/billing/claims"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Open Claims Workbench
            </Link>
          </div>
        )}
      </div>

      <XmlPreviewModal
        isOpen={!!previewBatch}
        onClose={() => setPreviewBatch(null)}
        title={`ClaimSubmission.xml — ${previewBatch?.receiverId || ""}`}
        subtitle="UAE eClaimLink / Riayati Multi-Claim Envelope"
        filename={previewBatch?.filename || "ClaimSubmission.xml"}
        xmlContent={previewBatch?.xml || ""}
        referenceBadge={previewBatch?.receiverId}
      />
    </div>
  );
}
