"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import type { HitoOperativo, MedioTransporte, RequisitoDocumento, TipoDocumento } from "@prisma/client";
import { useSession } from "@/features/session";
import { PERMISOS, type Permiso } from "@/shared/auth/permisos";
import { useAccion } from "@/shared/hooks/useAccion";
import { FASES } from "@/features/operaciones/domain/proceso";
import { ETIQUETA_MEDIO } from "@/features/operaciones/types/vistas";
import { PASOS_ESENCIALES } from "../reglas";
import {
  activarAduanaAction, activarAlertaAction, activarClaveAction, agregarAduanaAction, agregarClaveAction,
  guardarAgenciaAction, guardarDocumentoAction, guardarPasoAction,
} from "../actions";

export interface DatosConfiguracion {
  agencia: { razonSocial: string; rfc: string | null; agenteAduanal: string | null; patente: string | null; honorariosBase: number; ivaHonorarios: number };
  aduanas: { id: number; clave: string; nombre: string; activa: boolean }[];
  pasos: { clave: HitoOperativo; nombre: string; descripcion: string | null; faseImpo: number; faseExpo: number; slaHoras: number | null; esServicio: boolean; medios: MedioTransporte[]; activo: boolean; requisitos: string }[];
  documentos: { tipo: TipoDocumento; nombre: string; descripcion: string | null; requisitoImpo: RequisitoDocumento; requisitoExpo: RequisitoDocumento }[];
  claves: { clave: string; descripcion: string; aplicaImpo: boolean; aplicaExpo: boolean; activa: boolean }[];
  alertas: { clave: string; nombre: string; descripcion: string; activa: boolean }[];
}

type Seccion = "agencia" | "aduanas" | "proceso" | "documentos" | "claves" | "alertas" | "cuenta" | "permisos";
const SECCIONES: { id: Seccion; titulo: string; detalle: string }[] = [
  { id: "agencia", titulo: "Agencia aduanal", detalle: "Patente y agente" },
  { id: "aduanas", titulo: "Aduanas", detalle: "Dónde opera" },
  { id: "proceso", titulo: "Proceso y etapas", detalle: "Fases, pasos y SLA" },
  { id: "documentos", titulo: "Documentos", detalle: "Expediente por operación" },
  { id: "claves", titulo: "Claves de pedimento", detalle: "Catálogo aduanero" },
  { id: "alertas", titulo: "Alertas", detalle: "Pendientes del Home" },
  { id: "cuenta", titulo: "Cuenta de gastos", detalle: "Honorarios e IVA" },
  { id: "permisos", titulo: "Roles y permisos", detalle: "Quién puede hacer qué" },
];

const REQUISITO: Record<RequisitoDocumento, string> = { OBLIGATORIO: "Obligatorio", SI_APLICA: "Si aplica", NO_APLICA: "No se pide" };

