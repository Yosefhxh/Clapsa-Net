"use client";

import { useState, useTransition } from "react";
import { Check, FileText, Pencil, Truck } from "lucide-react";
import type { TipoProveedor } from "@prisma/client";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MorphModal } from "@/shared/components/ui/MorphModal";
import { useToast } from "@/shared/components/ui/Toast";
import { ConstanciaDrop, pesoArchivo, type EstadoConstancia, type InfoConstancia } from "@/shared/components/registro/ConstanciaDrop";
import { PieRegistro, RegistroDividido, type EstadoBarra } from "@/shared/components/registro/RegistroDividido";
import { leerConstancia } from "@/shared/utils/extractPdfData";
import { validarRfc } from "@/shared/utils/validaciones";
import { actualizarProveedor, registrarProveedor } from "../actions/proveedores";
import type { ProveedorVista } from "../dal/proveedores-dal";
import { ETIQUETA_TIPO_PROVEEDOR, SUGERIDOS_PROVEEDOR, type PasoServicio } from "../types";

interface Props {
  editando: ProveedorVista | null;
  pasos: PasoServicio[];
  aduanas: string[];
  /** Regresa a la lista; si se guardó, con el id para resaltarlo y si se pidió registrar otro. */
  onVolver: (guardado?: { id: number; otro: boolean }) => void;
}

const MAX_PDF = 5 * 1024 * 1024;
const TIPOS = Object.keys(ETIQUETA_TIPO_PROVEEDOR) as TipoProveedor[];
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TELEFONO = /^\+?[\d\s-]{10,16}$/;

function formInicial(p: ProveedorVista | null) {
  return {
    razonSocial: p?.razonSocial ?? "",
    rfc: p?.rfc ?? "",
    tipoProveedor: p?.tipoProveedor ?? ("LOGISTICA" as TipoProveedor),
    correo: p?.correo ?? "",
    telefono: p?.telefono ?? "",
    direccion: p?.direccion ?? "",
  };
}
type Form = ReturnType<typeof formInicial>;

const serviciosIniciales = (p: ProveedorVista | null) => new Map(p?.servicios.map((s) => [s.pasoId, s.tarifa?.toString() ?? ""]) ?? []);
const firma = (f: Form, serv: Map<string, string>, ad: Set<string>) => JSON.stringify([f, [...serv.entries()].sort(), [...ad].sort()]);

/** Qué le falta al proveedor para poder guardarse (mismas reglas que el servidor). */
function faltante(f: Form, servicios: number) {
  if (!f.razonSocial.trim()) return ["Escribe la razón social.", "rc-razon"];
  if (!validarRfc(f.rfc).valido) return ["Revisa el RFC: debe tener 12 (moral) o 13 (física) caracteres.", "rc-rfc"];
  if (!CORREO.test(f.correo.trim())) return ["Escribe un correo válido.", "rc-correo"];
  if (!TELEFONO.test(f.telefono.trim())) return ["El teléfono debe tener al menos 10 dígitos.", "rc-tel"];
  if (f.direccion.trim().length < 5) return ["Escribe la dirección.", "rc-dir"];
  if (f.tipoProveedor !== "GENERALES" && !servicios) return ["Marca al menos un servicio que presta.", null];
  return null;
}

