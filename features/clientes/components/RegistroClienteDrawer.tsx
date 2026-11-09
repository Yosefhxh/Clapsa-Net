"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, Upload } from "lucide-react";
import type { TipoCliente } from "@prisma/client";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useToast } from "@/shared/components/ui/Toast";
import { useAccion } from "@/shared/hooks/useAccion";
import { extractPdfData } from "@/shared/utils/extractPdfData";
import { ESTADOS_MEXICO } from "@/shared/utils/estadosMexico";
import { validarRfc } from "@/shared/utils/validaciones";
import { actualizarCliente, registrarCliente, subirEncargoAction } from "../actions/clientes-actions";
import type { ClienteVista } from "../dal/clientes-dal";
import { construirDomicilio, descomponerDomicilio } from "../utils/clientes-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: TipoCliente;
  editando: ClienteVista | null;
  forwarders: { id: number; folio: string; razonSocial: string }[];
}

const fechaInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function RegistroClienteDrawer({ open, onClose, tipo, editando, forwarders }: Props) {
  const avisar = useToast();
  const encargo = useAccion();
  const archivoEncargo = useRef<HTMLInputElement>(null);
  const [guardando, iniciar] = useTransition();
  const partes = descomponerDomicilio(editando?.domicilio ?? "");
  const [form, setForm] = useState({
    razonSocial: editando?.razonSocial ?? "",
    rfc: editando?.rfc ?? "",
    calle: partes.calle,
    estado: partes.estado,
    codigoPostal: partes.codigoPostal,
    domicilio: editando?.domicilio ?? "",
    padron: editando?.padronImportadores == null ? "" : editando.padronImportadores ? "si" : "no",
    encargoConferido: editando?.encargoConferido ?? false,
    fechaVigenciaEncargo: fechaInput(editando?.fechaVigenciaEncargo ?? null),
    clientePadreId: editando?.clientePadreId ?? null as number | null,
  });
  const [escaneando, setEscaneando] = useState(false);
  const [desdeConstancia, setDesdeConstancia] = useState(false);
  const [error, setError] = useState("");
  const rfc = validarRfc(form.rfc);

  // Constancia de situación fiscal: llena razón social, RFC y domicilio.
  const alSoltar = useCallback(async (archivos: File[]) => {
    const archivo = archivos[0];
    if (!archivo) return;
    setEscaneando(true);
    setError("");
    try {
      const datos = await extractPdfData(archivo);
      if (!datos.rfc) return setError("No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.");
      setForm((f) => ({ ...f, razonSocial: datos.razonSocial || f.razonSocial, rfc: datos.rfc, domicilio: datos.domicilio || f.domicilio, calle: "", estado: "", codigoPostal: "" }));
      setDesdeConstancia(true);
    } catch {
      setError("Error al procesar el PDF. Intenta con otro archivo.");
    } finally {
      setEscaneando(false);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: alSoltar, accept: { "application/pdf": [".pdf"] }, maxSize: 5 * 1024 * 1024, multiple: false, disabled: escaneando,
  });

  const cambiarDomicilio = (k: "calle" | "estado" | "codigoPostal", v: string) =>
    setForm((f) => {
      const n = { ...f, [k]: v };
      return { ...n, domicilio: construirDomicilio(n.calle, n.estado, n.codigoPostal) };
    });

  const guardar = () => {
    setError("");
    const datos = {
      razonSocial: form.razonSocial,
      rfc: form.rfc,
      domicilio: form.domicilio,
      tipo,
      padronImportadores: form.padron === "" ? null : form.padron === "si",
      encargoConferido: form.encargoConferido,
      fechaVigenciaEncargo: form.encargoConferido && form.fechaVigenciaEncargo ? form.fechaVigenciaEncargo : null,
      clientePadreId: tipo === "DIRECTO" ? form.clientePadreId : null,
    };
    iniciar(async () => {
      if (editando) {
        const r = await actualizarCliente(editando.id, datos);
        if (!r.ok) return setError(r.error);
        avisar(r.mensaje ?? "Cliente actualizado.");
      } else {
        const r = await registrarCliente(datos);
        if (!r.ok) return setError(r.error);
        avisar(`Cliente registrado con folio ${r.data.folio}.`);
      }
      onClose();
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editando ? `Editar ${editando.folio}` : tipo === "DIRECTO" ? "Registrar cliente directo" : "Registrar forwarder"}
      subtitle="Carga la constancia fiscal y revisa los datos que se llenan solos."
      footer={
        <>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editando ? "Guardar cambios" : "Guardar cliente"}
          </button>
        </>
      }
    >
      {error ? <div className="clp-alert mb-4 text-sm font-medium text-red-700" role="alert">{error}</div> : null}

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">1 · Constancia de situación fiscal (opcional)</h3>
        <div {...getRootProps()} className={`clp-dropzone ${isDragActive ? "clp-dropzone-activa" : ""}`}>
          <input {...getInputProps()} aria-label="Constancia de situación fiscal" />
          {escaneando ? <Loader2 className="mb-2 h-7 w-7 animate-spin text-aduanaBlue" /> : desdeConstancia ? <FileText className="mb-2 h-7 w-7 text-green-700" /> : <Upload className="mb-2 h-7 w-7 text-aduanaBlue" />}
          <p className="text-sm font-medium text-slate-700">{escaneando ? "Leyendo constancia…" : desdeConstancia ? "Datos tomados de la constancia" : "Arrastra el PDF o haz clic para buscarlo"}</p>
          <p className="mt-1 text-xs text-slate-500">Llena razón social, RFC y domicilio · Solo PDF, máx. 5 MB</p>
        </div>
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">2 · Datos fiscales</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="clp-label" htmlFor="cl-razon">Razón social <span className="text-red-600">*</span></label>
            <input id="cl-razon" className="clp-input" maxLength={200} value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} placeholder="Nombre de la empresa o persona" />
          </div>
          <div>
            <label className="clp-label" htmlFor="cl-rfc">RFC <span className="text-red-600">*</span></label>
            <input id="cl-rfc" className="clp-input clp-mono uppercase" maxLength={13} value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
            {form.rfc ? <p className={rfc.valido ? "clp-ayuda !text-green-700" : "clp-error-campo"}>{rfc.valido ? `✓ Persona ${rfc.persona === "MORAL" ? "moral" : "física"}` : "RFC de 12 o 13 caracteres"}</p> : null}
          </div>
          {tipo === "DIRECTO" ? (
            <div>
              <label className="clp-label" htmlFor="cl-padron">Padrón de importadores</label>
              <select id="cl-padron" className="clp-input" value={form.padron} onChange={(e) => setForm({ ...form, padron: e.target.value })}>
                <option value="">Sin verificar</option>
                <option value="si">Activo</option>
                <option value="no">Inactivo / suspendido</option>
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">3 · Domicilio fiscal</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
          <div className="md:col-span-2">
            <label className="clp-label" htmlFor="cl-calle">Calle y número</label>
            <input id="cl-calle" className="clp-input" value={form.calle} onChange={(e) => cambiarDomicilio("calle", e.target.value)} placeholder="Calle y número" />
          </div>
          <div>
            <label className="clp-label" htmlFor="cl-estado">Estado</label>
            <select id="cl-estado" className="clp-input" value={form.estado} onChange={(e) => cambiarDomicilio("estado", e.target.value)}>
              <option value="">Elige el estado</option>
              {ESTADOS_MEXICO.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="clp-label" htmlFor="cl-cp">Código postal</label>
            <input id="cl-cp" className="clp-input clp-mono" inputMode="numeric" maxLength={5} value={form.codigoPostal} onChange={(e) => cambiarDomicilio("codigoPostal", e.target.value.replace(/\D/g, ""))} placeholder="00000" />
          </div>
          <div className="md:col-span-2">
            <label className="clp-label" htmlFor="cl-dom">Domicilio completo</label>
            <input id="cl-dom" className="clp-input" value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} placeholder="Se completa automáticamente" />
          </div>
        </div>
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">4 · Encargo conferido al agente aduanal</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-aduanaBlue" checked={form.encargoConferido} onChange={(e) => setForm({ ...form, encargoConferido: e.target.checked })} />
          El cliente tiene encargo conferido vigente
        </label>
        {form.encargoConferido ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="clp-label" htmlFor="cl-vig">Vigente hasta</label>
              <input id="cl-vig" type="date" className="clp-input" value={form.fechaVigenciaEncargo} onChange={(e) => setForm({ ...form, fechaVigenciaEncargo: e.target.value })} />
              <p className="clp-ayuda">Se avisa en el Home 30 días antes de que venza.</p>
            </div>
            {editando ? (
              <div>
                <span className="clp-label">Documento del encargo</span>
                <input ref={archivoEncargo} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="PDF del encargo conferido"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set("file", f); encargo.ejecutar(() => subirEncargoAction(editando.id, fd)); e.target.value = ""; }} />
                <div className="flex gap-2">
                  {editando.pdfEncargoUrl ? <a className="clp-btn clp-btn-secondary clp-btn-sm" href={editando.pdfEncargoUrl} target="_blank" rel="noreferrer">Ver PDF</a> : null}
                  <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={encargo.pendiente} onClick={() => archivoEncargo.current?.click()}>
                    {encargo.pendiente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {editando.pdfEncargoUrl ? "Reemplazar" : "Subir PDF"}
                  </button>
                </div>
              </div>
            ) : <p className="self-end text-xs text-slate-500">El PDF del encargo se sube después de guardar el cliente.</p>}
          </div>
        ) : null}
      </section>

      {tipo === "DIRECTO" && forwarders.length ? (
        <section className="clp-grupo">
          <h3 className="clp-grupo-titulo">5 · Forwarder que lo atiende (opcional)</h3>
          <select className="clp-input" value={form.clientePadreId ?? ""} onChange={(e) => setForm({ ...form, clientePadreId: e.target.value ? Number(e.target.value) : null })} aria-label="Forwarder que lo atiende">
            <option value="">Ninguno</option>
            {forwarders.map((f) => <option key={f.id} value={f.id}>{f.folio} - {f.razonSocial}</option>)}
          </select>
          <p className="clp-ayuda">Al crear una operación de ese forwarder, este cliente aparece primero como importador.</p>
        </section>
      ) : null}
    </Drawer>
  );
}