function Interruptor({ activo, onChange, disabled, etiqueta }: { activo: boolean; onChange: (v: boolean) => void; disabled?: boolean; etiqueta: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} onClick={() => onChange(!activo)}
      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-40 ${activo ? "bg-aduanaBlue" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function Tarjeta({ titulo, texto, children, accion }: { titulo: string; texto: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="clp-card p-5">
      <div className="mb-1 flex items-center justify-between gap-3"><h2 className="clp-section-title !text-base">{titulo}</h2>{accion}</div>
      <p className="mb-4 text-sm text-slate-600">{texto}</p>
      {children}
    </section>
  );
}

function Agencia({ datos, editable, soloCuenta }: { datos: DatosConfiguracion["agencia"]; editable: boolean; soloCuenta?: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const inicial = { ...datos, rfc: datos.rfc ?? "", agenteAduanal: datos.agenteAduanal ?? "", patente: datos.patente ?? "", honorariosBase: String(datos.honorariosBase), ivaHonorarios: String(datos.ivaHonorarios) };
  const [form, setForm] = useState(inicial);
  const campo = (k: keyof typeof form, etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="clp-label" htmlFor={`ag-${k}`}>{etiqueta}</label>
      <input id={`ag-${k}`} className="clp-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} disabled={!editable} {...extra} />
    </div>
  );
  return (
    <Tarjeta
      titulo={soloCuenta ? "Cuenta de gastos" : "Datos de la agencia"}
      texto={soloCuenta ? "Honorarios que se sugieren al armar la cuenta y el IVA que se aplica sobre ellos. Los costos de proveedores y las contribuciones se suman solos." : "Aparecen en la operación, el pedimento y la cuenta de gastos."}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {soloCuenta ? (
          <>
            {campo("honorariosBase", "Honorarios base (MXN)", { inputMode: "decimal" })}
            {campo("ivaHonorarios", "IVA sobre honorarios (0.16 = 16%)", { inputMode: "decimal" })}
          </>
        ) : (
          <>
            <div className="md:col-span-2">{campo("razonSocial", "Razón social")}</div>
            {campo("rfc", "RFC de la agencia", { className: "clp-input clp-mono uppercase", maxLength: 13 })}
            {campo("agenteAduanal", "Agente aduanal")}
            {campo("patente", "Patente", { className: "clp-input clp-mono", maxLength: 4, inputMode: "numeric" })}
          </>
        )}
      </div>
      {editable ? (
        <div className="mt-4 flex justify-end">
          <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente || JSON.stringify(form) === JSON.stringify(inicial)} onClick={() => ejecutar(() => guardarAgenciaAction(form))}>
            {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
          </button>
        </div>
      ) : null}
    </Tarjeta>
  );
}

function Aduanas({ aduanas, editable }: { aduanas: DatosConfiguracion["aduanas"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [nueva, setNueva] = useState({ clave: "", nombre: "" });
  return (
    <Tarjeta titulo="Aduanas donde opera" texto="Solo las activas aparecen al crear una operación y al registrar la cobertura de un proveedor.">
      <table className="clp-dt-tabla">
        <thead><tr><th>Clave</th><th>Aduana</th><th className="text-right">Activa</th></tr></thead>
        <tbody>
          {aduanas.map((a) => (
            <tr key={a.id}><td className="clp-mono">{a.clave}</td><td>{a.nombre}</td><td className="text-right"><Interruptor etiqueta={`Activar ${a.nombre}`} activo={a.activa} disabled={!editable || pendiente} onChange={(v) => ejecutar(() => activarAduanaAction(a.id, v))} /></td></tr>
          ))}
        </tbody>
      </table>
      {editable ? (
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarAduanaAction(nueva), (ok) => ok && setNueva({ clave: "", nombre: "" })); }}>
          <div><label className="clp-label" htmlFor="ad-clave">Clave</label><input id="ad-clave" className="clp-input clp-mono w-24" maxLength={3} inputMode="numeric" value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="flex-1"><label className="clp-label" htmlFor="ad-nombre">Nombre</label><input id="ad-nombre" className="clp-input" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} /></div>
          <button type="submit" className="clp-btn clp-btn-secondary" disabled={pendiente || !nueva.clave || !nueva.nombre.trim()}><Plus className="h-4 w-4" /> Agregar aduana</button>
        </form>
      ) : null}
    </Tarjeta>
  );
}

function FilaPaso({ p, editable }: { p: DatosConfiguracion["pasos"][number]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [nombre, setNombre] = useState(p.nombre);
  const [sla, setSla] = useState(p.slaHoras?.toString() ?? "");
  const cambio = nombre !== p.nombre || sla !== (p.slaHoras?.toString() ?? "");
  const guardar = (activo = p.activo) => ejecutar(() => guardarPasoAction(p.clave, { nombre, descripcion: p.descripcion ?? "", slaHoras: sla ? Number(sla) : null, activo }));
  return (
    <tr className={p.activo ? "" : "opacity-60"}>
      <td className="whitespace-nowrap text-xs text-slate-600">{p.faseImpo ? `${p.faseImpo} · ${FASES.IMPO[p.faseImpo - 1]}` : "—"}</td>
      <td className="whitespace-nowrap text-xs text-slate-600">{p.faseExpo ? `${p.faseExpo} · ${FASES.EXPO[p.faseExpo - 1]}` : "—"}</td>
      <td><input className="clp-input !h-8 min-w-[10rem]" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!editable} aria-label={`Nombre de ${p.nombre}`} /></td>
      <td><input className="clp-input !h-8 w-20 tabular-nums" inputMode="numeric" value={sla} onChange={(e) => setSla(e.target.value.replace(/\D/g, ""))} placeholder="—" disabled={!editable} aria-label={`SLA de ${p.nombre} en horas`} /></td>
      <td className="text-xs text-slate-600">{p.medios.length ? p.medios.map((m) => ETIQUETA_MEDIO[m]).join(", ") : "Todos"}{p.esServicio ? " · proveedor" : ""}</td>
      <td className="text-xs text-slate-600">{p.requisitos || "—"}</td>
      <td className="whitespace-nowrap text-right">
        {editable && cambio ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm mr-2" disabled={pendiente} onClick={() => guardar()}>Guardar</button> : null}
        <Interruptor etiqueta={`Activar ${p.nombre}`} activo={p.activo} disabled={!editable || pendiente || PASOS_ESENCIALES.includes(p.clave)} onChange={(v) => guardar(v)} />
      </td>
    </tr>
  );
}

function FilaDocumento({ d, editable }: { d: DatosConfiguracion["documentos"][number]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [form, setForm] = useState({ nombre: d.nombre, descripcion: d.descripcion ?? "", requisitoImpo: d.requisitoImpo, requisitoExpo: d.requisitoExpo });
  const cambio = JSON.stringify(form) !== JSON.stringify({ nombre: d.nombre, descripcion: d.descripcion ?? "", requisitoImpo: d.requisitoImpo, requisitoExpo: d.requisitoExpo });
  const req = (k: "requisitoImpo" | "requisitoExpo") => (
    <select className="clp-input !h-8" value={form[k]} disabled={!editable} onChange={(e) => setForm({ ...form, [k]: e.target.value as RequisitoDocumento })} aria-label={`${k === "requisitoImpo" ? "Importación" : "Exportación"}: ${d.nombre}`}>
      {(Object.keys(REQUISITO) as RequisitoDocumento[]).map((r) => <option key={r} value={r}>{REQUISITO[r]}</option>)}
    </select>
  );
  return (
    <tr>
      <td className="clp-mono font-semibold">{d.tipo}</td>
      <td><input className="clp-input !h-8 w-28" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} disabled={!editable} aria-label={`Nombre corto de ${d.tipo}`} /></td>
      <td><input className="clp-input !h-8 min-w-[14rem]" value={form.descripcion} placeholder={d.tipo === "CM" ? "Escribe qué es este documento" : ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} disabled={!editable} aria-label={`Descripción de ${d.tipo}`} /></td>
      <td>{req("requisitoImpo")}</td>
      <td>{req("requisitoExpo")}</td>
      <td className="text-right">{editable && cambio ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente} onClick={() => ejecutar(() => guardarDocumentoAction(d.tipo, form))}>Guardar</button> : null}</td>
    </tr>
  );
}

function Claves({ claves, editable }: { claves: DatosConfiguracion["claves"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [nueva, setNueva] = useState({ clave: "", descripcion: "", aplicaImpo: true, aplicaExpo: false });
  return (
    <Tarjeta titulo="Claves de pedimento" texto="La operación solo deja elegir las claves activas que aplican a su tipo.">
      <table className="clp-dt-tabla">
        <thead><tr><th>Clave</th><th>Descripción</th><th>Aplica a</th><th className="text-right">Activa</th></tr></thead>
        <tbody>
          {claves.map((c) => (
            <tr key={c.clave}><td className="clp-mono font-semibold">{c.clave}</td><td>{c.descripcion}</td><td className="text-sm">{[c.aplicaImpo && "IMPO", c.aplicaExpo && "EXPO"].filter(Boolean).join(" / ")}</td>
              <td className="text-right"><Interruptor etiqueta={`Activar ${c.clave}`} activo={c.activa} disabled={!editable || pendiente} onChange={(v) => ejecutar(() => activarClaveAction(c.clave, v))} /></td></tr>
          ))}
        </tbody>
      </table>
      {editable ? (
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarClaveAction(nueva), (ok) => ok && setNueva({ clave: "", descripcion: "", aplicaImpo: true, aplicaExpo: false })); }}>
          <div><label className="clp-label" htmlFor="cv-clave">Clave</label><input id="cv-clave" className="clp-input clp-mono w-20 uppercase" maxLength={2} value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value })} /></div>
          <div className="min-w-[12rem] flex-1"><label className="clp-label" htmlFor="cv-desc">Descripción</label><input id="cv-desc" className="clp-input" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} /></div>
          <label className="flex items-center gap-1.5 pb-2.5 text-sm"><input type="checkbox" className="accent-aduanaBlue" checked={nueva.aplicaImpo} onChange={(e) => setNueva({ ...nueva, aplicaImpo: e.target.checked })} />IMPO</label>
          <label className="flex items-center gap-1.5 pb-2.5 text-sm"><input type="checkbox" className="accent-aduanaBlue" checked={nueva.aplicaExpo} onChange={(e) => setNueva({ ...nueva, aplicaExpo: e.target.checked })} />EXPO</label>
          <button type="submit" className="clp-btn clp-btn-secondary" disabled={pendiente || nueva.clave.length !== 2 || !nueva.descripcion.trim()}><Plus className="h-4 w-4" /> Agregar</button>
        </form>
      ) : null}
    </Tarjeta>
  );
}

