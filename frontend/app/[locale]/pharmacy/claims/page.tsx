"use client";

import React, { useState, useMemo } from "react";
import { Link } from "@/i18n/routing";
import {
  usePharmacy,
  buildPharmacyClaimXml,
  PharmacyClaim,
} from "@/app/context/PharmacyContext";
import { XmlPreviewModal } from "@/app/components/doctor/XmlPreviewModal";
import { toast } from "sonner";
import {
  FileCode,
  DownloadSimple,
  PaperPlaneTilt,
  CheckCircle,
  Storefront,
  ArrowLeft,
  Pill,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function PharmacyClaimsPage() {
  const {
    claims,
    facilityProfile,
    markClaimDownloaded,
    submitPharmacyBatchToHub,
  } = usePharmacy();

  const [previewBatch, setPreviewBatch] = useState<{
    receiverId: string;
    xml: string;
    filename: string;
  } | null>(null);

  // Group pharmacy claims by Insurance Payer ReceiverID
  const payerGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        receiverId: string;
        payerName: string;
        claims: PharmacyClaim[];
        totalGross: number;
        totalPatientShare: number;
        totalNet: number;
        allSubmitted: boolean;
      }
    >();

    claims.forEach((c) => {
      const existing = map.get(c.receiverId);
      if (!existing) {
        map.set(c.receiverId, {
          receiverId: c.receiverId,
          payerName: c.payerName,
          claims: [c],
          totalGross: c.grossAmount,
          totalPatientShare: c.patientShare,
          totalNet: c.netAmount,
          allSubmitted: c.status === "SUBMITTED_TO_HUB",
        });
      } else {
        existing.claims.push(c);
        existing.totalGross += c.grossAmount;
        existing.totalPatientShare += c.patientShare;
        existing.totalNet += c.netAmount;
        existing.allSubmitted =
          existing.allSubmitted && c.status === "SUBMITTED_TO_HUB";
      }
    });

    return Array.from(map.values());
  }, [claims]);

  const totals = useMemo(() => {
    return {
      claimCount: claims.length,
      gross: claims.reduce((s, c) => s + c.grossAmount, 0),
      patientShare: claims.reduce((s, c) => s + c.patientShare, 0),
      net: claims.reduce((s, c) => s + c.netAmount, 0),
    };
  }, [claims]);

  const handlePreviewXml = (receiverId: string, groupClaims: PharmacyClaim[]) => {
    const xml = buildPharmacyClaimXml(
      receiverId,
      groupClaims,
      facilityProfile.pharmacyLicenseId
    );
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    setPreviewBatch({
      receiverId,
      xml,
      filename: `PharmacyClaimSubmission_${receiverId}_${dateTag}.xml`,
    });
  };

  const handleDownloadXml = (receiverId: string, groupClaims: PharmacyClaim[]) => {
    const xml = buildPharmacyClaimXml(
      receiverId,
      groupClaims,
      facilityProfile.pharmacyLicenseId
    );
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `PharmacyClaimSubmission_${receiverId}_${dateTag}.xml`;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    markClaimDownloaded(receiverId);
    toast.success(`Downloaded ${filename} (Activity Type = 5)`);
  };

  const handleSubmitHub = (receiverId: string, count: number) => {
    const txId = submitPharmacyBatchToHub(receiverId);
    toast.success(
      `Submitted ${count} pharmacy drug claims to ${receiverId} (Tx: ${txId})`
    );
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Storefront size={12} weight="bold" />
              SenderID: {facilityProfile.pharmacyLicenseId}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Activity Type = 5 (Drugs)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Pharmacy Claims &amp; XML Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Independent pharmacy entity billing under{" "}
            <span className="font-mono font-semibold text-slate-700">
              {facilityProfile.pharmacyLicenseId}
            </span>{" "}
            to recover Net medication costs via <span className="font-mono font-semibold">ClaimSubmission.xml</span>.
          </p>
        </div>

        <Link
          href="/pharmacy/queue"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs self-start lg:self-auto"
        >
          <ArrowLeft size={15} />
          <span>Back to eRx Queue</span>
        </Link>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Dispensed Claims
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {totals.claimCount}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Gross
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {totals.gross.toFixed(2)} <span className="text-xs font-normal text-slate-400">AED</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Co-Pay Collected
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
            {totals.patientShare.toFixed(2)} <span className="text-xs font-normal text-slate-400">AED</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Net Recoverable
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {totals.net.toFixed(2)} <span className="text-xs font-normal text-slate-400">AED</span>
          </div>
        </div>
      </div>

      {/* Payer-Grouped Batches */}
      {payerGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          No dispensed pharmacy claims yet. Complete a dispense in the Tatmeen Workbench to generate claims.
        </div>
      ) : (
        <div className="space-y-5">
          {payerGroups.map((group) => (
            <div
              key={group.receiverId}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
            >
              {/* Batch Header */}
              <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                      {group.receiverId}
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {group.payerName}
                    </h2>
                    {group.allSubmitted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={12} weight="fill" />
                        SUBMITTED_TO_HUB
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {group.claims.length} Claim{group.claims.length > 1 ? "s" : ""} &bull; Gross:{" "}
                    <span className="font-bold text-slate-700">{group.totalGross.toFixed(2)} AED</span> &bull; Co-Pay:{" "}
                    <span className="font-bold text-amber-700">{group.totalPatientShare.toFixed(2)} AED</span> &bull; Net:{" "}
                    <span className="font-bold text-emerald-700">{group.totalNet.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePreviewXml(group.receiverId, group.claims)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <FileCode size={15} weight="bold" className="text-blue-600" />
                    <span>Preview XML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadXml(group.receiverId, group.claims)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <DownloadSimple size={15} weight="bold" />
                    <span>Download ClaimSubmission.xml</span>
                  </button>
                  <button
                    type="button"
                    disabled={group.allSubmitted}
                    onClick={() => handleSubmitHub(group.receiverId, group.claims.length)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      group.allSubmitted
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                    }`}
                  >
                    <PaperPlaneTilt size={15} weight="bold" />
                    <span>{group.allSubmitted ? "Submitted" : "Submit to Hub"}</span>
                  </button>
                </div>
              </div>

              {/* Claims Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Claim / eRx Ref</th>
                      <th className="py-3 px-4">Patient &amp; Member ID</th>
                      <th className="py-3 px-4">Dispensed Drugs (Activity Type = 5)</th>
                      <th className="py-3 px-4 text-right">Gross (AED)</th>
                      <th className="py-3 px-4 text-right">PatientShare</th>
                      <th className="py-3 px-4 text-right">Net Claim</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-bold text-slate-900">
                            {claim.claimNumber}
                          </div>
                          <div className="font-mono text-[11px] text-emerald-700">
                            {claim.erxRefNo}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {claim.dispensedAt}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-slate-900">
                            {claim.patientName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {claim.emiratesId}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            Member: {claim.memberId}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top space-y-1">
                          {claim.activities.map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              <Pill size={13} className="text-emerald-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-700">
                                {act.drugCode}
                              </span>
                              <span className="text-slate-600 truncate max-w-[200px]">
                                {act.tradeName} (x{act.quantity})
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                                SN:{act.tatmeenSerial}
                              </span>
                            </div>
                          ))}
                        </td>

                        <td className="py-3 px-4 align-top text-right font-mono font-semibold text-slate-900">
                          {claim.grossAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 align-top text-right font-mono font-semibold text-amber-600">
                          {claim.patientShare.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 align-top text-right font-mono font-extrabold text-emerald-700">
                          {claim.netAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              claim.status === "SUBMITTED_TO_HUB"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : claim.status === "DOWNLOADED"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <ShieldCheck size={11} weight="fill" />
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reusable XML Preview Modal */}
      {previewBatch && (
        <XmlPreviewModal
          isOpen={Boolean(previewBatch)}
          onClose={() => setPreviewBatch(null)}
          title={`Pharmacy ClaimSubmission.xml — ${previewBatch.receiverId}`}
          subtitle={`SenderID: ${facilityProfile.pharmacyLicenseId} • Activity Type = 5 (Medications)`}
          filename={previewBatch.filename}
          xmlContent={previewBatch.xml}
          referenceBadge="Activity Type = 5"
        />
      )}
    </div>
  );
}
