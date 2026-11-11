"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Briefcase, Check, Clock, FileText, Plus, Search, X } from "lucide-react";
import type { ClavePedimento, MedioTransporte, TipoDocumento, TipoOperacion } from "@prisma/client";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useToast } from "@/shared/components/ui/Toast";
import { PieRegistro, RegistroDividido, type EstadoBarra } from "@/shared/components/registro/RegistroDividido";
import { pesoArchivo } from "@/shared/components/registro/ConstanciaDrop";
import { crearOperacionAction, subirDocumentoInicialAction } from "../actions/operaciones-actions";
import { ETIQUETA_MEDIO, type OpcionCliente } from "../types/vistas";
import { encargoVigente } from "./SelectorClienteImportador";

export interface DocumentoCatalogo { tipo: TipoDocumento; nombre: string; impo: boolean; expo: boolean }

interface Props {
  opciones: OpcionCliente[];
  aduanas: { clave: string; nombre: string }[];
  claves: ClavePedimento[];
  documentos: DocumentoCatalogo[];
  patente: string | null;
  siguienteFolio: string;
  clienteInicial?: number | null;
  /** Regresa al tablero; si se abrió, con el id para resaltar o abrir su detalle. */
  onVolver: (guardado?: { id: string; verResumen: boolean }) => void;
}

const MAX_PDF = 5 * 1024 * 1024;
const MEDIOS = Object.keys(ETIQUETA_MEDIO) as MedioTransporte[];
const anio = () => String(new Date().getFullYear()).slice(-2);

/** Tipo probable por el nombre del archivo (se puede cambiar). */
function tipoPorNombre(nombre: string, disponibles: TipoDocumento[]): TipoDocumento {
  const n = nombre.toLowerCase();
  const sola = (t: string) => new RegExp(`(^|[^a-z])${t}([^a-z]|$)`);
  const pista: [RegExp, TipoDocumento][] = [[sola("bl"), "BL"], [/bill.?of.?lading|conocimiento|guia|awb/, "BL"], [/factura|invoice/, "FACTURA"], [/packing|lista.?de.?empaque/, "PL"], [sola("pl"), "PL"], [/certificado.?de.?origen|certificate.?of.?origin/, "CO"], [sola("co"), "CO"], [/permiso/, "PERMISOS"]];
  const hit = pista.find(([r, t]) => r.test(n) && disponibles.includes(t));
  return hit ? hit[1] : disponibles.includes("OTROS") ? "OTROS" : disponibles[0];
}

/** Valida padrón y encargo del importador que irá en el pedimento. */
function Validaciones({ c }: { c: OpcionCliente }) {
  const padron = c.padronImportadores === true, vigente = encargoVigente(c);
  return (
    <div className="clp-ro-val">
      <span className={padron ? "ok" : ""}>{padron ? "✓" : "!"} Padrón de importadores {padron ? "activo" : c.padronImportadores === false ? "inactivo" : "sin verificar"}</span>
      <span className={vigente ? "ok" : ""}>{vigente ? "✓" : "!"} Encargo conferido {vigente ? (c.fechaVigenciaEncargo ? `vigente al ${new Date(c.fechaVigenciaEncargo).toLocaleDateString("es-MX")}` : "vigente") : "no vigente"}</span>
    </div>
  );
}

