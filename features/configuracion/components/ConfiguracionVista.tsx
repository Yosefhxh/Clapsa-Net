"use client";

import { useState, type ReactNode } from "react";
import { Check, Eye, Pencil, Plus, Shield } from "lucide-react";
import type { HitoOperativo, MedioTransporte, RequisitoDocumento, TipoDocumento, TipoUsuario } from "@prisma/client";
import { useSession } from "@/features/session";
import { LISTA_PERMISOS, PERMISOS, PERMISOS_BASE, type Permiso } from "@/shared/auth/permisos";
import { useAccion } from "@/shared/hooks/useAccion";
import { FASES } from "@/features/operaciones/domain/proceso";
import { ETIQUETA_MEDIO } from "@/features/operaciones/types/vistas";
import { PASOS_ESENCIALES } from "../reglas";
import {
  activarAduanaAction, activarAlertaAction, activarClaveAction, agregarAduanaAction, agregarClaveAction,
  guardarAgenciaAction, guardarDocumentoAction, guardarPasoAction, guardarPermisoRolAction,
} from "../actions";

export interface DatosConfiguracion {
  agencia: { razonSocial: string; rfc: string | null; agenteAduanal: string | null; patente: string | null; honorariosBase: number; ivaHonorarios: number };
  aduanas: { id: number; clave: string; nombre: string; activa: boolean }[];
  pasos: { clave: HitoOperativo; nombre: string; descripcion: string | null; faseImpo: number; faseExpo: number; slaHoras: number | null; esServicio: boolean; medios: MedioTransporte[]; activo: boolean; requisitosImpo: string; requisitosExpo: string }[];
  documentos: { tipo: TipoDocumento; nombre: string; descripcion: string | null; requisitoImpo: RequisitoDocumento; requisitoExpo: RequisitoDocumento }[];
  claves: { clave: string; descripcion: string; aplicaImpo: boolean; aplicaExpo: boolean; activa: boolean }[];
  alertas: { clave: string; nombre: string; descripcion: string; activa: boolean }[];
  /** Permisos efectivos de cada rol y cuántos usuarios tiene. */
  roles: Record<TipoUsuario, { permisos: Permiso[]; usuarios: number }>;
  prefijoFolio: string;
}

type Seccion = "agencia" | "proceso" | "documentos" | "catalogos" | "alertas" | "cuenta" | "roles";
const SECCIONES: { id: Seccion; titulo: string; detalle: string }[] = [
  { id: "agencia", titulo: "Agencia aduanal", detalle: "Patente, agente y aduanas" },
  { id: "proceso", titulo: "Proceso y etapas", detalle: "Fases, pasos y SLA" },
  { id: "documentos", titulo: "Documentos", detalle: "Expediente por operación" },
  { id: "catalogos", titulo: "Catálogos aduaneros", detalle: "Claves y medios de transporte" },
  { id: "alertas", titulo: "Alertas y avisos", detalle: "Qué se avisa en el Home" },
  { id: "cuenta", titulo: "Cuenta de gastos", detalle: "Honorarios e IVA" },
  { id: "roles", titulo: "Roles y permisos", detalle: "Quién puede hacer qué" },
];

const REQUISITO: Record<RequisitoDocumento, string> = { OBLIGATORIO: "Obligatorio", SI_APLICA: "Si aplica", NO_APLICA: "No se pide" };
const ROLES: { id: TipoUsuario; nombre: string; descripcion: string; icono: ReactNode }[] = [
  { id: "ADMIN", nombre: "Administrador", descripcion: "Control total del sistema y la configuración.", icono: <Shield aria-hidden /> },
  { id: "EDITOR", nombre: "Editor", descripcion: "Opera el despacho día a día.", icono: <Pencil aria-hidden /> },
  { id: "VIEWER", nombre: "Consulta", descripcion: "Solo puede ver la información.", icono: <Eye aria-hidden /> },
];

function Interruptor({ activo, onChange, disabled, etiqueta }: { activo: boolean; onChange: (v: boolean) => void; disabled?: boolean; etiqueta: string }) {
  return (
    <button type="button" className="clp-sw-btn" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} onClick={() => onChange(!activo)}>
      <span className={`clp-sw ${activo ? "on" : ""}`} />
    </button>
  );
}

