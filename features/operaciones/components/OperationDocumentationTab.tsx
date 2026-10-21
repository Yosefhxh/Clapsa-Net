"use client";

import { subirDocumentoOperacion, validarDocumentoOperacion } from '../actions/operaciones-actions';
import { useState } from "react";
import { Download, FileCheck2, FileX2, UploadCloud } from "lucide-react";
import { OperationDocumentKey, OperationDocumentRow, documentLabels } from "../types";

export interface OperationDocumentationTabProps {
    traficoId: string;
    documentos: OperationDocumentRow[];
    onUploadDocumento?: (
        traficoId: string,
        documento: OperationDocumentKey,
        formData: FormData,
    ) => Promise<{ success: boolean; message: string }>;
    onValidarDocumento?: (
        traficoId: string,
        documento: OperationDocumentKey,
        aprobado: boolean,
    ) => Promise<{ success: boolean; message: string }>;
}

export function OperationDocumentationTab({
    traficoId,
    documentos,
    onUploadDocumento,
    onValidarDocumento,
}: OperationDocumentationTabProps) {
    const [message, setMessage] = useState("");
    const [loadingKey, setLoadingKey] = useState<OperationDocumentKey | null>(null);

    const handleFileChange = async (documento: OperationDocumentKey, file: File | null) => {
        if (!file) return;

        setLoadingKey(documento);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "expedientes");
            formData.append("prefix", `${traficoId}-${documento.toLowerCase()}`);

            if (onUploadDocumento) {
                const result = await onUploadDocumento(traficoId, documento, formData);
                setMessage(result.message);
            } else {
                const result = await subirDocumentoOperacion({ traficoId, documento, formData });
                setMessage(result.message);
            }
        } finally {
            setLoadingKey(null);
        }
    };

    const rows = documentos.length
        ? documentos
        : Object.entries(documentLabels).map(([key, label]) => ({
            id: key,
            key: key as OperationDocumentKey,
            nombre: label,
            fechaSubida: null,
            subidoPor: "-",
            url: null,
            validado: false,
        }));

    return (
        <section className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[960px] text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600">Nombre del Documento</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600">Fecha de subida</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600">Quién lo subió</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600">Estado</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.map((documento) => (
                        <tr key={documento.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">{documento.nombre}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{documento.fechaSubida ?? "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{documento.subidoPor}</td>
                            <td className="px-4 py-3 text-sm">
                                <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${documento.validado
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                >
                                    {documento.validado ? "Validado" : "Pendiente"}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <UploadCloud className="w-4 h-4" />
                                        {loadingKey === documento.key ? "Subiendo..." : "Subir"}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={(event) => handleFileChange(documento.key, event.target.files?.[0] ?? null)}
                                            disabled={loadingKey === documento.key}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                                        onClick={() => {
                                            if (documento.url) window.open(documento.url, "_blank", "noopener,noreferrer");
                                        }}
                                        disabled={!documento.url}
                                    >
                                        <Download className="w-4 h-4" />
                                        Descargar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setMessage("");
                                            if (onValidarDocumento) {
                                                const result = await onValidarDocumento(traficoId, documento.key, true);
                                                setMessage(result.message);
                                                return;
                                            }

                                            const result = await validarDocumentoOperacion({ traficoId, documento: documento.key, aprobado: true });
                                            setMessage(result.message);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors"
                                    >
                                        <FileCheck2 className="w-4 h-4" />
                                        Aprobar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (onValidarDocumento) {
                                                const result = await onValidarDocumento(traficoId, documento.key, false);
                                                setMessage(result.message);
                                                return;
                                            }

                                            const result = await validarDocumentoOperacion({ traficoId, documento: documento.key, aprobado: false });
                                            setMessage(result.message);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-red-300 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        <FileX2 className="w-4 h-4" />
                                        Rechazar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {message ? <div className="px-4 py-3 text-sm text-slate-600 border-t border-slate-100">{message}</div> : null}
        </section>
    );
}
