"use client";

import { useId } from "react";
import { Check, AlertTriangle } from "lucide-react";
import type { OpcionCliente } from "../types/vistas";
import { TipoClienteBadge } from "./etiquetas";

interface Props {
  opciones: OpcionCliente[];
  clienteId: number | null;
  importadorId: number | null;
  onChange: (valor: { clienteId: number | null; importadorId: number | null }) => void;
  deshabilitado?: boolean;
}

/** Encargo vigente: marcado y con fecha de vigencia de hoy en adelante (o sin fecha). */
export function encargoVigente(c: Pick<OpcionCliente, "encargoConferido" | "fechaVigenciaEncargo">) {
  if (!c.encargoConferido) return false;
  if (!c.fechaVigenciaEncargo) return true;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(c.fechaVigenciaEncargo) >= hoy;
}

/** Validaciones del importador que van en el pedimento: padrón y encargo conferido. */
export function ValidacionesImportador({ importador }: { importador: OpcionCliente | Omit<OpcionCliente, "clientePadreId"> }) {
  const vigente = encargoVigente(importador);
  const padron = importador.padronImportadores;
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`clp-pill ${padron === true ? "clp-pill-ok" : padron === false ? "clp-pill-riesgo" : "clp-pill-alerta"} clp-pill-sin-punto`}>
        {padron === true ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        Padrón de importadores: {padron === true ? "activo" : padron === false ? "inactivo" : "sin verificar"}
      </span>
      <span className={`clp-pill ${vigente ? "clp-pill-ok" : "clp-pill-riesgo"} clp-pill-sin-punto`}>
        {vigente ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        Encargo conferido: {vigente ? (importador.fechaVigenciaEncargo ? `vigente al ${new Date(importador.fechaVigenciaEncargo).toLocaleDateString("es-MX")}` : "vigente") : "no vigente"}
      </span>
    </div>
  );
}

/**
 * Cliente que solicita el servicio + importador del pedimento.
 * Directo: el importador es el mismo cliente. Forwarder: se elige al importador final,
 * primero sus subclientes y después el resto de clientes directos.
 */
export function SelectorClienteImportador({ opciones, clienteId, importadorId, onChange, deshabilitado }: Props) {
  const idCliente = useId();
  const idImportador = useId();
  const cliente = opciones.find((c) => c.id === clienteId) ?? null;
  const directos = opciones.filter((c) => c.tipo === "DIRECTO");
  const forwarders = opciones.filter((c) => c.tipo === "FORWARDER");
  const subclientes = cliente?.tipo === "FORWARDER" ? directos.filter((c) => c.clientePadreId === cliente.id) : [];
  const otrosDirectos = directos.filter((c) => !subclientes.includes(c));

  const elegirCliente = (valor: string) => {
    const nuevo = opciones.find((c) => c.id === Number(valor)) ?? null;
    onChange({ clienteId: nuevo?.id ?? null, importadorId: nuevo?.tipo === "DIRECTO" ? nuevo.id : null });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor={idCliente} className="clp-label">
          Cliente que solicita el servicio <span className="text-red-600">*</span>{" "}
          {cliente ? <TipoClienteBadge tipo={cliente.tipo} /> : null}
        </label>
        <select id={idCliente} className="clp-input" value={clienteId ?? ""} onChange={(e) => elegirCliente(e.target.value)} disabled={deshabilitado}>
          <option value="">Elige un cliente</option>
          <optgroup label="Directos">
            {directos.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}
          </optgroup>
          <optgroup label="Forwarders">
            {forwarders.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}
          </optgroup>
        </select>
        <p className="clp-ayuda">Quien contrata y paga el servicio.</p>
      </div>
      <div>
        <label htmlFor={idImportador} className="clp-label">Importador en el pedimento <span className="text-red-600">*</span></label>
        {cliente?.tipo === "FORWARDER" ? (
          <select id={idImportador} className="clp-input" value={importadorId ?? ""} onChange={(e) => onChange({ clienteId, importadorId: e.target.value ? Number(e.target.value) : null })} disabled={deshabilitado}>
            <option value="">Elige al importador final</option>
            {subclientes.length ? (
              <optgroup label={`Clientes de ${cliente.razonSocial}`}>
                {subclientes.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}
              </optgroup>
            ) : null}
            <optgroup label="Clientes directos">
              {otrosDirectos.map((c) => <option key={c.id} value={c.id}>{c.folio} - {c.razonSocial}</option>)}
            </optgroup>
          </select>
        ) : (
          <input id={idImportador} className="clp-input bg-slate-50 text-slate-500" readOnly value={cliente ? `Mismo que el cliente · ${cliente.folio}` : "Primero elige el cliente"} />
        )}
        <p className="clp-ayuda">
          {cliente?.tipo === "FORWARDER" ? "Forwarder: elige la empresa cuyos datos van en el pedimento." : "Cliente directo: el importador es la misma empresa."}
        </p>
      </div>
    </div>
  );
}