function Tarjeta({ titulo, texto, children, accion, className = "" }: { titulo: ReactNode; texto?: string; children: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <section className={`clp-card clp-cfg-card ${className}`}>
      <h3>{titulo}{accion}</h3>
      {texto ? <p>{texto}</p> : null}
      {children}
    </section>
  );
}

const Campo = ({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) => (
  <div className="clp-cfg-campo"><small>{etiqueta}</small><span className={mono ? "clp-mono" : ""}>{children}</span></div>
);
const porCapturar = (v: string | null) => v || <span className="clp-cfg-tenue">Por capturar</span>;

function Agencia({ datos, prefijoFolio, editable }: { datos: DatosConfiguracion["agencia"]; prefijoFolio: string; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const inicial = { ...datos, rfc: datos.rfc ?? "", agenteAduanal: datos.agenteAduanal ?? "", patente: datos.patente ?? "", honorariosBase: String(datos.honorariosBase), ivaHonorarios: String(datos.ivaHonorarios) };
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(inicial);
  const campo = (k: "razonSocial" | "rfc" | "agenteAduanal" | "patente", etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="clp-rf">
      <label htmlFor={`ag-${k}`}>{etiqueta}</label>
      <input id={`ag-${k}`} className="clp-rc-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...extra} />
    </div>
  );
  return (
    <Tarjeta
      titulo="Datos de la agencia"
      texto="Aparecen en la operación, el pedimento y la cuenta de gastos."
      accion={editable && !editando ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => { setForm(inicial); setEditando(true); }}><Pencil className="h-4 w-4" />Editar</button> : null}
    >
      {editando ? (
        <>
          <div className="clp-cfg-form">
            {campo("razonSocial", "Razón social")}
            {campo("rfc", "RFC de la agencia", { className: "clp-rc-input clp-mono uppercase", maxLength: 13 })}
            {campo("agenteAduanal", "Agente aduanal")}
            {campo("patente", "Patente", { className: "clp-rc-input clp-mono", maxLength: 4, inputMode: "numeric" })}
          </div>
          <div className="clp-cfg-acc">
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setEditando(false)} disabled={pendiente}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente || JSON.stringify(form) === JSON.stringify(inicial)} onClick={() => ejecutar(() => guardarAgenciaAction(form), (ok) => ok && setEditando(false))}>
              {pendiente ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}Guardar
            </button>
          </div>
        </>
      ) : (
        <div className="clp-cfg-campos">
          <Campo etiqueta="Razón social">{datos.razonSocial}</Campo>
          <Campo etiqueta="RFC de la agencia" mono={!!datos.rfc}>{porCapturar(datos.rfc)}</Campo>
          <Campo etiqueta="Agente aduanal">{porCapturar(datos.agenteAduanal)}</Campo>
          <Campo etiqueta="Patente" mono={!!datos.patente}>{porCapturar(datos.patente)}</Campo>
          <Campo etiqueta="Formato de folios" mono>{prefijoFolio}</Campo>
        </div>
      )}
    </Tarjeta>
  );
}

