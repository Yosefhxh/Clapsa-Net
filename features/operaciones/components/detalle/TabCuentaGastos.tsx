"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/features/session";
import { Pill } from "@/shared/components/ui/Pill";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFechaHora, formatoMoneda } from "@/shared/utils/formato";
import { agregarCargoAction, eliminarCargoAction } from "../../actions/operaciones-actions";
import type { OperacionDetalle } from "../../types/vistas";

/**
 * Cuenta de gastos: lo que se pagó por cuenta del cliente (proveedores y contribuciones)
 * más los servicios de la agencia (honorarios y su IVA). Todo en MXN.
 */
export function calcularCuenta(op: OperacionDetalle) {
  const servicios = op.pasos.filter((p) => p.proveedor && p.costo != null).map((p) => ({ concepto: p.nombre, origen: p.proveedor!.razonSocial, monto: p.costo! }));
  const contribuciones = op.cargos.filter((c) => c.tipo === "CONTRIBUCION");
  const otros = op.cargos.filter((c) => c.tipo === "OTRO");
  const honorarios = op.cargos.filter((c) => c.tipo === "HONORARIO");
  const suma = (xs: { monto: number }[]) => xs.reduce((a, x) => a + x.monto, 0);
  const subtotalHonorarios = suma(honorarios);
  const iva = Math.round(subtotalHonorarios * op.agencia.ivaHonorarios * 100) / 100;
  const total = suma(servicios) + suma(contribuciones) + suma(otros) + subtotalHonorarios + iva;
  return { servicios, contribuciones, otros, honorarios, iva, total };
}

function Fila({ concepto, origen, monto, quitar }: { concepto: string; origen: string; monto: number; quitar?: () => void }) {
  return (
    <tr>
      <td>{concepto}</td>
      <td className="text-slate-500">{origen}</td>
      <td className="clp-mono text-right">{formatoMoneda(monto)}</td>
      <td className="w-10 text-right">{quitar ? <button type="button" className="clp-icon-btn clp-icon-btn-danger" aria-label={`Quitar ${concepto}`} onClick={quitar}><Trash2 className="h-4 w-4" /></button> : null}</td>
    </tr>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return <tr className="clp-fila-fase"><td colSpan={4}>{titulo}</td></tr>;
}

export function TabCuentaGastos({ op }: { op: OperacionDetalle }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const cuenta = calcularCuenta(op);
  const emitida = op.pasos.find((p) => p.clave === "CUENTA_GASTOS")?.estado === "COMPLETADO";
  const editable = puede("cuenta.emitir") && op.estado !== "CERRADA";
  const [form, setForm] = useState({ tipo: "CONTRIBUCION" as "CONTRIBUCION" | "HONORARIO" | "OTRO", concepto: "", monto: "", moneda: "MXN" as "MXN" | "USD" });
  const sinHonorarios = cuenta.honorarios.length === 0 && op.agencia.honorariosBase > 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <section className="clp-card overflow-hidden">
        <div className="clp-dt-toolbar">
          <div>
            <div className="clp-dt-titulo">Cuenta de gastos</div>
            <div className="text-xs text-slate-500">Para: {op.cliente?.razonSocial ?? "Sin cliente asignado"} · {op.folio}</div>
          </div>
          <span className="flex-1" />
          {emitida ? <Pill tono="ok">Emitida {op.cerradaEn ? formatoFechaHora(op.cerradaEn) : ""}</Pill> : <Pill tono="neutro">Borrador</Pill>}
        </div>
        <table className="clp-dt-tabla">
          <thead><tr><th>Concepto</th><th>Proveedor / origen</th><th className="text-right">Importe</th><th /></tr></thead>
          <tbody>
            <Seccion titulo="Pagos hechos por cuenta del cliente" />
            {cuenta.servicios.length ? cuenta.servicios.map((s) => <Fila key={s.concepto} concepto={s.concepto} origen={s.origen} monto={s.monto} />) : (
              <tr><td colSpan={4} className="text-sm text-slate-500">Aún no hay proveedores con costo. Se agregan solos al asignarlos en Seguimiento y Etapas.</td></tr>
            )}
            {cuenta.contribuciones.map((c) => <Fila key={c.id} concepto={c.concepto} origen={op.numeroPedimento ? `Pedimento ${op.numeroPedimento}` : "Contribución"} monto={c.monto} quitar={editable ? () => ejecutar(() => eliminarCargoAction(op.id, c.id)) : undefined} />)}
            {cuenta.otros.map((c) => <Fila key={c.id} concepto={c.concepto} origen="Otro cargo" monto={c.monto} quitar={editable ? () => ejecutar(() => eliminarCargoAction(op.id, c.id)) : undefined} />)}
            <Seccion titulo="Servicios de la agencia" />
            {cuenta.honorarios.map((c) => <Fila key={c.id} concepto={c.concepto} origen="Honorarios" monto={c.monto} quitar={editable ? () => ejecutar(() => eliminarCargoAction(op.id, c.id)) : undefined} />)}
            {cuenta.honorarios.length === 0 ? <tr><td colSpan={4} className="text-sm text-slate-500">Sin honorarios capturados.</td></tr> : null}
            <Fila concepto={`IVA ${Math.round(op.agencia.ivaHonorarios * 100)}% de honorarios`} origen="—" monto={cuenta.iva} />
            <tr className="bg-tinte font-bold text-aduanaBlue"><td colSpan={2}>Total a cobrar</td><td className="clp-mono text-right">{formatoMoneda(cuenta.total)}</td><td /></tr>
          </tbody>
        </table>
        <p className="border-t border-linea px-4 py-2 text-xs text-slate-500">La cuenta se emite en el último paso (Seguimiento y Etapas → Cuenta de gastos). Al emitirla, la operación se cierra.</p>
      </section>

      {editable ? (
        <aside className="clp-card p-5">
          <h3 className="clp-section-title mb-3">Agregar cargo</h3>
          {sinHonorarios ? (
            <button type="button" className="clp-btn clp-btn-secondary mb-4 w-full" disabled={pendiente}
              onClick={() => ejecutar(() => agregarCargoAction(op.id, { tipo: "HONORARIO", concepto: "Honorarios del agente aduanal", monto: op.agencia.honorariosBase, moneda: "MXN" }))}>
              <Plus className="h-4 w-4" /> Honorarios base ({formatoMoneda(op.agencia.honorariosBase)})
            </button>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarCargoAction(op.id, form), (ok) => ok && setForm((f) => ({ ...f, concepto: "", monto: "" }))); }}
          >
            <div>
              <label className="clp-label" htmlFor="cargo-tipo">Tipo</label>
              <select id="cargo-tipo" className="clp-input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as typeof form.tipo })}>
                <option value="CONTRIBUCION">Contribución (IGI, IVA, DTA…)</option>
                <option value="HONORARIO">Honorario</option>
                <option value="OTRO">Otro cargo</option>
              </select>
            </div>
            <div>
              <label className="clp-label" htmlFor="cargo-concepto">Concepto</label>
              <input id="cargo-concepto" className="clp-input" maxLength={120} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Ej. IVA de importación" />
            </div>
            <div>
              <label className="clp-label" htmlFor="cargo-monto">Importe (MXN)</label>
              <input id="cargo-monto" className="clp-input tabular-nums" inputMode="decimal" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
            <button type="submit" className="clp-btn clp-btn-primary w-full" disabled={pendiente || form.concepto.trim().length < 3 || !Number(form.monto)}>
              {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar a la cuenta
            </button>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
