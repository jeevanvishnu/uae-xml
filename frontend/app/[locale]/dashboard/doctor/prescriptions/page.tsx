"use client";

import React, { useState } from "react";
import { useDoctor, ErxTransmission } from "@/app/context/DoctorContext";
import { XmlPreviewModal } from "@/app/components/doctor/XmlPreviewModal";
import { Pill, FileCode, CheckCircle, CalendarBlank } from "@phosphor-icons/react";

export default function DoctorPrescriptionsPage() {
  const { erxHistory } = useDoctor();
  const [selectedXml, setSelectedXml] = useState<ErxTransmission | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Header matching Receptionist Design Model */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Transmitted e-Prescriptions (eRx)
          </h1>
          <p className="text-xs md:text-xs text-slate-500 mt-1">
            Riayati &amp; DHA eRx Hub transmissions and ePrescription.xml audit log.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs overflow-hidden">
        {erxHistory.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Pill size={32} className="text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">
              No e-Prescriptions Transmitted Yet
            </div>
            <p className="text-xs text-slate-500">
              Open a patient consultation workbench and click &ldquo;Transmit eRx to Hub&rdquo; to generate an eRx Reference Number.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {erxHistory.map((tx) => (
              <div
                key={tx.erxRefNo}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold">
                      <CheckCircle size={13} weight="fill" />
                      {tx.erxRefNo}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {tx.patientName}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {tx.emiratesId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarBlank size={13} />
                      {new Date(tx.transmittedAt).toLocaleString()}
                    </span>
                    <span>&bull; {tx.medications.length} medication(s)</span>
                    <span className="font-mono">&bull; {tx.clinicianLicense}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedXml(tx)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <FileCode size={15} />
                  View ePrescription.xml
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedXml && (
        <XmlPreviewModal
          isOpen={!!selectedXml}
          onClose={() => setSelectedXml(null)}
          title="UAE e-Prescription (ePrescription.xml)"
          subtitle={`Patient: ${selectedXml.patientName}`}
          filename={`ePrescription_${selectedXml.erxRefNo}.xml`}
          xmlContent={selectedXml.xmlPayload}
          referenceBadge={selectedXml.erxRefNo}
        />
      )}
    </div>
  );
}
