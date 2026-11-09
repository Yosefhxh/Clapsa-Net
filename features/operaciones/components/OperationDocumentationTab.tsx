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
        <section className="clp-card overflow-x-auto">
            <table className="clp-table min-w-[960px]">
                <thead>
                    <tr>
                        <th>Nombre del Documento</th>
                        <th>Fecha de subida</th>
                        <th>Quién lo subió</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((documento) => (
                        <tr key={documento.id}>
                            <td className="font-medium">{documento.nombre}</td>
                            <td>{documento.fechaSubida ?? "-"}</td>
                            <td>{documento.subidoPor}</td>
                            <td>
                                <span
                                    className={`clp-badge ${documento.validado
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                >
                                    {documento.validado ? "Validado" : "Pendiente"}
                                </span>
                            </td>
                            <td>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="clp-btn clp-btn-secondary clp-btn-sm cursor-pointer">
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
                                        className="clp-btn clp-btn-secondary clp-btn-sm"
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
                                        className="clp-btn clp-btn-primary clp-btn-sm"
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
                                        className="clp-btn clp-btn-danger clp-btn-sm"
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
            {message ? <div className="px-4 py-3 text-sm text-slate-600 border-t border-dashed border-slate-200">{message}</div> : null}
        </section>
    );
}
