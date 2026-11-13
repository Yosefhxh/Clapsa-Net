"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, IdCard, Loader2, Pencil, Upload } from "lucide-react";
import type { TipoCliente } from "@prisma/client";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MorphModal } from "@/shared/components/ui/MorphModal";
import { useToast } from "@/shared/components/ui/Toast";
import { useAccion } from "@/shared/hooks/useAccion";
import { ConstanciaDrop, pesoArchivo, type EstadoConstancia, type InfoConstancia } from "@/shared/components/registro/ConstanciaDrop";
import { PieRegistro, RegistroDividido, type EstadoBarra } from "@/shared/components/registro/RegistroDividido";
import { leerConstancia } from "@/shared/utils/extractPdfData";
import { ESTADOS_MEXICO } from "@/shared/utils/estadosMexico";
import { validarRfc } from "@/shared/utils/validaciones";
import { actualizarCliente, registrarCliente, subirEncargoAction } from "../actions/clientes-actions";
import type { ClienteVista } from "../dal/clientes-dal";
import { construirDomicilio, descomponerDomicilio } from "../utils/clientes-utils";

export interface ForwarderOpcion { id: number; folio: string; razonSocial: string; estado: "ACTIVO" | "INACTIVO" }

interface Props {
  tipoInicial: TipoCliente;
  editando: ClienteVista | null;
  forwarders: ForwarderOpcion[];
  siguientesFolios: Record<TipoCliente, string>;
  /** Regresa a la lista; si se guardó, con el folio para resaltarlo. */
  onVolver: (guardado?: { folio: string }) => void;
}

const MAX_PDF = 5 * 1024 * 1024;
const fechaInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function formInicial(c: ClienteVista | null, tipo: TipoCliente) {
  const p = descomponerDomicilio(c?.domicilio ?? "");
  return {
    tipo: c?.tipo ?? tipo,
    razonSocial: c?.razonSocial ?? "",
    rfc: c?.rfc ?? "",
    padron: c?.padronImportadores == null ? "" : c.padronImportadores ? "si" : "no",
    clientePadreId: c?.clientePadreId ?? (null as number | null),
    encargoConferido: c?.encargoConferido ?? false,
    fechaVigenciaEncargo: fechaInput(c?.fechaVigenciaEncargo ?? null),
    calle: p.calle,
    estado: p.estado,
    codigoPostal: p.codigoPostal,
    domicilio: c && c.domicilio !== "No especificado" ? c.domicilio : "",
    correo: "",
  };
}
type Form = ReturnType<typeof formInicial>;

