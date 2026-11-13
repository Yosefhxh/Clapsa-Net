"use client";

import { useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, Plus, Upload } from "lucide-react";
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

/** Zona para soltar o elegir el PDF de un documento sin archivo. */
function ZonaSubir({ op, doc }: { op: OperacionDetalle; doc: DocumentoExpediente }) {
  const input = useRef<HTMLInputElement>(null);
  const { pendiente, ejecutar } = useAccion();
  const [encima, setEncima] = useState(false);
  const subir = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    ejecutar(() => subirDocumentoAction(op.id, doc.id, fd));
  };
  return (
    <button
      type="button"
      className={`clp-dc-drop ${encima ? "encima" : ""}`}
      disabled={pendiente}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); subir(e.dataTransfer.files[0]); }}
    >
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-label={`Archivo para ${doc.nombre}`} onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ""; }} />
      {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
      <span><b>{pendiente ? "Subiendo…" : "Arrastra el PDF aquí o haz clic para subirlo"}</b><small>Solo PDF · máximo 5 MB</small></span>
    </button>
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
      <div className="clp-docs-cards">
        {op.documentos.map((d) => {
          const tono = d.estado === "APROBADO" ? "ok" : d.estado === "RECHAZADO" ? "mal" : d.requisito === "OBLIGATORIO" ? "obligatorio" : "";
          return (
            <article key={d.id} className={`clp-dc ${tono}`}>
              <div className="clp-dc-info">
                <div className="clp-dc-nom">{d.nombre}<span className={`clp-dc-req ${d.requisito === "OBLIGATORIO" ? "obl" : ""}`}>{d.requisito === "OBLIGATORIO" ? "Obligatorio" : "Si aplica"}</span></div>
                {d.descripcion ? <div className="clp-dc-desc">{d.descripcion}</div> : null}
                <div className="clp-dc-meta">
                  <PillDocumento estado={d.estado} />
                  {d.subidoEn ? <span>Subió {d.subidoPor ?? "—"} · {formatoFechaHora(d.subidoEn)}</span> : null}
                  {d.revisadoPor ? <span>Revisó {d.revisadoPor}</span> : null}
                </div>
                {d.motivoRechazo ? <div className="clp-dc-motivo">Motivo del rechazo: {d.motivoRechazo}</div> : null}
              </div>
              <div className="clp-dc-lado">
                {d.url ? (
                  <div className="clp-dc-archivo">
                    <a href={d.url} target="_blank" rel="noreferrer" className="clp-dc-arch" title={d.nombreArchivo ?? d.nombre}>
                      <FileText aria-hidden /><span>{d.nombreArchivo ?? d.nombre}</span>{d.estado === "APROBADO" ? <Download aria-hidden /> : <Eye aria-hidden />}
                    </a>
                    {editable && d.estado === "POR_REVISAR" ? (
                      <>
                        <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente} onClick={() => ejecutar(() => revisarDocumentoAction(op.id, d.id, true, null))}>Aprobar</button>
                        <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm !text-red-700" disabled={pendiente} onClick={() => { setMotivo(""); setRechazando(d); }}>Rechazar</button>
                      </>
                    ) : null}
                    {editable && d.estado === "RECHAZADO" ? <BotonSubir op={op} doc={d} etiqueta="Subir nueva versión" /> : null}
                    {editable && d.estado === "APROBADO" ? <BotonSubir op={op} doc={d} etiqueta="Reemplazar" /> : null}
                  </div>
                ) : editable ? <ZonaSubir op={op} doc={d} /> : <span className="clp-dc-sin">Sin archivo</span>}
              </div>
            </article>
          );
        })}
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
