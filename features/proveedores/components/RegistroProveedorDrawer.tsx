"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, Upload } from "lucide-react";
import type { HitoOperativo, TipoProveedor } from "@prisma/client";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useToast } from "@/shared/components/ui/Toast";
import { extractPdfData } from "@/shared/utils/extractPdfData";
import { validarRfc } from "@/shared/utils/validaciones";
import { actualizarProveedor, registrarProveedor } from "../actions/proveedores";
import type { ProveedorVista } from "../dal/proveedores-dal";
import { ETIQUETA_TIPO_PROVEEDOR } from "../types";

export interface PasoServicio { id: string; clave: HitoOperativo; nombre: string }

/** Servicios que se sugieren (no se marcan solos) según el tipo de proveedor. */
const SUGERIDOS: Record<TipoProveedor, HitoOperativo[]> = {
  LOGISTICA: ["FLETE_MARITIMO", "FLETE_AEREO", "FT_INTERMODAL", "FT_NACIONAL", "MANIOBRAS_PORTUARIAS", "MANIOBRAS_ALMACEN"],
  ADUANAL: ["UVA", "ALMACENAJE", "OTRAS"],
  GENERALES: ["OTRAS"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  pasos: PasoServicio[];
  aduanas: string[];
  editando: ProveedorVista | null;
}

const vacio = { razonSocial: "", tipoProveedor: "LOGISTICA" as TipoProveedor, rfc: "", correo: "", telefono: "", direccion: "" };

export function RegistroProveedorDrawer({ open, onClose, pasos, aduanas, editando }: Props) {
  const avisar = useToast();
  const [guardando, iniciar] = useTransition();
  const [form, setForm] = useState(() => (editando ? { ...vacio, ...editando } : vacio));
  const [servicios, setServicios] = useState<Map<string, string>>(() => new Map(editando?.servicios.map((s) => [s.pasoId, s.tarifa?.toString() ?? ""]) ?? []));
  const [aduanasSel, setAduanasSel] = useState<Set<string>>(() => new Set(editando?.aduanas ?? []));
  const [fuenteAlta, setFuenteAlta] = useState<"MANUAL" | "CONSTANCIA">(editando?.fuenteAlta ?? "MANUAL");
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState("");
  const rfc = validarRfc(form.rfc);

  // Constancia de situación fiscal: llena razón social, RFC y dirección.
  const alSoltar = useCallback(async (archivos: File[]) => {
    const archivo = archivos[0];
    if (!archivo) return;
    setEscaneando(true);
    setError("");
    try {
      const datos = await extractPdfData(archivo);
      if (!datos.rfc) return setError("No se encontró el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal.");
      setForm((f) => ({ ...f, razonSocial: datos.razonSocial || f.razonSocial, rfc: datos.rfc, direccion: datos.domicilio || f.direccion }));
      setFuenteAlta("CONSTANCIA");
    } catch {
      setError("No se pudo leer el PDF. Intenta con otro archivo.");
    } finally {
      setEscaneando(false);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: alSoltar, accept: { "application/pdf": [".pdf"] }, maxSize: 5 * 1024 * 1024, multiple: false, disabled: escaneando,
  });

  const alternarServicio = (id: string) =>
    setServicios((s) => {
      const n = new Map(s);
      if (n.has(id)) n.delete(id);
      else n.set(id, "");
      return n;
    });
  const alternarAduana = (a: string) =>
    setAduanasSel((s) => {
      const n = new Set(s);
      if (n.has(a)) n.delete(a);
      else n.add(a);
      return n;
    });

  const guardar = () => {
    setError("");
    const datos = {
      ...form,
      fuenteAlta,
      aduanas: [...aduanasSel],
      servicios: [...servicios.entries()].map(([pasoId, tarifa]) => ({ pasoId, tarifa: tarifa.trim() === "" ? null : Number(tarifa.replace(/,/g, "")) })),
    };
    if (datos.servicios.some((s) => s.tarifa != null && (!Number.isFinite(s.tarifa) || s.tarifa < 0))) return setError("Revisa las tarifas: deben ser números positivos.");
    iniciar(async () => {
      const r = editando ? await actualizarProveedor(editando.id, datos) : await registrarProveedor(datos);
      if (!r.ok) return setError(r.error);
      avisar(r.mensaje ?? "Proveedor guardado.");
      onClose();
    });
  };

  const sugeridos = SUGERIDOS[form.tipoProveedor];
  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editando ? `Editar ${editando.razonSocial}` : "Registrar proveedor"}
      subtitle="Datos fiscales, los servicios que presta (tus etapas) y dónde los presta."
      footer={
        <>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editando ? "Guardar cambios" : "Guardar proveedor"}
          </button>
        </>
      }
    >
      {error ? <div className="clp-alert mb-4 text-sm font-medium text-red-700" role="alert">{error}</div> : null}

      {!editando ? (
        <section className="clp-grupo">
          <h3 className="clp-grupo-titulo">1 · Constancia de situación fiscal (opcional)</h3>
          <div {...getRootProps()} className={`clp-dropzone ${isDragActive ? "clp-dropzone-activa" : ""}`}>
            <input {...getInputProps()} aria-label="Constancia de situación fiscal" />
            {escaneando ? <Loader2 className="mb-2 h-7 w-7 animate-spin text-aduanaBlue" /> : fuenteAlta === "CONSTANCIA" ? <FileText className="mb-2 h-7 w-7 text-green-700" /> : <Upload className="mb-2 h-7 w-7 text-aduanaBlue" />}
            <p className="text-sm font-medium text-slate-700">{escaneando ? "Leyendo constancia…" : fuenteAlta === "CONSTANCIA" ? "Datos tomados de la constancia" : "Arrastra el PDF o haz clic para buscarlo"}</p>
            <p className="mt-1 text-xs text-slate-500">Llena razón social, RFC y dirección · Solo PDF, máx. 5 MB</p>
          </div>
        </section>
      ) : null}

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">{editando ? "1" : "2"} · Datos del proveedor</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="clp-label" htmlFor="pv-razon">Razón social <span className="text-red-600">*</span></label>
            <input id="pv-razon" className="clp-input" value={form.razonSocial} onChange={set("razonSocial")} maxLength={200} />
          </div>
          <div>
            <label className="clp-label" htmlFor="pv-tipo">Tipo <span className="text-red-600">*</span></label>
            <select id="pv-tipo" className="clp-input" value={form.tipoProveedor} onChange={set("tipoProveedor")}>
              {(Object.keys(ETIQUETA_TIPO_PROVEEDOR) as TipoProveedor[]).map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_PROVEEDOR[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="clp-label" htmlFor="pv-rfc">RFC <span className="text-red-600">*</span></label>
            <input id="pv-rfc" className="clp-input clp-mono uppercase" value={form.rfc} onChange={set("rfc")} maxLength={13} />
            {form.rfc ? <p className={rfc.valido ? "clp-ayuda !text-green-700" : "clp-error-campo"}>{rfc.valido ? `✓ Persona ${rfc.persona === "MORAL" ? "moral" : "física"}` : "RFC de 12 o 13 caracteres"}</p> : null}
          </div>
          <div>
            <label className="clp-label" htmlFor="pv-correo">Correo <span className="text-red-600">*</span></label>
            <input id="pv-correo" type="email" className="clp-input" value={form.correo} onChange={set("correo")} />
          </div>
          <div>
            <label className="clp-label" htmlFor="pv-tel">Teléfono <span className="text-red-600">*</span></label>
            <input id="pv-tel" className="clp-input clp-mono" inputMode="tel" value={form.telefono} onChange={set("telefono")} />
          </div>
          <div className="md:col-span-2">
            <label className="clp-label" htmlFor="pv-dir">Dirección <span className="text-red-600">*</span></label>
            <input id="pv-dir" className="clp-input" value={form.direccion} onChange={set("direccion")} maxLength={300} />
          </div>
        </div>
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">{editando ? "2" : "3"} · Servicios que presta {form.tipoProveedor !== "GENERALES" ? <span className="text-red-600">*</span> : null}</h3>
        <p className="mb-2 text-sm text-slate-600">
          Marca lo que hace este proveedor. Según el tipo se <b>sugieren</b> servicios (punto morado), pero tú decides. En las operaciones,
          “Asignar proveedor” solo muestra a quien tiene marcado ese servicio.
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Servicios">
          {pasos.map((p) => {
            const activo = servicios.has(p.id);
            return (
              <button key={p.id} type="button" aria-pressed={activo} onClick={() => alternarServicio(p.id)}
                className={`relative rounded-lg border px-3 py-1.5 text-sm font-semibold ${activo ? "border-[#7a4bd6] bg-[#f1ebfd] text-[#6d3fc8]" : "border-linea bg-white text-slate-600"}`}>
                {activo ? "✓ " : ""}{p.nombre}
                {sugeridos.includes(p.clave) ? <i className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-white bg-[#7a4bd6]" aria-label="Sugerido" /> : null}
              </button>
            );
          })}
        </div>
        {servicios.size ? (
          <div className="mt-3 space-y-1.5">
            {pasos.filter((p) => servicios.has(p.id)).map((p) => (
              <label key={p.id} className="grid grid-cols-[1fr_9rem] items-center gap-3 rounded-lg border border-linea bg-slate-50 px-3 py-1.5 text-sm">
                <span>Tarifa base · {p.nombre}</span>
                <span className="flex items-center gap-1">$<input className="clp-input !h-8 tabular-nums" inputMode="decimal" placeholder="0.00" value={servicios.get(p.id)} onChange={(e) => setServicios((s) => new Map(s).set(p.id, e.target.value))} aria-label={`Tarifa de ${p.nombre}`} /></span>
              </label>
            ))}
            <p className="clp-ayuda">MXN por servicio. Se usa como costo inicial al asignarlo; se puede cambiar en cada operación.</p>
          </div>
        ) : null}
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">{editando ? "3" : "4"} · Aduanas donde da servicio</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aduanas">
          {aduanas.map((a) => (
            <button key={a} type="button" aria-pressed={aduanasSel.has(a)} onClick={() => alternarAduana(a)} className="clp-dt-chip">{aduanasSel.has(a) ? "✓ " : ""}{a}</button>
          ))}
        </div>
        <p className="clp-ayuda">Si no marcas ninguna, se considera que da servicio en todas.</p>
      </section>
    </Drawer>
  );
}