/** Registrar o editar cliente en vista dividida: constancia a la izquierda, datos a la derecha. */
export function RegistroCliente({ tipoInicial, editando, forwarders, siguientesFolios, onVolver }: Props) {
  const router = useRouter();
  const avisar = useToast();
  const encargo = useAccion();
  const archivoEncargo = useRef<HTMLInputElement>(null);
  const [guardando, iniciar] = useTransition();
  const [form, setForm] = useState(() => formInicial(editando, tipoInicial));
  const [inicial] = useState(() => JSON.stringify(formInicial(editando, tipoInicial)));
  const [constancia, setConstancia] = useState<{ estado: EstadoConstancia; info: InfoConstancia | null; archivo: File | null }>({
    estado: editando?.pdfConstanciaUrl ? "guardada" : "vacio", info: null, archivo: null,
  });
  const [llenos, setLlenos] = useState<Set<string>>(new Set());
  const [crearOperacion, setCrearOperacion] = useState(false);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState<HTMLElement | null>(null);

  const directo = form.tipo === "DIRECTO";
  const rfc = validarRfc(form.rfc);
  const leyendo = constancia.estado === "leyendo";
  const cambios = !editando || JSON.stringify(form) !== inicial || constancia.archivo != null;
  const estadosOpciones = useMemo(() => (form.estado && !(ESTADOS_MEXICO as readonly string[]).includes(form.estado) ? [...ESTADOS_MEXICO, form.estado] : [...ESTADOS_MEXICO]), [form.estado]);
  const forwardersOpciones = forwarders.filter((f) => f.estado === "ACTIVO" || f.id === form.clientePadreId);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (k === "calle" || k === "estado" || k === "codigoPostal") n.domicilio = construirDomicilio(n.calle, n.estado, n.codigoPostal).replace("No especificado", "");
      return n;
    });
    setLlenos((l) => { if (!l.has(k)) return l; const n = new Set(l); n.delete(k); return n; });
  };

  const estadoBarra: EstadoBarra = guardando
    ? { texto: editando ? "Guardando cambios…" : "Guardando cliente…", tono: "info", cargando: true }
    : leyendo ? { texto: "Leyendo constancia…", tono: "info", cargando: true }
    : editando && !cambios ? { texto: "Sin cambios", tono: "neutro" }
    : form.razonSocial.trim() && rfc.valido ? (editando ? { texto: "Cambios sin guardar", tono: "alerta" } : { texto: "Listo para guardar", tono: "ok" })
    : form.rfc && !rfc.valido ? { texto: "Revisa el RFC", tono: "alerta" }
    : form.razonSocial || form.rfc ? { texto: "Faltan datos", tono: "neutro" }
    : { texto: "Sin constancia", tono: "neutro" };

  // Constancia de situación fiscal: llena razón social, RFC y domicilio con la extracción real.
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
      const dom = !datos.domicilio || datos.domicilio === "No especificado" ? "" : datos.domicilio;
      const p = descomponerDomicilio(dom);
      const valores = {
        razonSocial: datos.razonSocial === "No especificada" ? "" : datos.razonSocial,
        rfc: datos.rfc,
        calle: p.calle,
        estado: p.estado,
        codigoPostal: p.codigoPostal,
        domicilio: dom,
      };
      setForm((f) => ({ ...f, ...valores }));
      setLlenos(new Set(Object.entries(valores).filter(([, v]) => v).map(([k]) => k)));
      setConstancia({ estado: "listo", info: { ...info }, archivo });
    } catch (e) {
      setConstancia({ estado: "error", info: { ...info }, archivo: null });
      setError(e instanceof Error && e.message.startsWith("No se pudo") ? e.message : "Error al procesar el PDF. Intenta con otro archivo.");
    }
  };

  const guardar = () => {
    if (guardando || leyendo) return;
    if (!form.razonSocial.trim()) { setError("Escribe la razón social."); document.getElementById("rc-razon")?.focus(); return; }
    if (!rfc.valido) { setError("Revisa el RFC: debe tener 12 (moral) o 13 (física) caracteres."); document.getElementById("rc-rfc")?.focus(); return; }
    setError("");
    const datos = {
      razonSocial: form.razonSocial,
      rfc: form.rfc,
      domicilio: form.domicilio,
      tipo: form.tipo,
      padronImportadores: !directo || form.padron === "" ? null : form.padron === "si",
      encargoConferido: form.encargoConferido,
      fechaVigenciaEncargo: form.encargoConferido && form.fechaVigenciaEncargo ? form.fechaVigenciaEncargo : null,
      clientePadreId: directo ? form.clientePadreId : null,
    };
    let archivo: FormData | null = null;
    if (constancia.archivo) { archivo = new FormData(); archivo.set("constancia", constancia.archivo); }
    iniciar(async () => {
      if (editando) {
        const r = await actualizarCliente(editando.id, datos, archivo);
        if (!r.ok) return setError(r.error);
        avisar(`Cambios guardados en ${editando.folio}.`);
        onVolver({ folio: editando.folio });
        return;
      }
      const r = await registrarCliente(datos, archivo);
      if (!r.ok) return setError(r.error);
      avisar(`Cliente registrado con folio ${r.data.folio}.`);
      if (crearOperacion) router.push(`/operaciones?nueva=1&cliente=${r.data.id}`);
      else onVolver({ folio: r.data.folio });
    });
  };

  const campo = (k: keyof Form) => `clp-rf-in ${llenos.has(k) ? "lleno" : ""}`;

  return (
    <>
      <RegistroDividido
        avatar={form.razonSocial.trim() ? <Avatar key={form.razonSocial.trim().slice(0, 12)} texto={form.razonSocial} className="clp-rcf-entra" /> : <span className="clp-av clp-rcf-vacio"><IdCard aria-hidden /></span>}
        datos={[
          { etiqueta: "Folio", valor: editando ? editando.folio : siguientesFolios[form.tipo], mono: true },
          { etiqueta: "Razón social", valor: form.razonSocial.trim(), vacio: "Por capturar", ancho: true },
          { etiqueta: "RFC", valor: form.rfc.trim().toUpperCase(), mono: true },
          { etiqueta: "Tipo", valor: directo ? "Directo" : "Forwarder" },
        ]}
        estado={estadoBarra}
        editando={editando != null}
        guardando={guardando}
        etiquetaVolver="Volver a Clientes"
        onVolver={() => onVolver()}
        alSoltarArchivo={procesar}
        error={error}
        izquierda={(encima) => (
          <ConstanciaDrop
            estado={constancia.estado}
            info={constancia.info}
            encima={encima}
            ayuda="Llena razón social, RFC y domicilio"
            campos={["Razón social", "RFC", "Domicilio"]}
            urlGuardada={editando?.pdfConstanciaUrl}
            deshabilitado={guardando}
            onArchivo={procesar}
            onVer={setVisor}
          />
        )}
      >
        <div className={`clp-rc-card ${leyendo ? "escaneando" : ""}`}>
          <div className="clp-rc-card-h"><h3>Datos fiscales</h3></div>
          <div className="clp-rc-grid">
            <div className="clp-rf ancho" data-campo>
              <label htmlFor="rc-razon">Razón social <em>*</em></label>
              <div className={campo("razonSocial")}><input id="rc-razon" className="clp-rc-input" maxLength={200} placeholder="Nombre de la empresa o persona" value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} /></div>
            </div>
            <div className="clp-rf" data-campo>
              <label htmlFor="rc-rfc">RFC <em>*</em></label>
              <div className={campo("rfc")}><input id="rc-rfc" className="clp-rc-input clp-mono uppercase" maxLength={13} placeholder="12 o 13 caracteres" value={form.rfc} onChange={(e) => set("rfc", e.target.value.toUpperCase())} /></div>
              {form.rfc ? <small className={`clp-rf-ayuda ${rfc.valido ? "ok" : "mal"}`}>{rfc.valido ? `✓ Persona ${rfc.persona === "MORAL" ? "moral" : "física"}` : "RFC de 12 o 13 caracteres"}</small> : null}
            </div>
            <div className="clp-rf">
              <label>Tipo de cliente</label>
              <div className="clp-rc-seg" role="group" aria-label="Tipo de cliente">
                {(["DIRECTO", "FORWARDER"] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={form.tipo === t} disabled={editando != null} title={editando ? "El tipo no se cambia al editar" : undefined} onClick={() => set("tipo", t)}>{t === "DIRECTO" ? "Directo" : "Forwarder"}</button>
                ))}
              </div>
            </div>
            {directo ? (
              <>
                <div className="clp-rf">
                  <label htmlFor="rc-padron">Padrón de importadores</label>
                  <div className="clp-rf-in">
                    <select id="rc-padron" className="clp-rc-input" value={form.padron} onChange={(e) => set("padron", e.target.value)}>
                      <option value="">Sin verificar</option>
                      <option value="si">Activo</option>
                      <option value="no">Inactivo / suspendido</option>
                    </select>
                  </div>
                </div>
                <div className="clp-rf">
                  <label htmlFor="rc-fwd">Forwarder que lo atiende <span className="clp-rf-opc">Opcional</span></label>
                  <div className="clp-rf-in">
                    <select id="rc-fwd" className="clp-rc-input" value={form.clientePadreId ?? ""} onChange={(e) => set("clientePadreId", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Ninguno</option>
                      {forwardersOpciones.map((f) => <option key={f.id} value={f.id}>{f.folio} - {f.razonSocial}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : null}
            <div className="clp-rf ancho clp-rc-encargo">
              <label className="clp-rc-check"><input type="checkbox" checked={form.encargoConferido} onChange={(e) => set("encargoConferido", e.target.checked)} /> El cliente tiene encargo conferido vigente</label>
              {form.encargoConferido ? (
                <div className="clp-rc-vig">
                  <span className="clp-rc-vig-l">Vigente hasta</span>
                  <div className="clp-rf-in"><input type="date" className="clp-rc-input" aria-label="Vigente hasta" title="Se avisa en el Home 30 días antes de que venza." value={form.fechaVigenciaEncargo} onChange={(e) => set("fechaVigenciaEncargo", e.target.value)} /></div>
                  {editando ? (
                    <>
                      <input ref={archivoEncargo} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="PDF del encargo conferido"
                        onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set("file", f); encargo.ejecutar(() => subirEncargoAction(editando.id, fd)); e.target.value = ""; }} />
                      {editando.pdfEncargoUrl ? <a className="clp-btn clp-btn-secondary clp-btn-sm" href={editando.pdfEncargoUrl} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />Ver encargo</a> : null}
                      <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={encargo.pendiente} onClick={() => archivoEncargo.current?.click()}>
                        {encargo.pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {editando.pdfEncargoUrl ? "Reemplazar PDF" : "Subir PDF del encargo"}
                      </button>
                    </>
                  ) : <span className="clp-rf-ayuda">El PDF del encargo se sube después de guardar.</span>}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={`clp-rc-card ${leyendo ? "escaneando" : ""}`}>
          <div className="clp-rc-card-h"><h3>Domicilio y contacto</h3></div>
          <div className="clp-rc-grid">
            <div className="clp-rf ancho" data-campo>
              <label htmlFor="rc-calle">Calle y número</label>
              <div className={campo("calle")}><input id="rc-calle" className="clp-rc-input" placeholder="Calle y número" value={form.calle} onChange={(e) => set("calle", e.target.value)} /></div>
            </div>
            <div className="clp-rf" data-campo>
              <label htmlFor="rc-estado">Estado</label>
              <div className={campo("estado")}>
                <select id="rc-estado" className="clp-rc-input" value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                  <option value="">Elige el estado</option>
                  {estadosOpciones.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="clp-rf" data-campo>
              <label htmlFor="rc-cp">Código postal</label>
              <div className={campo("codigoPostal")}><input id="rc-cp" className="clp-rc-input clp-mono" inputMode="numeric" maxLength={5} placeholder="00000" value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <div className="clp-rf ancho" data-campo>
              <label htmlFor="rc-dom">Domicilio completo</label>
              <div className={campo("domicilio")}><input id="rc-dom" className="clp-rc-input" placeholder="Se arma con calle, estado y código postal" value={form.domicilio} onChange={(e) => set("domicilio", e.target.value)} /></div>
            </div>
            <div className="clp-rf ancho">
              <label htmlFor="rc-correo">Correo de contacto <span className="clp-rf-opc">Propuesta</span></label>
              <div className="clp-rf-in"><input id="rc-correo" type="email" className="clp-rc-input" placeholder="A dónde llegan los avisos · avisos@empresa.com" value={form.correo} onChange={(e) => set("correo", e.target.value)} /></div>
            </div>
          </div>
          <PieRegistro>
            {editando ? (
              <span className="clp-rc-edit-nota"><Pencil aria-hidden />Estás editando un registro existente</span>
            ) : (
              <label className="clp-rc-crear-op"><input type="checkbox" checked={crearOperacion} onChange={(e) => setCrearOperacion(e.target.checked)} disabled={guardando} /> Crear una operación para este cliente al guardar</label>
            )}
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => onVolver()} disabled={guardando}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando || leyendo || !cambios} aria-busy={guardando || undefined}>
              {guardando ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}
              {guardando ? (editando ? "Guardando cambios…" : "Guardando…") : editando ? "Guardar cambios" : "Guardar cliente"}
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
