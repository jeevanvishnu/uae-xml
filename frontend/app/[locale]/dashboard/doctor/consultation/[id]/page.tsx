"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useDoctor,
  generateClaimSubmissionXml,
} from "@/app/context/DoctorContext";
import { PatientClinicalHeader } from "@/app/components/doctor/PatientClinicalHeader";
import { VitalsSoapPanel } from "@/app/components/doctor/VitalsSoapPanel";
import { DiagnosisCoder } from "@/app/components/doctor/DiagnosisCoder";
import { ProceduresPanel } from "@/app/components/doctor/ProceduresPanel";
import { ErxWriterPanel } from "@/app/components/doctor/ErxWriterPanel";
import { XmlPreviewModal } from "@/app/components/doctor/XmlPreviewModal";
import { toast } from "sonner";
import {
  CheckCircle,
  WarningCircle,
  FileCode,
  Printer,
  X,
  Lock,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/routing";

export default function ConsultationWorkbenchPage() {
  const params = useParams();
  const id = params?.id as string;
  const {
    getEncounter,
    updateEncounterData,
    transmitErx,
    triggerPriorAuth,
    completeVisit,
  } = useDoctor();

  const encounter = getEncounter(id);

  const [xmlModal, setXmlModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    filename: string;
    xml: string;
    refBadge?: string;
  }>({
    isOpen: false,
    title: "",
    filename: "",
    xml: "",
  });

  const [showPrintSlip, setShowPrintSlip] = useState(false);

  if (!encounter) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
        <WarningCircle size={36} className="text-amber-500 mx-auto" />
        <h2 className="text-xs font-bold text-slate-900">Encounter Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested consultation could not be located in the active queue.
        </p>
        <Link
          href="/dashboard/doctor"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          Return to Patient Queue
        </Link>
      </div>
    );
  }

  const isCompleted = encounter.status === "COMPLETED";
  const hasPrincipalIcd = encounter.diagnoses.some((d) => d.type === "Principal");
  const hasSoapNotes =
    encounter.chiefComplaint.trim().length > 0 &&
    encounter.clinicalFindings.trim().length > 0;
  const canCompleteVisit = hasPrincipalIcd && hasSoapNotes && !isCompleted;

  const handleTriggerPriorAuth = (procedureId: string) => {
    const res = triggerPriorAuth(encounter.id, procedureId);
    if (!res) return;
    toast.success(`PriorRequest.xml generated (${res.refNo})`);
    setXmlModal({
      isOpen: true,
      title: "Prior Authorization Request (PriorRequest.xml)",
      subtitle: "UAE Insurance Pre-Approval Payload",
      filename: `PriorRequest_${res.refNo}.xml`,
      xml: res.xml,
      refBadge: res.refNo,
    });
  };

  const handleTransmitErx = () => {
    const tx = transmitErx(encounter.id);
    if (!tx) {
      toast.error("Add at least one medication before transmitting eRx");
      return;
    }
    toast.success(`ePrescription transmitted! Ref: ${tx.erxRefNo}`);
  };

  const handleViewClaimXml = () => {
    const xml = encounter.claimXml || generateClaimSubmissionXml(encounter);
    setXmlModal({
      isOpen: true,
      title: "UAE Claim Submission (ClaimSubmission.xml)",
      subtitle: "DHA eClaimLink / Riayati Adjudication Payload",
      filename: `ClaimSubmission_${encounter.tokenNumber}.xml`,
      xml,
    });
  };

  const handleCompleteVisit = () => {
    if (!hasPrincipalIcd) {
      toast.error("Select at least one Principal ICD-10-CM diagnosis before completing.");
      return;
    }
    if (!hasSoapNotes) {
      toast.error("Chief Complaint and Clinical Findings are mandatory.");
      return;
    }
    const xml = completeVisit(encounter.id);
    if (xml) {
      toast.success("Visit completed! ClaimSubmission.xml is ready for billing.");
      setXmlModal({
        isOpen: true,
        title: "Visit Completed — ClaimSubmission.xml Generated",
        subtitle: "Ready for payer adjudication & billing submission",
        filename: `ClaimSubmission_${encounter.tokenNumber}.xml`,
        xml,
        refBadge: "READY FOR CLAIM",
      });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20">
      {/* Block A: Patient Clinical Header (Read-Only Context) */}
      <PatientClinicalHeader encounter={encounter} />

      {/* Main Two-Column Consultation Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (Blocks B, C, D) */}
        <div className="xl:col-span-8 space-y-5">
          {/* Block B: Vitals & Clinical Notes (SOAP) */}
          <VitalsSoapPanel
            vitals={encounter.vitals}
            chiefComplaint={encounter.chiefComplaint}
            clinicalFindings={encounter.clinicalFindings}
            disabled={isCompleted}
            onVitalsChange={(vitals) => updateEncounterData(encounter.id, { vitals })}
            onComplaintChange={(chiefComplaint) =>
              updateEncounterData(encounter.id, { chiefComplaint })
            }
            onFindingsChange={(clinicalFindings) =>
              updateEncounterData(encounter.id, { clinicalFindings })
            }
          />

          {/* Block C: Diagnosis Coding (ICD-10-CM) */}
          <DiagnosisCoder
            diagnoses={encounter.diagnoses}
            disabled={isCompleted}
            onChange={(diagnoses) => updateEncounterData(encounter.id, { diagnoses })}
          />

          {/* Block D: Procedures, Labs & Services (CPT / HCPCS / DSL) */}
          <ProceduresPanel
            procedures={encounter.procedures}
            clinicianLicense={encounter.clinician.licenseNo}
            copayPercent={encounter.insurance.copayPercent}
            copayCap={encounter.insurance.copayCap}
            isInsured={encounter.insurance.eligibilityStatus === "ACTIVE"}
            disabled={isCompleted}
            onChange={(procedures) => updateEncounterData(encounter.id, { procedures })}
            onTriggerPriorAuth={handleTriggerPriorAuth}
          />
        </div>

        {/* Right Column (Block E + Adjudication Readiness) */}
        <div className="xl:col-span-4 space-y-5 xl:sticky xl:top-6">
          {/* Block E: e-Prescription (eRx) Writer */}
          <ErxWriterPanel
            medications={encounter.medications}
            transmission={encounter.erxTransmission}
            disabled={isCompleted}
            onChange={(medications) => updateEncounterData(encounter.id, { medications })}
            onTransmitErx={handleTransmitErx}
            onViewErxXml={() => {
              if (!encounter.erxTransmission) return;
              setXmlModal({
                isOpen: true,
                title: "UAE e-Prescription (ePrescription.xml)",
                subtitle: "Riayati / DHA eRx Hub Payload",
                filename: `ePrescription_${encounter.erxTransmission.erxRefNo}.xml`,
                xml: encounter.erxTransmission.xmlPayload,
                refBadge: encounter.erxTransmission.erxRefNo,
              });
            }}
            onPrintSlip={() => setShowPrintSlip(true)}
          />

          {/* Adjudication Readiness & Complete Visit Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              UAE Adjudication Readiness
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Clinician License Linked</span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700">
                  <CheckCircle size={14} weight="fill" />
                  {encounter.clinician.licenseNo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">SOAP Complaint &amp; Findings</span>
                {hasSoapNotes ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle size={14} weight="fill" /> Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                    <WarningCircle size={14} weight="fill" /> Required
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Principal ICD-10-CM Code</span>
                {hasPrincipalIcd ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle size={14} weight="fill" /> Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                    <WarningCircle size={14} weight="fill" /> Missing
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleViewClaimXml}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileCode size={15} />
                Preview ClaimSubmission.xml
              </button>

              <button
                type="button"
                disabled={!canCompleteVisit}
                onClick={handleCompleteVisit}
                title={
                  !hasPrincipalIcd
                    ? "Select a Principal ICD-10 diagnosis to enable"
                    : !hasSoapNotes
                    ? "Enter Chief Complaint & Clinical Findings to enable"
                    : "Finalize encounter and generate ClaimSubmission.xml"
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isCompleted ? (
                  <>
                    <Lock size={15} weight="bold" />
                    Visit Completed
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} weight="bold" />
                    Complete Visit &amp; Generate Claim
                  </>
                )}
              </button>

              {!isCompleted && !canCompleteVisit && (
                <p className="text-[11px] text-red-600 text-center font-medium">
                  {!hasPrincipalIcd
                    ? "Select 1 Principal ICD-10-CM code to unlock Complete Visit."
                    : "Complete mandatory Chief Complaint & Clinical Findings."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* XML Payload Preview Modal */}
      <XmlPreviewModal
        isOpen={xmlModal.isOpen}
        onClose={() => setXmlModal((prev) => ({ ...prev, isOpen: false }))}
        title={xmlModal.title}
        subtitle={xmlModal.subtitle}
        filename={xmlModal.filename}
        xmlContent={xmlModal.xml}
        referenceBadge={xmlModal.refBadge}
      />

      {/* Printable Prescription Slip Modal */}
      {showPrintSlip && encounter.erxTransmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setShowPrintSlip(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-900">
                Patient e-Prescription Slip
              </span>
              <button
                type="button"
                onClick={() => setShowPrintSlip(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    MOSCTD
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dubai Healthcare City &bull; DHA Facility
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[11px] text-slate-400 uppercase">eRx Reference</div>
                  <div className="text-xs font-bold text-emerald-700">
                    {encounter.erxTransmission.erxRefNo}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block">Patient</span>
                  <span className="font-bold">{encounter.patient.fullName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Emirates ID</span>
                  <span className="font-mono font-semibold">
                    {encounter.patient.emiratesId}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Prescriber</span>
                  <span className="font-semibold">{encounter.clinician.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">License ID</span>
                  <span className="font-mono font-semibold">
                    {encounter.clinician.licenseNo}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Prescribed Medications
                </div>
                {encounter.erxTransmission.medications.map((m, i) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {i + 1}. {m.tradeName}{" "}
                        <span className="font-mono text-[11px] text-slate-500">
                          ({m.drugCode})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {m.dose} {m.unit} &bull; {m.route} &bull; {m.frequency} for{" "}
                        {m.durationDays} days
                      </div>
                      <div className="text-[11px] text-slate-500 italic">
                        {m.instructions}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 shrink-0">
                      Qty: {m.totalQuantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Printer size={15} weight="bold" />
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