export function ConfiguracionVista({ datos }: { datos: DatosConfiguracion }) {
  const { puede } = useSession();
  const editable = puede("configuracion.editar");
  const alertas = useAccion();
  const [seccion, setSeccion] = useState<Seccion>("agencia");

  return (
    <>
      <div className="clp-page-head">
        <h1 className="clp-page-title">Configuración</h1>
        {editable ? null : <p className="clp-page-sub mt-0.5 text-sm">Solo un administrador puede cambiar la configuración.</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <nav className="clp-card flex flex-col gap-0.5 p-2 lg:sticky lg:top-0" aria-label="Secciones de configuración">
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" aria-current={seccion === s.id} onClick={() => setSeccion(s.id)}
              className={`rounded-lg px-3 py-2 text-left ${seccion === s.id ? "bg-aduanaBlue text-white" : "hover:bg-tinte"}`}>
              <span className="block text-sm font-semibold">{s.titulo}</span>
              <span className={`block text-xs ${seccion === s.id ? "text-white/75" : "text-slate-500"}`}>{s.detalle}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {seccion === "agencia" ? <Agencia datos={datos.agencia} editable={editable} /> : null}
          {seccion === "cuenta" ? <Agencia datos={datos.agencia} editable={editable} soloCuenta /> : null}
          {seccion === "aduanas" ? <Aduanas aduanas={datos.aduanas} editable={editable} /> : null}
          {seccion === "proceso" ? (
            <Tarjeta titulo="Proceso y etapas" texto="Cada operación nueva copia este proceso. El orden de las fases y los candados son reglas del despacho; aquí se ajustan nombres, tiempos (SLA) y qué pasos se usan.">
              <div className="clp-dt-scroll !max-h-none">
                <table className="clp-dt-tabla">
                  <thead><tr><th>Fase IMPO</th><th>Fase EXPO</th><th>Paso</th><th>SLA (h)</th><th>Aplica a</th><th>Bloqueado hasta</th><th className="text-right">Activo</th></tr></thead>
                  <tbody>{datos.pasos.map((p) => <FilaPaso key={p.clave} p={p} editable={editable} />)}</tbody>
                </table>
              </div>
              <p className="clp-ayuda mt-2">Los pasos esenciales (clasificación, pedimento, pago, modulación y cuenta de gastos) no se pueden desactivar.</p>
            </Tarjeta>
          ) : null}
          {seccion === "documentos" ? (
            <Tarjeta titulo="Documentos del expediente" texto="Qué se pide en cada operación y si es obligatorio. Los obligatorios deben estar aprobados para hacer el pedimento.">
              <div className="clp-dt-scroll !max-h-none">
                <table className="clp-dt-tabla">
                  <thead><tr><th>Tipo</th><th>Sigla</th><th>Nombre completo</th><th>Importación</th><th>Exportación</th><th /></tr></thead>
                  <tbody>{datos.documentos.map((d) => <FilaDocumento key={d.tipo} d={d} editable={editable} />)}</tbody>
                </table>
              </div>
            </Tarjeta>
          ) : null}
          {seccion === "claves" ? <Claves claves={datos.claves} editable={editable} /> : null}
          {seccion === "alertas" ? (
            <Tarjeta titulo="Alertas" texto="Las alertas activas aparecen en “Pendientes de hoy” del Home.">
              <ul className="divide-y divide-linea">
                {datos.alertas.map((a) => (
                  <li key={a.clave} className="flex items-center justify-between gap-4 py-3">
                    <div><div className="text-sm font-semibold">{a.nombre}</div><div className="text-xs text-slate-500">{a.descripcion}</div></div>
                    <Interruptor etiqueta={`Activar ${a.nombre}`} activo={a.activa} disabled={!editable || alertas.pendiente} onChange={(v) => alertas.ejecutar(() => activarAlertaAction(a.clave, v))} />
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}
          {seccion === "permisos" ? (
            <Tarjeta titulo="Roles y permisos" texto="Lo que puede hacer cada rol. El servidor revisa estos permisos en cada acción; el rol de cada persona se cambia en Usuarios.">
              <table className="clp-dt-tabla">
                <thead><tr><th>Acción</th><th className="text-center">Administrador</th><th className="text-center">Editor</th><th className="text-center">Consulta</th></tr></thead>
                <tbody>
                  {(Object.keys(PERMISOS) as Permiso[]).map((k) => (
                    <tr key={k}>
                      <td>{PERMISOS[k].nombre}</td>
                      {(["ADMIN", "EDITOR", "VIEWER"] as const).map((r) => (
                        <td key={r} className="text-center">{(PERMISOS[k].roles as readonly string[]).includes(r) ? <Check className="mx-auto h-4 w-4 text-green-700" aria-label="Sí" /> : <X className="mx-auto h-4 w-4 text-slate-300" aria-label="No" />}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          ) : null}
        </div>
      </div>
    </>
  );
}
