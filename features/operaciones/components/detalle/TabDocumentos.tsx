"use client";

import { useRef, useState } from "react";
import { Download, Eye, Loader2, Upload } from "lucide-react";
import { useSession } from "@/features/session";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFechaHora } from "@/shared/utils/formato";
import { revisarDocumentoAction, subirDocumentoAction } from "../../actions/operaciones-actions";
import type { DocumentoExpediente, OperacionDetalle } from "../../types/vistas";
import { PillDocumento } from "../etiquetas";

function BotonSubir({ op, doc, etiqueta }: { op: OperacionDetalle; doc: DocumentoExpediente; etiqueta: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { pendiente, ejecutar } = useAccion();
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label={`Archivo para ${doc.nombre}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("file", file);
          ejecutar(() => subirDocumentoAction(op.id, doc.id, fd));
          e.target.value = "";
        }}
      />
      <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => input.current?.click()}>
        {pendiente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {etiqueta}
      </button>
    </>
  );
}

export function TabDocumentos({ op }: { op: OperacionDetalle }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const [rechazando, setRechazando] = useState<DocumentoExpediente | null>(null);
  const [motivo, setMotivo] = useState("");
  const editable = puede("documentos.revisar") && op.estado !== "CERRADA";
  const obligatorios = op.documentos.filter((d) => d.requisito === "OBLIGATORIO");
  const aprobados = op.documentos.filter((d) => d.estado === "APROBADO").length;

  return (
    <section className="clp-card overflow-hidden">
      <div className="clp-dt-toolbar">
        <span className="clp-dt-titulo">Expediente</span>
        <span className="text-sm text-slate-500">{aprobados} de {op.documentos.length} aprobados · {obligatorios.length} obligatorios</span>
      </div>
      <div className="clp-dt-scroll">
        <table className="clp-dt-tabla">
          <thead>
            <tr><th>Documento</th><th>Fecha de subida</th><th>Quién lo subió</th><th>Estado</th><th className="text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {op.documentos.map((d) => (
              <tr key={d.id}>
                <td>
                  <div className="font-semibold text-slate-800">
                    {d.nombre}{" "}
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${d.requisito === "OBLIGATORIO" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      {d.requisito === "OBLIGATORIO" ? "Obligatorio" : "Si aplica"}
                    </span>
                  </div>
                  {d.descripcion ? <div className="text-xs text-slate-500">{d.descripcion}</div> : null}
                </td>
                <td className="tabular-nums">{formatoFechaHora(d.subidoEn)}</td>
                <td>{d.subidoPor ?? "-"}</td>
                <td>
                  <PillDocumento estado={d.estado} />
                  {d.motivoRechazo ? <div className="mt-1 max-w-xs text-xs text-red-700">Motivo: {d.motivoRechazo}</div> : null}
                  {d.revisadoPor ? <div className="mt-0.5 text-xs text-slate-500">Revisó: {d.revisadoPor}</div> : null}
                </td>
                <td>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="clp-btn clp-btn-secondary clp-btn-sm">
                        {d.estado === "APROBADO" ? <Download className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {d.estado === "APROBADO" ? "Descargar" : "Ver"}
                      </a>
                    ) : null}
                    {editable && d.estado === "POR_REVISAR" ? (
                      <>
                        <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente} onClick={() => ejecutar(() => revisarDocumentoAction(op.id, d.id, true, null))}>Aprobar</button>
                        <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm !text-red-700" disabled={pendiente} onClick={() => { setMotivo(""); setRechazando(d); }}>Rechazar</button>
                      </>
                    ) : null}
                    {editable && d.estado === "PENDIENTE" ? <BotonSubir op={op} doc={d} etiqueta="Subir" /> : null}
                    {editable && d.estado === "RECHAZADO" ? <BotonSubir op={op} doc={d} etiqueta="Subir nueva versión" /> : null}
                    {editable && d.estado === "APROBADO" ? <BotonSubir op={op} doc={d} etiqueta="Reemplazar" /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-linea px-4 py-2 text-xs text-slate-500">Solo PDF de hasta 5 MB. Aprobar o rechazar aparece cuando ya hay archivo.</p>

      <Drawer
        open={rechazando != null}
        onClose={() => setRechazando(null)}
        title={`Rechazar ${rechazando?.nombre ?? ""}`}
        subtitle="Quien lo subió verá el motivo y podrá subir una nueva versión."
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setRechazando(null)}>Cancelar</button>
            <button
              type="button"
              className="clp-btn clp-btn-danger"
              disabled={motivo.trim().length < 3 || pendiente}
              onClick={() => ejecutar(() => revisarDocumentoAction(op.id, rechazando!.id, false, motivo), (ok) => ok && setRechazando(null))}
            >
              Rechazar documento
            </button>
          </>
        }
      >
        <label className="clp-label" htmlFor="motivo-rechazo">Motivo del rechazo</label>
        <textarea id="motivo-rechazo" className="clp-input" rows={4} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. La factura no trae el valor por partida" />
      </Drawer>
    </section>
  );
}