/** Registrar o editar proveedor en vista dividida: constancia a la izquierda, datos y servicios a la derecha. */
export function RegistroProveedor({ editando, pasos, aduanas, onVolver }: Props) {
  const avisar = useToast();
  const [guardando, iniciar] = useTransition();
  const [form, setForm] = useState(() => formInicial(editando));
  const [servicios, setServicios] = useState(() => serviciosIniciales(editando));
  const [aduanasSel, setAduanasSel] = useState(() => new Set(editando?.aduanas ?? []));
  const [inicial] = useState(() => firma(formInicial(editando), serviciosIniciales(editando), new Set(editando?.aduanas ?? [])));
  const [constancia, setConstancia] = useState<{ estado: EstadoConstancia; info: InfoConstancia | null; archivo: File | null }>({
    estado: editando?.pdfConstanciaUrl ? "guardada" : "vacio", info: null, archivo: null,
  });
  const [llenos, setLlenos] = useState<Set<string>>(new Set());
  const [otro, setOtro] = useState(false);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState<HTMLElement | null>(null);

  const rfc = validarRfc(form.rfc);
  const leyendo = constancia.estado === "leyendo";
  const cambios = !editando || firma(form, servicios, aduanasSel) !== inicial || constancia.archivo != null;
  const falta = faltante(form, servicios.size);
  const sugeridos = SUGERIDOS_PROVEEDOR[form.tipoProveedor];
  const marcados = pasos.filter((p) => servicios.has(p.id));

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setLlenos((l) => { if (!l.has(k)) return l; const n = new Set(l); n.delete(k); return n; });
    setError("");
  };
  const alternarServicio = (id: string) => setServicios((s) => { const n = new Map(s); if (n.has(id)) n.delete(id); else n.set(id, ""); return n; });
  const alternarAduana = (a: string) => setAduanasSel((s) => { const n = new Set(s); if (n.has(a)) n.delete(a); else n.add(a); return n; });

  const estadoBarra: EstadoBarra = guardando
    ? { texto: editando ? "Guardando cambios…" : "Guardando proveedor…", tono: "info", cargando: true }
    : leyendo ? { texto: "Leyendo constancia…", tono: "info", cargando: true }
    : editando && !cambios ? { texto: "Sin cambios", tono: "neutro" }
    : !falta ? (editando ? { texto: "Cambios sin guardar", tono: "alerta" } : { texto: "Listo para guardar", tono: "ok" })
    : form.rfc && !rfc.valido ? { texto: "Revisa el RFC", tono: "alerta" }
    : form.razonSocial || form.rfc ? { texto: "Faltan datos", tono: "neutro" }
    : { texto: "Sin constancia", tono: "neutro" };

  // Constancia de situación fiscal (opcional): llena razón social, RFC y dirección con la extracción real.
  const procesar = async (archivo: File) => {
    setError("");
    if (!/\.pdf$/i.test(archivo.name) && archivo.type !== "application/pdf") return setError("Solo se aceptan archivos PDF.");
    if (archivo.size > MAX_PDF) return setError("El PDF pesa más de 5 MB.");
    const info: InfoConstancia = { nombre: archivo.name, peso: pesoArchivo(archivo.size), miniatura: null };
    setConstancia({ estado: "leyendo", info, archivo: null });
    try {
      const { datos, miniatura } = await leerConstancia(archivo);
      info.miniatura = miniatura;
      if (!datos.rfc) throw new Error("No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.");
      const valores = {
        razonSocial: datos.razonSocial === "No especificada" ? "" : datos.razonSocial,
        rfc: datos.rfc,
        direccion: !datos.domicilio || datos.domicilio === "No especificado" ? "" : datos.domicilio,
      };
      setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(valores).filter(([, v]) => v)) }));
      setLlenos(new Set(Object.entries(valores).filter(([, v]) => v).map(([k]) => k)));
      setConstancia({ estado: "listo", info: { ...info }, archivo });
    } catch (e) {
      setConstancia({ estado: "error", info: { ...info }, archivo: null });
      setError(e instanceof Error && e.message.startsWith("No se pudo") ? e.message : "Error al procesar el PDF. Intenta con otro archivo.");
    }
  };

  const guardar = () => {
    if (guardando || leyendo) return;
    if (falta) { setError(falta[0]!); if (falta[1]) document.getElementById(falta[1])?.focus(); return; }
    const lista = [...servicios.entries()].map(([pasoId, t]) => ({ pasoId, tarifa: t.trim() === "" ? null : Number(t.replace(/,/g, "")) }));
    if (lista.some((s) => s.tarifa != null && (!Number.isFinite(s.tarifa) || s.tarifa < 0))) return setError("Revisa las tarifas: deben ser números positivos.");
    setError("");
    const datos = {
      ...form,
      fuenteAlta: constancia.archivo ? ("CONSTANCIA" as const) : (editando?.fuenteAlta ?? "MANUAL"),
      aduanas: [...aduanasSel],
      servicios: lista,
    };
    let archivo: FormData | null = null;
    if (constancia.archivo) { archivo = new FormData(); archivo.set("constancia", constancia.archivo); }
    iniciar(async () => {
      if (editando) {
        const r = await actualizarProveedor(editando.id, datos, archivo);
        if (!r.ok) return setError(r.error);
        avisar(`Cambios guardados en ${form.razonSocial.trim()}.`);
        onVolver({ id: editando.id, otro: false });
        return;
      }
      const r = await registrarProveedor(datos, archivo);
      if (!r.ok) return setError(r.error);
      avisar(`Proveedor ${form.razonSocial.trim()} registrado.`);
      onVolver({ id: r.data.id, otro });
    });
  };

  const campo = (k: keyof Form) => `clp-rf-in ${llenos.has(k) ? "lleno" : ""}`;

  return (
    <>
      <RegistroDividido
        avatar={form.razonSocial.trim() ? <Avatar key={form.razonSocial.trim().slice(0, 12)} texto={form.razonSocial} className="clp-rcf-entra" /> : <span className="clp-av clp-rcf-vacio"><Truck aria-hidden /></span>}
        datos={[
          { etiqueta: "Razón social", valor: form.razonSocial.trim(), vacio: "Por capturar", ancho: true },
          { etiqueta: "RFC", valor: form.rfc.trim().toUpperCase(), mono: true },
          { etiqueta: "Tipo", valor: ETIQUETA_TIPO_PROVEEDOR[form.tipoProveedor] },
          { etiqueta: "Servicios", valor: servicios.size ? `${servicios.size} marcado${servicios.size === 1 ? "" : "s"}` : "", vacio: "Ninguno" },
        ]}
        estado={estadoBarra}
        editando={editando != null}
        guardando={guardando}
        etiquetaVolver="Volver a Proveedores"
        onVolver={() => onVolver()}
        alSoltarArchivo={procesar}
        error={error}
        izquierda={(encima) => (
          <ConstanciaDrop
            estado={constancia.estado}
            info={constancia.info}
            encima={encima}
            ayuda="Opcional · Llena razón social, RFC y dirección"
            campos={["Razón social", "RFC", "Dirección"]}
            urlGuardada={editando?.pdfConstanciaUrl}
            deshabilitado={guardando}
            onArchivo={procesar}
            onVer={setVisor}
          />
        )}
      >
        <div className={`clp-rc-card clp-rc-prov-datos ${leyendo ? "escaneando" : ""}`}>
          <div className="clp-rc-card-h"><h3>Datos del proveedor</h3></div>
          <div className="clp-rc-grid">
            <div className="clp-rf ancho" data-campo>
              <label htmlFor="rc-razon">Razón social <em>*</em></label>
              <div className={campo("razonSocial")}><input id="rc-razon" className="clp-rc-input" maxLength={200} placeholder="Nombre legal" value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} /></div>
            </div>
            <div className="clp-rf" data-campo>
              <label htmlFor="rc-rfc">RFC <em>*</em></label>
              <div className={campo("rfc")}><input id="rc-rfc" className="clp-rc-input clp-mono uppercase" maxLength={13} placeholder="12 o 13 caracteres" value={form.rfc} onChange={(e) => set("rfc", e.target.value.toUpperCase())} /></div>
              {form.rfc ? <small className={`clp-rf-ayuda ${rfc.valido ? "ok" : "mal"}`}>{rfc.valido ? `✓ Persona ${rfc.persona === "MORAL" ? "moral" : "física"}` : "RFC de 12 o 13 caracteres"}</small> : null}
            </div>
            <div className="clp-rf">
              <label>Tipo <em>*</em></label>
              <div className="clp-rc-seg" role="group" aria-label="Tipo de proveedor">
                {TIPOS.map((t) => <button key={t} type="button" aria-pressed={form.tipoProveedor === t} onClick={() => set("tipoProveedor", t)}>{ETIQUETA_TIPO_PROVEEDOR[t]}</button>)}
              </div>
            </div>
            <div className="clp-rf">
              <label htmlFor="rc-correo">Correo <em>*</em></label>
              <div className="clp-rf-in"><input id="rc-correo" type="email" className="clp-rc-input" placeholder="correo@empresa.com" value={form.correo} onChange={(e) => set("correo", e.target.value)} /></div>
            </div>
            <div className="clp-rf">
              <label htmlFor="rc-tel">Teléfono <em>*</em></label>
              <div className="clp-rf-in"><input id="rc-tel" className="clp-rc-input clp-mono" inputMode="tel" maxLength={16} placeholder="10 dígitos" value={form.telefono} onChange={(e) => set("telefono", e.target.value.replace(/[^\d\s+-]/g, ""))} /></div>
            </div>
            <div className="clp-rf ancho" data-campo>
              <label htmlFor="rc-dir">Dirección <em>*</em></label>
              <div className={campo("direccion")}><input id="rc-dir" className="clp-rc-input" maxLength={300} placeholder="Calle, número, ciudad, estado" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="clp-rc-card clp-rc-prov-serv">
          <div className="clp-rc-card-h"><h3>Servicios y cobertura</h3><span className="clp-pv-leyenda"><i />Sugerido para el tipo</span></div>
          <div className="clp-pv-bloque">
            <span className="clp-pv-l">
              Servicios que presta {form.tipoProveedor !== "GENERALES" ? <em>*</em> : null}
              {marcados.length ? <span className="clp-rf-opc">Tarifa base en MXN, editable en cada operación</span> : null}
            </span>
            <div className="clp-pv-chips" role="group" aria-label="Servicios que presta">
              {pasos.map((p) => (
                <button key={p.id} type="button" className={`clp-pv-chip ${sugeridos.includes(p.clave) ? "sug" : ""}`} aria-pressed={servicios.has(p.id)} onClick={() => { alternarServicio(p.id); setError(""); }}>
                  {servicios.has(p.id) ? "✓ " : ""}{p.nombre}
                </button>
              ))}
            </div>
          </div>
          {marcados.length ? (
            <div className="clp-pv-tarifas">
              {marcados.map((p) => (
                <label key={p.id} className="clp-pv-t">
                  <span>{p.nombre}</span>
                  <span className="clp-pv-t-in">$<input inputMode="decimal" placeholder="0.00" value={servicios.get(p.id)} aria-label={`Tarifa base de ${p.nombre}`} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); setServicios((s) => new Map(s).set(p.id, v)); }} /></span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="clp-pv-bloque clp-pv-aduanas">
            <span className="clp-pv-l">Aduanas donde da servicio <span className="clp-rf-opc">Si no marcas ninguna, son todas</span></span>
            <div className="clp-pv-chips" role="group" aria-label="Aduanas donde da servicio">
              {aduanas.map((a) => <button key={a} type="button" className="clp-pv-chip" aria-pressed={aduanasSel.has(a)} onClick={() => alternarAduana(a)}>{aduanasSel.has(a) ? "✓ " : ""}{a}</button>)}
            </div>
          </div>
          <PieRegistro>
            {editando ? (
              <span className="clp-rc-edit-nota"><Pencil aria-hidden />Estás editando un registro existente</span>
            ) : (
              <label className="clp-rc-crear-op"><input type="checkbox" checked={otro} onChange={(e) => setOtro(e.target.checked)} disabled={guardando} /> Registrar otro proveedor al guardar</label>
            )}
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => onVolver()} disabled={guardando}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando || leyendo || !cambios} aria-busy={guardando || undefined}>
              {guardando ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}
              {guardando ? (editando ? "Guardando cambios…" : "Guardando…") : editando ? "Guardar cambios" : "Guardar proveedor"}
            </button>
          </PieRegistro>
        </div>
      </RegistroDividido>

      {visor && constancia.info ? (
        <MorphModal
          origen={visor}
          alCerrar={() => setVisor(null)}
          datos={{
            clase: "clp-morph-doc",
            ancho: 700,
            icono: <span className="clp-av clp-mm-doc-ico"><FileText aria-hidden /></span>,
            eyebrow: `Constancia de situación fiscal · ${constancia.info.peso}`,
            titulo: constancia.info.nombre,
            pills: <span className="clp-pill clp-pill-ok">Datos tomados</span>,
            cuerpo: <div className="clp-mm-doc">{constancia.info.miniatura ? <img src={constancia.info.miniatura} alt="Constancia de situación fiscal" /> : <p className="p-6 text-sm text-slate-500">Sin vista previa.</p>}</div>,
            acciones: (cerrar) => <button type="button" className="clp-btn clp-btn-secondary" onClick={() => cerrar()}>Cerrar</button>,
          }}
        />
      ) : null}
    </>
  );
}