function Aduanas({ aduanas, editable }: { aduanas: DatosConfiguracion["aduanas"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [agregando, setAgregando] = useState(false);
  const [nueva, setNueva] = useState({ clave: "", nombre: "" });
  return (
    <Tarjeta
      titulo="Aduanas donde opera"
      texto="Solo las activas aparecen al crear una operación y al registrar la cobertura de un proveedor."
      accion={editable && !agregando ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => setAgregando(true)}><Plus className="h-4 w-4" />Agregar aduana</button> : null}
    >
      {agregando ? (
        <form className="clp-cfg-alta" onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarAduanaAction(nueva), (ok) => { if (ok) { setNueva({ clave: "", nombre: "" }); setAgregando(false); } }); }}>
          <div className="clp-rf"><label htmlFor="ad-clave">Clave</label><input id="ad-clave" className="clp-rc-input clp-mono w-24" maxLength={3} inputMode="numeric" value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value.replace(/\D/g, "") })} autoFocus /></div>
          <div className="clp-rf flex-1"><label htmlFor="ad-nombre">Nombre</label><input id="ad-nombre" className="clp-rc-input" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} /></div>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setAgregando(false)}>Cancelar</button>
          <button type="submit" className="clp-btn clp-btn-primary" disabled={pendiente || !nueva.clave || !nueva.nombre.trim()}><Plus className="h-4 w-4" />Agregar</button>
        </form>
      ) : null}
      <div className="clp-cfg-tabla">
        <table>
          <thead><tr><th>Clave</th><th>Aduana</th><th className="der">Activa</th></tr></thead>
          <tbody>
            {aduanas.map((a) => (
              <tr key={a.id}><td className="clp-mono">{a.clave}</td><td>{a.nombre}</td><td className="der"><Interruptor etiqueta={`Activar ${a.nombre}`} activo={a.activa} disabled={!editable || pendiente} onChange={(v) => ejecutar(() => activarAduanaAction(a.id, v))} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function FilaPaso({ p, tipo, editable }: { p: DatosConfiguracion["pasos"][number]; tipo: "IMPO" | "EXPO"; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [nombre, setNombre] = useState(p.nombre);
  const [sla, setSla] = useState(p.slaHoras?.toString() ?? "");
  const cambio = nombre !== p.nombre || sla !== (p.slaHoras?.toString() ?? "");
  const guardar = (activo = p.activo) => ejecutar(() => guardarPasoAction(p.clave, { nombre, descripcion: p.descripcion ?? "", slaHoras: sla ? Number(sla) : null, activo }));
  const fase = tipo === "IMPO" ? p.faseImpo : p.faseExpo;
  const requisitos = tipo === "IMPO" ? p.requisitosImpo : p.requisitosExpo;
  const esencial = PASOS_ESENCIALES.includes(p.clave);
  return (
    <tr className={p.activo ? "" : "apagado"}>
      <td className="nowrap">{fase} · {FASES[tipo][fase - 1]}</td>
      <td>{editable ? <input className="clp-cfg-in clp-cfg-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label={`Nombre de ${p.nombre}`} /> : p.nombre}</td>
      <td>{editable ? <span className="clp-cfg-sla"><input className="clp-cfg-in tabular-nums" inputMode="numeric" value={sla} onChange={(e) => setSla(e.target.value.replace(/\D/g, ""))} placeholder="—" aria-label={`SLA de ${p.nombre} en horas`} />h</span> : p.slaHoras ? `${p.slaHoras} h` : "—"}</td>
      <td>{p.medios.length ? p.medios.map((m) => ETIQUETA_MEDIO[m]).join(", ") : "Todos"}{p.esServicio ? <span className="clp-cfg-tenue"> · proveedor</span> : null}</td>
      <td>{requisitos || "—"}</td>
      <td className="der nowrap">
        {editable && cambio ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm mr-2" disabled={pendiente} onClick={() => guardar()}>Guardar</button> : null}
        <Interruptor etiqueta={`Activar ${p.nombre}`} activo={p.activo} disabled={!editable || pendiente || esencial} onChange={(v) => guardar(v)} />
      </td>
    </tr>
  );
}

function Proceso({ pasos, editable }: { pasos: DatosConfiguracion["pasos"]; editable: boolean }) {
  const [tipo, setTipo] = useState<"IMPO" | "EXPO">("IMPO");
  const fase = (p: DatosConfiguracion["pasos"][number]) => (tipo === "IMPO" ? p.faseImpo : p.faseExpo);
  const lista = pasos.filter((p) => fase(p) > 0).sort((a, b) => fase(a) - fase(b));
  return (
    <Tarjeta
      titulo="Proceso por tipo de operación"
      texto="Cada operación nueva copia este proceso. El orden de las fases y los candados son reglas del despacho; aquí se ajustan nombres, tiempos (SLA) y qué pasos se usan."
      accion={
        <span className="clp-rc-seg clp-cfg-seg" role="group" aria-label="Tipo de operación">
          <button type="button" aria-pressed={tipo === "IMPO"} onClick={() => setTipo("IMPO")}>Importación</button>
          <button type="button" aria-pressed={tipo === "EXPO"} onClick={() => setTipo("EXPO")}>Exportación</button>
        </span>
      }
    >
      <div className="clp-cfg-tabla">
        <table>
          <thead><tr><th>Fase</th><th>Paso</th><th>SLA</th><th>Aplica a</th><th>Bloqueado hasta</th><th className="der">Activo</th></tr></thead>
          <tbody>{lista.map((p) => <FilaPaso key={`${tipo}-${p.clave}`} p={p} tipo={tipo} editable={editable} />)}</tbody>
        </table>
      </div>
      <p className="clp-cfg-nota">Los pasos esenciales (clasificación, pedimento, pago, modulación y cuenta de gastos) no se pueden desactivar.</p>
    </Tarjeta>
  );
}

function FilaDocumento({ d, editable }: { d: DatosConfiguracion["documentos"][number]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const base = { nombre: d.nombre, descripcion: d.descripcion ?? "", requisitoImpo: d.requisitoImpo, requisitoExpo: d.requisitoExpo };
  const [form, setForm] = useState(base);
  const cambio = JSON.stringify(form) !== JSON.stringify(base);
  const req = (k: "requisitoImpo" | "requisitoExpo") => editable ? (
    <select className="clp-cfg-in" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value as RequisitoDocumento })} aria-label={`${k === "requisitoImpo" ? "Importación" : "Exportación"}: ${d.nombre}`}>
      {(Object.keys(REQUISITO) as RequisitoDocumento[]).map((r) => <option key={r} value={r}>{REQUISITO[r]}</option>)}
    </select>
  ) : <span className={`clp-cfg-req ${d[k].toLowerCase()}`}>{REQUISITO[d[k]]}</span>;
  return (
    <tr>
      <td>{editable ? <input className="clp-cfg-in w-28 font-semibold" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} aria-label={`Sigla de ${d.tipo}`} /> : <b>{d.nombre}</b>}</td>
      <td>{editable ? <input className="clp-cfg-in min-w-[14rem]" value={form.descripcion} placeholder={d.tipo === "CM" ? "Escribe qué es este documento" : ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} aria-label={`Nombre completo de ${d.tipo}`} /> : d.descripcion || <span className="clp-cfg-tenue">Por definir</span>}</td>
      <td>{req("requisitoImpo")}</td>
      <td>{req("requisitoExpo")}</td>
      <td className="der">{editable && cambio ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente} onClick={() => ejecutar(() => guardarDocumentoAction(d.tipo, form))}>Guardar</button> : null}</td>
    </tr>
  );
}

function Claves({ claves, editable }: { claves: DatosConfiguracion["claves"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [agregando, setAgregando] = useState(false);
  const vacia = { clave: "", descripcion: "", aplicaImpo: true, aplicaExpo: false };
  const [nueva, setNueva] = useState(vacia);
  return (
    <Tarjeta
      titulo="Claves de pedimento"
      texto="La operación solo deja elegir las claves activas que aplican a su tipo."
      accion={editable && !agregando ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => setAgregando(true)}><Plus className="h-4 w-4" />Agregar clave</button> : null}
    >
      {agregando ? (
        <form className="clp-cfg-alta" onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarClaveAction(nueva), (ok) => { if (ok) { setNueva(vacia); setAgregando(false); } }); }}>
          <div className="clp-rf"><label htmlFor="cv-clave">Clave</label><input id="cv-clave" className="clp-rc-input clp-mono w-20 uppercase" maxLength={2} value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value })} autoFocus /></div>
          <div className="clp-rf min-w-[12rem] flex-1"><label htmlFor="cv-desc">Descripción</label><input id="cv-desc" className="clp-rc-input" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} /></div>
          <label className="clp-cfg-check"><input type="checkbox" checked={nueva.aplicaImpo} onChange={(e) => setNueva({ ...nueva, aplicaImpo: e.target.checked })} />IMPO</label>
          <label className="clp-cfg-check"><input type="checkbox" checked={nueva.aplicaExpo} onChange={(e) => setNueva({ ...nueva, aplicaExpo: e.target.checked })} />EXPO</label>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setAgregando(false)}>Cancelar</button>
          <button type="submit" className="clp-btn clp-btn-primary" disabled={pendiente || nueva.clave.length !== 2 || !nueva.descripcion.trim()}><Plus className="h-4 w-4" />Agregar</button>
        </form>
      ) : null}
      <div className="clp-cfg-tabla">
        <table>
          <thead><tr><th>Clave</th><th>Descripción</th><th>Tipo</th><th className="der">Activa</th></tr></thead>
          <tbody>
            {claves.map((c) => (
              <tr key={c.clave}><td className="clp-mono font-semibold">{c.clave}</td><td>{c.descripcion}</td><td>{[c.aplicaImpo && "IMPO", c.aplicaExpo && "EXPO"].filter(Boolean).join(" / ")}</td>
                <td className="der"><Interruptor etiqueta={`Activar ${c.clave}`} activo={c.activa} disabled={!editable || pendiente} onChange={(v) => ejecutar(() => activarClaveAction(c.clave, v))} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function Roles({ roles, editable }: { roles: DatosConfiguracion["roles"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const [sel, setSel] = useState<TipoUsuario>("EDITOR");
  const total = LISTA_PERMISOS.length;
  const grupos = [...new Set(LISTA_PERMISOS.map((p) => PERMISOS[p].grupo))];
  const rol = ROLES.find((r) => r.id === sel)!;
  return (
    <>
      <div className="clp-rol-picker" role="radiogroup" aria-label="Rol">
        {ROLES.map((r) => {
          const n = roles[r.id].permisos.length;
          return (
            <button key={r.id} type="button" className="clp-rol-op" role="radio" aria-checked={r.id === sel} onClick={() => setSel(r.id)}>
              <span className="clp-rol-ico">{r.icono}</span><b>{r.nombre}</b><small>{r.descripcion}</small>
              <span className="clp-rol-meta"><span>{roles[r.id].usuarios} usuario{roles[r.id].usuarios === 1 ? "" : "s"}</span><span className="clp-rol-anillo" style={{ "--p": (n / total) * 100 } as React.CSSProperties}>{n}/{total}</span></span>
            </button>
          );
        })}
      </div>
      <section className="clp-card clp-cfg-card clp-perm-card">
        <h3>Permisos de {rol.nombre}{sel === "ADMIN" ? <span className="clp-cfg-tenue clp-perm-nota">El administrador siempre conserva todos los permisos</span> : !editable ? <span className="clp-cfg-tenue clp-perm-nota">Solo un administrador puede cambiarlos</span> : null}</h3>
        {grupos.map((g) => (
          <div key={g} className="clp-perm-g">
            <div className="clp-perm-gt">{g}</div>
            {LISTA_PERMISOS.filter((p) => PERMISOS[p].grupo === g).map((p) => {
              const base = PERMISOS_BASE.includes(p);
              const activo = roles[sel].permisos.includes(p);
              return (
                <div key={p} className="clp-perm-row">
                  <div><b>{PERMISOS[p].nombre}</b><small>{PERMISOS[p].descripcion}{base ? " Siempre activo." : ""}</small></div>
                  <Interruptor etiqueta={`${PERMISOS[p].nombre} para ${rol.nombre}`} activo={activo} disabled={!editable || sel === "ADMIN" || base || pendiente} onChange={(v) => ejecutar(() => guardarPermisoRolAction(sel, p, v))} />
                </div>
              );
            })}
          </div>
        ))}
        <p className="clp-cfg-nota">Los cambios aplican de inmediato: el servidor revisa estos permisos en cada acción. El rol de cada persona se cambia en Usuarios.</p>
      </section>
    </>
  );
}

export function ConfiguracionVista({ datos }: { datos: DatosConfiguracion }) {
  const { puede, user } = useSession();
  const editable = puede("configuracion.editar");
  const alertas = useAccion();
  const [seccion, setSeccion] = useState<Seccion>("agencia");

  return (
    <div className="clp-cfg-pagina">
      <div className="clp-page-head">
        <h1 className="clp-page-title">Configuración</h1>
        {editable ? null : <p className="clp-page-sub mt-0.5 text-sm">Solo un administrador puede cambiar la configuración.</p>}
      </div>
      <div className="clp-cfg">
        <nav className="clp-card clp-cfg-nav" aria-label="Secciones de configuración">
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" aria-current={seccion === s.id} onClick={() => setSeccion(s.id)}>
              {s.titulo}<small>{s.detalle}</small>
            </button>
          ))}
        </nav>

        <div className="clp-cfg-body" key={seccion}>
          {seccion === "agencia" ? <><Agencia datos={datos.agencia} prefijoFolio={datos.prefijoFolio} editable={editable} /><Aduanas aduanas={datos.aduanas} editable={editable} /></> : null}
          {seccion === "proceso" ? <Proceso pasos={datos.pasos} editable={editable} /> : null}
          {seccion === "documentos" ? (
            <Tarjeta titulo="Documentos del expediente" texto="Qué se pide en cada operación y si es obligatorio. Los obligatorios deben estar aprobados para hacer el pedimento. Aquí se pone el nombre completo de cada sigla.">
              <div className="clp-cfg-tabla">
                <table>
                  <thead><tr><th>Sigla</th><th>Nombre</th><th>IMPO</th><th>EXPO</th><th /></tr></thead>
                  <tbody>{datos.documentos.map((d) => <FilaDocumento key={d.tipo} d={d} editable={editable} />)}</tbody>
                </table>
              </div>
            </Tarjeta>
          ) : null}
          {seccion === "catalogos" ? (
            <>
              <Claves claves={datos.claves} editable={editable} />
              <Tarjeta titulo="Otros catálogos" texto="Listas que alimentan los campos de la operación.">
                <div className="clp-cfg-campos"><Campo etiqueta="Medios de transporte">{Object.values(ETIQUETA_MEDIO).join(" · ")}</Campo></div>
              </Tarjeta>
            </>
          ) : null}
          {seccion === "alertas" ? (
            <Tarjeta titulo="Alertas automáticas" texto="Las alertas activas aparecen en “Pendientes de hoy” del Home.">
              <div className="clp-cfg-tabla">
                <table>
                  <thead><tr><th>Alerta</th><th>Cuándo</th><th className="der">En Home</th></tr></thead>
                  <tbody>
                    {datos.alertas.map((a) => (
                      <tr key={a.clave}><td className="font-semibold">{a.nombre}</td><td>{a.descripcion}</td>
                        <td className="der"><Interruptor etiqueta={`Activar ${a.nombre}`} activo={a.activa} disabled={!editable || alertas.pendiente} onChange={(v) => alertas.ejecutar(() => activarAlertaAction(a.clave, v))} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          ) : null}
          {seccion === "cuenta" ? <CuentaGastos datos={datos.agencia} editable={editable} /> : null}
          {seccion === "roles" ? <Roles roles={datos.roles} editable={editable && user?.tipoUsuario === "ADMIN"} /> : null}
        </div>
      </div>
    </div>
  );
}

function CuentaGastos({ datos, editable }: { datos: DatosConfiguracion["agencia"]; editable: boolean }) {
  const { pendiente, ejecutar } = useAccion();
  const inicial = { ...datos, rfc: datos.rfc ?? "", agenteAduanal: datos.agenteAduanal ?? "", patente: datos.patente ?? "", honorariosBase: String(datos.honorariosBase), ivaHonorarios: String(datos.ivaHonorarios) };
  const [form, setForm] = useState(inicial);
  const cambio = JSON.stringify(form) !== JSON.stringify(inicial);
  return (
    <Tarjeta titulo="Honorarios e IVA" texto="Los honorarios se sugieren al armar la cuenta y el IVA se aplica sobre ellos. Los costos de proveedores asignados en cada paso y las contribuciones se suman solos.">
      <div className="clp-cfg-form">
        <div className="clp-rf"><label htmlFor="cg-hon">Honorarios base (MXN)</label><input id="cg-hon" className="clp-rc-input tabular-nums" inputMode="decimal" disabled={!editable} value={form.honorariosBase} onChange={(e) => setForm({ ...form, honorariosBase: e.target.value })} /></div>
        <div className="clp-rf"><label htmlFor="cg-iva">IVA sobre honorarios <span className="clp-rf-opc">0.16 = 16%</span></label><input id="cg-iva" className="clp-rc-input tabular-nums" inputMode="decimal" disabled={!editable} value={form.ivaHonorarios} onChange={(e) => setForm({ ...form, ivaHonorarios: e.target.value })} /></div>
      </div>
      {editable ? (
        <div className="clp-cfg-acc">
          <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente || !cambio} onClick={() => ejecutar(() => guardarAgenciaAction(form))}>
            {pendiente ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}Guardar
          </button>
        </div>
      ) : null}
      <div className="clp-cfg-conceptos">
        <div className="clp-perm-gt">Cómo se arma la cuenta</div>
        <ul>
          <li><b>Pagos hechos por cuenta del cliente</b><span>Costos de proveedores (por paso) y contribuciones del pedimento.</span></li>
          <li><b>Servicios de la agencia</b><span>Honorarios del agente aduanal más su IVA.</span></li>
        </ul>
      </div>
    </Tarjeta>
  );
}