/** Nueva operación (fase 1 · apertura del expediente) en vista dividida: cliente a la izquierda, embarque a la derecha. */
export function RegistroOperacion({ opciones, aduanas, claves, documentos, patente, siguienteFolio, clienteInicial, onVolver }: Props) {
  const avisar = useToast();
  const [guardando, iniciar] = useTransition();
  const archivos = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => {
    const c = opciones.find((o) => o.id === clienteInicial && o.activo);
    return {
      clienteId: c?.id ?? (null as number | null),
      importadorId: c?.tipo === "DIRECTO" ? c.id : (null as number | null),
      tipo: "IMPO" as TipoOperacion,
      medio: "MARITIMO" as MedioTransporte,
      aduana: "",
      clavePedimento: "A1",
      eta: "",
      folioManual: "",
    };
  });
  const [buscar, setBuscar] = useState("");
  const [docs, setDocs] = useState<{ id: number; archivo: File; tipo: TipoDocumento }[]>([]);
  const [verResumen, setVerResumen] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const activos = opciones.filter((o) => o.activo);
  const cliente = opciones.find((o) => o.id === form.clienteId) ?? null;
  const importador = opciones.find((o) => o.id === form.importadorId) ?? null;
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return activos.filter((c) => !q || [c.folio, c.razonSocial, c.rfc].some((x) => x.toLowerCase().includes(q)));
  }, [activos, buscar]);
  const directos = activos.filter((c) => c.tipo === "DIRECTO");
  const subclientes = cliente?.tipo === "FORWARDER" ? directos.filter((c) => c.clientePadreId === cliente.id) : [];
  const otrosDirectos = directos.filter((c) => !subclientes.includes(c));
  const clavesValidas = claves.filter((c) => (form.tipo === "IMPO" ? c.aplicaImpo : c.aplicaExpo));
  const tiposDoc = documentos.filter((d) => (form.tipo === "IMPO" ? d.impo : d.expo));
  const aduana = aduanas.find((a) => a.nombre === form.aduana);
  const faltaImportador = cliente?.tipo === "FORWARDER" && !form.importadorId;

  const elegirCliente = (c: OpcionCliente) => {
    const quitar = form.clienteId === c.id;
    setForm((f) => ({ ...f, clienteId: quitar ? null : c.id, importadorId: quitar ? null : c.tipo === "DIRECTO" ? c.id : null }));
    setError("");
  };
  const cambiarTipo = (t: TipoOperacion) => {
    const validas = claves.filter((c) => (t === "IMPO" ? c.aplicaImpo : c.aplicaExpo));
    setForm((f) => ({ ...f, tipo: t, clavePedimento: validas.some((c) => c.clave === f.clavePedimento) ? f.clavePedimento : validas.some((c) => c.clave === "A1") ? "A1" : "" }));
    const disponibles = documentos.filter((d) => (t === "IMPO" ? d.impo : d.expo)).map((d) => d.tipo);
    setDocs((ds) => ds.map((d) => (disponibles.includes(d.tipo) ? d : { ...d, tipo: tipoPorNombre(d.archivo.name, disponibles) })));
  };
  const agregarArchivos = (lista: File[]) => {
    const malos = lista.filter((f) => !(/\.pdf$/i.test(f.name) || f.type === "application/pdf") || f.size > MAX_PDF);
    if (malos.length) setError(`Solo PDF de máximo 5 MB: ${malos.map((f) => f.name).join(", ")}`);
    const disponibles = tiposDoc.map((d) => d.tipo);
    setDocs((ds) => [...ds, ...lista.filter((f) => !malos.includes(f)).map((archivo, i) => ({ id: Date.now() + i, archivo, tipo: tipoPorNombre(archivo.name, disponibles) }))]);
  };

  const estadoBarra: EstadoBarra = guardando
    ? { texto: "Abriendo expediente…", tono: "info", cargando: true }
    : !form.aduana ? { texto: "Falta la aduana", tono: "neutro" }
    : faltaImportador ? { texto: "Falta el importador", tono: "alerta" }
    : !cliente ? { texto: "Quedará en espera de cliente", tono: "alerta" }
    : { texto: "Listo para abrir", tono: "ok" };

  const guardar = () => {
    if (guardando) return;
    if (!form.aduana) { setError("Elige la aduana."); document.getElementById("ro-aduana")?.focus(); return; }
    if (faltaImportador) { setError("Elige al importador que va en el pedimento."); document.getElementById("ro-importador")?.focus(); return; }
    const repetido = docs.find((d, i) => docs.findIndex((x) => x.tipo === d.tipo) !== i);
    if (repetido) { setError(`Hay dos archivos como “${tiposDoc.find((t) => t.tipo === repetido.tipo)?.nombre ?? repetido.tipo}”: cada tipo lleva un solo archivo. Cambia el tipo o quita uno.`); return; }
    setError("");
    iniciar(async () => {
      const r = await crearOperacionAction({ ...form, eta: form.eta || null, clavePedimento: form.clavePedimento || null, folioManual: form.folioManual || null });
      if (!r.ok) return setError(r.error);
      const fallidos: string[] = [];
      for (const d of docs) {
        const fd = new FormData();
        fd.set("file", d.archivo);
        const s = await subirDocumentoInicialAction(r.data.id, d.tipo, fd);
        if (!s.ok) fallidos.push(d.archivo.name);
      }
      avisar(fallidos.length
        ? `Operación ${r.data.folio} abierta. No se pudieron subir: ${fallidos.join(", ")}; súbelos desde Documentos.`
        : `Operación ${r.data.folio} abierta${docs.length ? ` con ${docs.length} documento${docs.length === 1 ? "" : "s"}` : ""}.`);
      onVolver({ id: r.data.id, verResumen });
    });
  };

  const caja = (valor: string, etiqueta: string, ancho?: boolean) => <div className={`clp-ro-pc ${ancho ? "ancho" : ""}`}><b className="clp-mono">{valor}</b><small>{etiqueta}</small></div>;

  return (
    <RegistroDividido
      avatar={cliente ? <Avatar key={cliente.id} texto={cliente.razonSocial} className="clp-rcf-entra" /> : <span className="clp-av clp-rcf-vacio"><Briefcase aria-hidden /></span>}
      datos={[
        { etiqueta: "Folio", valor: siguienteFolio, mono: true },
        { etiqueta: "Pedimento", valor: aduana ? `${anio()} ${aduana.clave.slice(0, 2)} ${patente ?? "····"}` : "", vacio: "Elige la aduana", mono: true },
        { etiqueta: "Cliente", valor: cliente?.razonSocial ?? "", vacio: "En espera de cliente", ancho: true },
        { etiqueta: "Tipo", valor: `${form.tipo} · ${ETIQUETA_MEDIO[form.medio]}` },
      ]}
      estado={estadoBarra}
      guardando={guardando}
      etiquetaVolver="Volver a Operaciones"
      onVolver={() => onVolver()}
      alSoltarArchivo={(f) => agregarArchivos([f])}
      error={error}
      izquierda={() => (
        <div className="clp-ru-panel clp-ro-panel">
          <div className="clp-ru-h"><h3>Cliente e importador</h3><small>Si aún no se confirma, déjalo para después: la operación queda en espera de cliente.</small></div>
          <label className="clp-ro-buscar"><Search aria-hidden /><input type="search" placeholder="Busca por folio, razón social o RFC" aria-label="Buscar cliente" value={buscar} onChange={(e) => setBuscar(e.target.value)} /></label>
          <div className="clp-ro-lista" role="listbox" aria-label="Clientes">
            {lista.length ? lista.map((c) => (
              <button key={c.id} type="button" className="clp-ro-cli" role="option" aria-selected={form.clienteId === c.id} onClick={() => elegirCliente(c)}>
                <Avatar texto={c.razonSocial} />
                <span><b>{c.razonSocial}</b><small className="clp-mono">{c.folio}</small></span>
                <span className={`clp-tipo-cli clp-tipo-cli-${c.tipo.toLowerCase()}`}>{c.tipo === "DIRECTO" ? "Directo" : "Forwarder"}</span>
              </button>
            )) : <div className="clp-ro-vacio">{activos.length ? "Sin coincidencias." : "Aún no hay clientes activos."} Registra al cliente en Clientes.</div>}
          </div>
          <div className="clp-ro-imp">
            {!cliente ? (
              <div className="clp-ro-espera"><Clock aria-hidden /><span>Sin cliente: la operación quedará <b>En espera de cliente</b> y el pedimento se bloquea hasta asignarlo.</span></div>
            ) : cliente.tipo === "DIRECTO" ? (
              <>
                <div className="clp-ro-imp-h">Importador en el pedimento</div>
                <div className="clp-ro-imp-v">{cliente.razonSocial}<small>Es cliente directo: él mismo es el importador.</small></div>
                <Validaciones c={cliente} />
              </>
            ) : (
              <>
                <label className="clp-ro-imp-h" htmlFor="ro-importador">Importador en el pedimento <em>*</em></label>
                <div className="clp-rf-in">
                  <select id="ro-importador" className="clp-rc-input" value={form.importadorId ?? ""} onChange={(e) => set("importadorId", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Elige al importador final</option>
                    {subclientes.length ? <optgroup label={`Clientes de ${cliente.razonSocial}`}>{subclientes.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}</optgroup> : null}
                    <optgroup label="Clientes directos">{otrosDirectos.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}</optgroup>
                  </select>
                </div>
                {importador ? <Validaciones c={importador} /> : <small className="clp-ro-nota">Es forwarder: elige al importador final que va en el pedimento.</small>}
              </>
            )}
          </div>
        </div>
      )}
    >
      <div className="clp-rc-card clp-ro-embarque">
        <div className="clp-rc-card-h"><h3>Embarque</h3></div>
        <div className="clp-rc-grid">
          <div className="clp-rf">
            <label>Tipo de operación <em>*</em></label>
            <div className="clp-rc-seg" role="group" aria-label="Tipo de operación">
              {(["IMPO", "EXPO"] as const).map((t) => <button key={t} type="button" aria-pressed={form.tipo === t} onClick={() => cambiarTipo(t)}>{t === "IMPO" ? "Importación" : "Exportación"}</button>)}
            </div>
          </div>
          <div className="clp-rf">
            <label>Medio de transporte <em>*</em></label>
            <div className="clp-rc-seg clp-ro-medios" role="group" aria-label="Medio de transporte">
              {MEDIOS.map((m) => <button key={m} type="button" aria-pressed={form.medio === m} onClick={() => set("medio", m)}>{ETIQUETA_MEDIO[m]}</button>)}
            </div>
          </div>
          <div className="clp-rf">
            <label htmlFor="ro-aduana">Aduana <em>*</em></label>
            <div className="clp-rf-in">
              <select id="ro-aduana" className="clp-rc-input" value={form.aduana} onChange={(e) => set("aduana", e.target.value)}>
                <option value="">Elige la aduana</option>
                {aduanas.map((a) => <option key={a.clave} value={a.nombre}>{a.clave} · {a.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="clp-rf">
            <label htmlFor="ro-clave">Clave de pedimento</label>
            <div className="clp-rf-in">
              <select id="ro-clave" className="clp-rc-input" value={form.clavePedimento} onChange={(e) => set("clavePedimento", e.target.value)}>
                <option value="">Sin definir</option>
                {clavesValidas.map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.descripcion}</option>)}
              </select>
            </div>
          </div>
          <div className="clp-rf">
            <label htmlFor="ro-eta">{form.tipo === "IMPO" ? "ETA (arribo)" : "ETA a puerto"}</label>
            <div className="clp-rf-in"><input id="ro-eta" type="datetime-local" className="clp-rc-input" value={form.eta} onChange={(e) => set("eta", e.target.value)} /></div>
          </div>
          <div className="clp-rf">
            <label htmlFor="ro-ref">Referencia del cliente <span className="clp-rf-opc">Opcional</span></label>
            <div className="clp-rf-in"><input id="ro-ref" className="clp-rc-input" maxLength={60} placeholder="Orden de compra, embarque…" value={form.folioManual} onChange={(e) => set("folioManual", e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div className="clp-rc-card clp-ro-pedimento">
        <div className="clp-rc-card-h"><h3>Pedimento y expediente</h3><span className="clp-ro-patente">{patente ? `Patente ${patente}` : "Sin patente en Configuración"}</span></div>
        <div className="clp-ro-ped">
          <div className={`clp-ro-pcs ${aduana ? "" : "vacio"}`} key={aduana?.clave ?? "sin"}>
            {caja(anio(), "Año")}
            {caja(aduana ? aduana.clave.slice(0, 2) : "··", "Aduana")}
            {caja(patente ?? "····", "Patente")}
            {caja("·······", "Consecutivo", true)}
          </div>
          <small className="clp-ro-nota">{aduana ? "El consecutivo se captura al validar el pedimento en la fase 5 · Pedimento." : "Elige la aduana para ver el inicio del número de pedimento."}{cliente ? "" : " Podrá validarse cuando la operación tenga cliente."}</small>
        </div>
        <div className={`clp-ro-docs ${docs.length ? "con" : ""}`} role="button" tabIndex={0} aria-label="Agregar documentos iniciales"
          onClick={(e) => { if (!(e.target as HTMLElement).closest("select, .clp-ro-doc-x")) archivos.current?.click(); }}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); archivos.current?.click(); } }}>
          <FileText aria-hidden />
          <div>
            <b>Documentos iniciales <span className="clp-rf-opc">Opcional</span></b>
            {docs.length ? (
              <ul className="clp-ro-doclist">
                {docs.map((d) => (
                  <li key={d.id}>
                    <Check aria-hidden /><span className="clp-ro-doc-n" title={d.archivo.name}>{d.archivo.name}</span><small>{pesoArchivo(d.archivo.size)}</small>
                    <select aria-label={`Tipo de ${d.archivo.name}`} value={d.tipo} onChange={(e) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, tipo: e.target.value as TipoDocumento } : x)))}>
                      {tiposDoc.map((t) => <option key={t.tipo} value={t.tipo}>{t.nombre}</option>)}
                    </select>
                    <button type="button" className="clp-ro-doc-x" aria-label={`Quitar ${d.archivo.name}`} onClick={() => setDocs((ds) => ds.filter((x) => x.id !== d.id))}><X aria-hidden /></button>
                  </li>
                ))}
              </ul>
            ) : <small>BL, factura comercial, packing list · se agregan al expediente para revisión</small>}
          </div>
          <span className="clp-btn clp-btn-secondary clp-btn-sm"><Plus className="h-4 w-4" />Agregar</span>
          <input ref={archivos} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { agregarArchivos([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </div>
        <PieRegistro>
          <label className="clp-rc-crear-op"><input type="checkbox" checked={verResumen} onChange={(e) => setVerResumen(e.target.checked)} disabled={guardando} /> Ver la operación completa al abrir</label>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => onVolver()} disabled={guardando}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando} aria-busy={guardando || undefined}>
            {guardando ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}
            {guardando ? "Abriendo…" : "Abrir expediente"}
          </button>
        </PieRegistro>
      </div>
    </RegistroDividido>
  );
}
