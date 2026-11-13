"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { Check, ExternalLink, FileText, Search, TriangleAlert, Upload } from "lucide-react";

export type EstadoConstancia = "vacio" | "leyendo" | "listo" | "error" | "guardada";

export interface InfoConstancia {
  nombre: string;
  peso: string;
  miniatura: string | null;
}

interface Props {
  estado: EstadoConstancia;
  info: InfoConstancia | null;
  encima: boolean;
  /** Qué datos llena la constancia, por ejemplo "Llena razón social, RFC y domicilio". */
  ayuda: string;
  campos: string[];
  /** Constancia ya guardada (al editar). */
  urlGuardada?: string | null;
  deshabilitado?: boolean;
  onArchivo: (archivo: File) => void;
  onVer: (miniatura: HTMLElement) => void;
}

export const pesoArchivo = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Zona para cargar la constancia de situación fiscal, con lectura, miniatura y vista ampliada. */
export function ConstanciaDrop({ estado, info, encima, ayuda, campos, urlGuardada, deshabilitado, onArchivo, onVer }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const explorar = () => { if (estado !== "leyendo" && !deshabilitado) input.current?.click(); };

  const alPicar = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const mini = (e.target as HTMLElement).closest<HTMLElement>(".clp-rd-mini");
    if (mini && estado === "listo") { onVer(mini); return; }
    explorar();
  };
  const alTecla = (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); explorar(); } };

  return (
    <div className={`clp-rc-drop ${estado} ${encima ? "encima" : ""}`} tabIndex={0} role="button" aria-label="Cargar constancia de situación fiscal en PDF" aria-busy={estado === "leyendo" || undefined} onClick={alPicar} onKeyDown={alTecla}>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onArchivo(f); e.target.value = ""; }} />
      {estado === "vacio" ? (
        <>
          <div className="clp-rd-ico"><Upload aria-hidden /></div>
          <b>Arrastra aquí la Constancia de Situación Fiscal (PDF) o haz clic para explorar</b>
          <small>{ayuda} · Solo PDF, máximo 5 MB</small>
          <span className="clp-btn clp-btn-secondary clp-btn-sm clp-rd-btn"><FileText className="h-4 w-4" aria-hidden />Explorar archivos</span>
        </>
      ) : estado === "guardada" ? (
        <div className="clp-rd-doc">
          <div className="clp-rd-mini"><div className="clp-rd-fake"><i /><i /><b /><i /><i className="c" /><i /><b /><i /><i className="c" /><i /></div></div>
          <div className="clp-rd-meta">
            <div className="clp-rd-nom"><span className="clp-rd-ok"><Check aria-hidden /></span><span>Constancia guardada</span></div>
            <small>Se cargó con el registro</small>
            {urlGuardada ? <a className="clp-btn clp-btn-secondary clp-btn-sm" href={urlGuardada} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4" aria-hidden />Ver constancia</a> : null}
            <span className="clp-btn clp-btn-secondary clp-btn-sm clp-rd-btn">Cambiar archivo</span>
          </div>
        </div>
      ) : (
        <div className="clp-rd-doc">
          <div className="clp-rd-mini">
            {info?.miniatura ? <img src={info.miniatura} alt="Primera página de la constancia" /> : <div className="clp-rd-fake"><i /><i /><b /><i /><i className="c" /><i /><b /><i /><i className="c" /><i /></div>}
            {estado === "leyendo" ? <span className="clp-rd-scan" /> : null}
            {estado === "listo" ? <span className="clp-rd-lupa" aria-hidden="true"><Search /><b>Ver constancia</b></span> : null}
          </div>
          <div className="clp-rd-meta">
            <div className="clp-rd-nom">
              {estado === "listo" ? <span className="clp-rd-ok"><Check aria-hidden /></span> : estado === "leyendo" ? <span className="clp-rd-spin" aria-hidden /> : <span className="clp-rd-mal"><TriangleAlert aria-hidden /></span>}
              <span>{info?.nombre}</span>
            </div>
            <small>{info?.peso} · {estado === "leyendo" ? "Leyendo constancia…" : estado === "listo" ? "Datos tomados de la constancia" : "No se pudieron leer los datos"}</small>
            {estado === "listo" ? <ul className="clp-rd-lista">{campos.map((c) => <li key={c}><Check aria-hidden />{c}</li>)}</ul> : null}
            {estado !== "leyendo" ? <span className="clp-btn clp-btn-secondary clp-btn-sm clp-rd-btn">Cambiar archivo</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
