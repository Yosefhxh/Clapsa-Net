"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ClavePedimento, MedioTransporte, TipoOperacion } from "@prisma/client";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useToast } from "@/shared/components/ui/Toast";
import { crearOperacionAction } from "../actions/operaciones-actions";
import { ETIQUETA_MEDIO, type OpcionCliente } from "../types/vistas";
import { SelectorClienteImportador, ValidacionesImportador } from "./SelectorClienteImportador";

interface Props {
  open: boolean;
  onClose: () => void;
  opciones: OpcionCliente[];
  aduanas: { clave: string; nombre: string }[];
  claves: ClavePedimento[];
  /** Cliente ya elegido (por ejemplo, al venir desde Clientes). */
  clienteInicial?: number | null;
}

const INICIAL = {
  clienteId: null as number | null,
  importadorId: null as number | null,
  tipo: "IMPO" as TipoOperacion,
  medio: "MARITIMO" as MedioTransporte,
  aduana: "",
  clavePedimento: "A1",
  eta: "",
  folioManual: "",
};

/**
 * Fase 1 · Apertura del expediente. El cliente se puede dejar para después (cuando llegan
 * documentos antes de confirmar al importador), pero el pedimento queda bloqueado hasta asignarlo.
 */
export function NuevaOperacionDrawer({ open, onClose, opciones, aduanas, claves, clienteInicial }: Props) {
  const router = useRouter();
  const avisar = useToast();
  const [form, setForm] = useState(() => {
    const c = opciones.find((o) => o.id === clienteInicial && o.activo);
    return c ? { ...INICIAL, clienteId: c.id, importadorId: c.tipo === "DIRECTO" ? c.id : null } : INICIAL;
  });
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();
  const importador = opciones.find((c) => c.id === form.importadorId);
  const clavesValidas = claves.filter((c) => (form.tipo === "IMPO" ? c.aplicaImpo : c.aplicaExpo));
  const set = <K extends keyof typeof INICIAL>(k: K, v: (typeof INICIAL)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = () => {
    setError("");
    if (form.clienteId && !form.importadorId) return setError("Elige al importador que va en el pedimento.");
    iniciar(async () => {
      const r = await crearOperacionAction({ ...form, eta: form.eta || null, clavePedimento: form.clavePedimento || null });
      if (!r.ok) return setError(r.error);
      avisar(r.mensaje ?? "Operación creada.");
      setForm(INICIAL);
      onClose();
      router.push(`/operaciones/${r.data.id}`);
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nueva operación"
      subtitle="Fase 1 · Apertura del expediente. Lo primero es saber para quién es el despacho."
      footer={
        <>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Abrir expediente
          </button>
        </>
      }
    >
      {error ? <div className="clp-alert mb-4 text-sm font-medium text-red-700" role="alert">{error}</div> : null}

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">1 · Cliente e importador</h3>
        <SelectorClienteImportador
          opciones={opciones}
          clienteId={form.clienteId}
          importadorId={form.importadorId}
          onChange={(v) => setForm((f) => ({ ...f, ...v }))}
        />
        {importador ? <div className="mt-3"><ValidacionesImportador importador={importador} /></div> : (
          <p className="clp-ayuda mt-2">Si aún no se confirma el cliente, deja este paso para después: la operación queda “En espera de cliente”.</p>
        )}
      </section>

      <section className="clp-grupo">
        <h3 className="clp-grupo-titulo">2 · Embarque</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="clp-label" htmlFor="op-tipo">Tipo de operación <span className="text-red-600">*</span></label>
            <select id="op-tipo" className="clp-input" value={form.tipo} onChange={(e) => set("tipo", e.target.value as TipoOperacion)}>
              <option value="IMPO">Importación (IMPO)</option>
              <option value="EXPO">Exportación (EXPO)</option>
            </select>
            <p className="clp-ayuda">Define el orden de las 8 fases.</p>
          </div>
          <div>
            <label className="clp-label" htmlFor="op-medio">Medio de transporte <span className="text-red-600">*</span></label>
            <select id="op-medio" className="clp-input" value={form.medio} onChange={(e) => set("medio", e.target.value as MedioTransporte)}>
              {(Object.keys(ETIQUETA_MEDIO) as MedioTransporte[]).map((m) => <option key={m} value={m}>{ETIQUETA_MEDIO[m]}</option>)}
            </select>
            <p className="clp-ayuda">Los pasos que no aplican se marcan solos.</p>
          </div>
          <div>
            <label className="clp-label" htmlFor="op-aduana">Aduana <span className="text-red-600">*</span></label>
            <select id="op-aduana" className="clp-input" value={form.aduana} onChange={(e) => set("aduana", e.target.value)}>
              <option value="">Elige la aduana</option>
              {aduanas.map((a) => <option key={a.clave} value={a.nombre}>{a.clave} · {a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="clp-label" htmlFor="op-clave">Clave de pedimento</label>
            <select id="op-clave" className="clp-input" value={form.clavePedimento} onChange={(e) => set("clavePedimento", e.target.value)}>
              <option value="">Sin definir</option>
              {clavesValidas.map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.descripcion}</option>)}
            </select>
          </div>
          <div>
            <label className="clp-label" htmlFor="op-eta">{form.tipo === "IMPO" ? "ETA (arribo)" : "ETA a puerto"}</label>
            <input id="op-eta" type="datetime-local" className="clp-input" value={form.eta} onChange={(e) => set("eta", e.target.value)} />
          </div>
          <div>
            <label className="clp-label" htmlFor="op-ref">Referencia del cliente</label>
            <input id="op-ref" className="clp-input" maxLength={60} value={form.folioManual} onChange={(e) => set("folioManual", e.target.value)} placeholder="Opcional" />
          </div>
        </div>
      </section>
    </Drawer>
  );
}
