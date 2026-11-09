"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import type { HitoOperativo } from "@prisma/client";
import { useSession } from "@/features/session";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useAccion } from "@/shared/hooks/useAccion";
import { useAhora } from "@/shared/hooks/useAhora";
import { formatoFechaHora, formatoMoneda } from "@/shared/utils/formato";
import type { ProveedorParaPaso } from "@/features/proveedores/types";
import { ETIQUETA_TIPO_PROVEEDOR } from "@/features/proveedores/types";
import type { Permiso } from "@/shared/auth/permisos";
import type { AccionPaso } from "../../domain/proceso";
import { asignarProveedorAction, cambiarPasoAction } from "../../actions/operaciones-actions";
import type { OperacionDetalle, PasoOperacion } from "../../types/vistas";
import { PillPaso } from "../etiquetas";

const PASOS_PEDIMENTO: HitoOperativo[] = ["DESPACHO_ADUANERO", "PAGO_CONTRIBUCIONES", "MODULACION"];
const PASOS_NUEVOS: HitoOperativo[] = ["CLASIFICACION", "REVALIDACION_BL", "PAGO_CONTRIBUCIONES", "MODULACION", "CUENTA_GASTOS"];

function permisoDelPaso(p: PasoOperacion): Permiso {
  if (p.clave === "CUENTA_GASTOS") return "cuenta.emitir";
  if (PASOS_PEDIMENTO.includes(p.clave)) return "pedimento.gestionar";
  return "operaciones.operar";
}

/** Tiempo restante contra el SLA para un paso en proceso. */
function Sla({ p }: { p: PasoOperacion }) {
  const ahora = useAhora();
  if (p.estado === "NO_APLICA") return <span className="text-slate-400">—</span>;
  if (!p.slaHoras) return <span className="text-slate-500">—</span>;
  if (p.estado === "COMPLETADO" && p.tiempoInvertido != null) {
    const enTiempo = p.tiempoInvertido <= p.slaHoras * 3600;
    return <span className={enTiempo ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{enTiempo ? "En tiempo" : "Fuera de tiempo"}</span>;
  }
  if ((p.estado === "EN_PROCESO" || p.estado === "RECONOCIMIENTO") && p.fechaInicio) {
    const restante = p.slaHoras - (ahora - new Date(p.fechaInicio).getTime()) / 3_600_000;
    return restante >= 0
      ? <span className="font-semibold text-green-700">Quedan {Math.floor(restante)} h <span className="font-normal text-slate-500">de {p.slaHoras} h</span></span>
      : <span className="font-semibold text-red-700">Vencido {Math.ceil(-restante)} h</span>;
  }
  return <span className="text-slate-500">{p.slaHoras} h</span>;
}

export function TabEtapas({ op, proveedores }: { op: OperacionDetalle; proveedores: Partial<Record<HitoOperativo, ProveedorParaPaso[]>> }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const [pedimentoPara, setPedimentoPara] = useState<PasoOperacion | null>(null);
  const [numeroPedimento, setNumeroPedimento] = useState("");
  const [provPara, setProvPara] = useState<PasoOperacion | null>(null);
  const [provElegido, setProvElegido] = useState<number | null>(null);
  const [costo, setCosto] = useState("");
  const cerrada = op.estado === "CERRADA";

  const accion = (p: PasoOperacion, a: AccionPaso, extra = {}) => ejecutar(() => cambiarPasoAction(op.id, p.id, a, extra));
  const candidatos = provPara ? (proveedores[provPara.clave] ?? []).filter((x) => !x.aduanas.length || x.aduanas.includes(op.aduana)) : [];

  const abrirProveedor = (p: PasoOperacion) => {
    const lista = (proveedores[p.clave] ?? []).filter((x) => !x.aduanas.length || x.aduanas.includes(op.aduana));
    const inicial = p.proveedor?.id ?? lista[0]?.id ?? null;
    setProvPara(p);
    setProvElegido(inicial);
    setCosto(String(p.costo ?? lista.find((x) => x.id === inicial)?.tarifa ?? ""));
  };

  const botones = (p: PasoOperacion) => {
    if (!puede(permisoDelPaso(p)) && !puede("pasos.reabrir")) return null;
    const puedeOperar = puede(permisoDelPaso(p));
    const reabrir = puede("pasos.reabrir");
    if (cerrada) return p.clave === "CUENTA_GASTOS" && p.estado === "COMPLETADO" && reabrir
      ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => accion(p, "REABRIR")}>Reabrir cuenta</button>
      : null;
    if (p.estado === "PENDIENTE") {
      if (p.bloqueo) return <span className="text-slate-400" title={p.bloqueo}><Lock className="h-4 w-4" aria-label={p.bloqueo} /></span>;
      return puedeOperar ? (
        <>
          <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "INICIAR")}>Iniciar</button>
          {!PASOS_NUEVOS.includes(p.clave) ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "NO_APLICA")}>No aplica</button> : null}
        </>
      ) : null;
    }
    if (p.estado === "EN_PROCESO" && p.clave === "MODULACION") return puedeOperar ? (
      <>
        <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm !text-green-700" disabled={pendiente} onClick={() => accion(p, "MODULAR_VERDE")}>Verde</button>
        <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm !text-red-700" disabled={pendiente} onClick={() => accion(p, "MODULAR_ROJO")}>Rojo</button>
      </>
    ) : null;
    if (p.estado === "RECONOCIMIENTO") return puedeOperar ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "LIBERAR")}>Liberar</button> : null;
    if (p.estado === "EN_PROCESO") return (
      <>
        {puedeOperar ? (
          <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" disabled={pendiente}
            onClick={() => p.clave === "DESPACHO_ADUANERO" ? (setNumeroPedimento(op.numeroPedimento ?? ""), setPedimentoPara(p)) : accion(p, "COMPLETAR")}>
            {p.clave === "CUENTA_GASTOS" ? "Emitir cuenta" : p.clave === "DESPACHO_ADUANERO" ? "Validar pedimento" : "Completar"}
          </button>
        ) : null}
        {reabrir ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "REABRIR")}>Regresar</button> : null}
      </>
    );
    if (p.estado === "COMPLETADO" && reabrir) return <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "REABRIR")}>Reabrir</button>;
    if (p.estado === "NO_APLICA" && puedeOperar) return <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={pendiente} onClick={() => accion(p, "ACTIVAR")}>Activar</button>;
    return null;
  };

  const faseUnoClienteOk = !!op.cliente && !!op.importador;
  let numero = 0;

  return (
    <section className="clp-card overflow-hidden">
      <div className="clp-dt-toolbar">
        <span className="clp-dt-titulo">Proceso de {op.tipo === "IMPO" ? "importación" : "exportación"}</span>
        <span className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-aduanaBlue" />Tus etapas</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#7a4bd6]" />Pasos del proceso aduanero</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" />Bloqueado hasta cumplir lo anterior</span>
        </span>
      </div>
      <div className="clp-dt-scroll !max-h-none">
        <table className="clp-dt-tabla">
          <thead>
            <tr><th className="w-10">#</th><th>Paso</th><th>Estado</th><th>Inicio</th><th>Fin</th><th>SLA</th><th>Proveedor / Responsable</th><th className="text-right">Acción</th></tr>
          </thead>
          <tbody>
            {op.fases.map((nombreFase, i) => {
              const fase = i + 1;
              const pasos = op.pasos.filter((p) => p.fase === fase);
              const aplican = pasos.filter((p) => p.estado !== "NO_APLICA");
              const hechos = aplican.filter((p) => p.estado === "COMPLETADO").length;
              const motivo = pasos.find((p) => p.bloqueo && p.estado === "PENDIENTE")?.bloqueo;
              return (
                <Fragment key={nombreFase}>
                  <tr className="clp-fila-fase">
                    <td colSpan={8}>
                      <span className="flex flex-wrap items-center gap-3">
                        <span>{fase}. {nombreFase}</span>
                        <span className="font-medium text-slate-500">{fase === 1 ? `${Number(faseUnoClienteOk) + Number(op.documentosObligatoriosAprobados)}/2` : `${hechos}/${aplican.length}`}</span>
                        {motivo ? <span className="clp-candado"><Lock className="h-3 w-3" />{motivo}</span> : null}
                      </span>
                    </td>
                  </tr>
                  {fase === 1 ? (
                    <>
                      <tr>
                        <td className="text-slate-500">{++numero}</td>
                        <td><div className="clp-paso-nombre clp-paso-nuevo font-semibold">Asignar cliente e importador</div></td>
                        <td><PillPaso estado={faseUnoClienteOk ? "COMPLETADO" : "PENDIENTE"} /></td>
                        <td colSpan={4} className="text-sm text-slate-500">{faseUnoClienteOk ? `${op.cliente!.folio} · importador ${op.importador!.folio}` : "Se completa en Detalles del Embarque."}</td>
                        <td />
                      </tr>
                      <tr>
                        <td className="text-slate-500">{++numero}</td>
                        <td><div className="clp-paso-nombre clp-paso-nuevo font-semibold">Recepción y aprobación de documentos</div></td>
                        <td><PillPaso estado={op.documentosObligatoriosAprobados ? "COMPLETADO" : op.documentos.some((d) => d.estado !== "PENDIENTE") ? "EN_PROCESO" : "PENDIENTE"} /></td>
                        <td colSpan={4} className="text-sm text-slate-500">Se completa al aprobar los documentos obligatorios en Documentación.</td>
                        <td />
                      </tr>
                    </>
                  ) : null}
                  {pasos.map((p) => (
                    <tr key={p.id} className={p.estado === "NO_APLICA" ? "opacity-60" : ""}>
                      <td className="text-slate-500">{++numero}</td>
                      <td>
                        <div className={`clp-paso-nombre ${PASOS_NUEVOS.includes(p.clave) ? "clp-paso-nuevo" : ""}`}>
                          <div className={`font-semibold ${p.estado === "NO_APLICA" ? "line-through decoration-slate-300" : ""}`}>{p.nombre}</div>
                          {p.descripcion ? <div className="text-xs text-slate-500">{p.descripcion}</div> : null}
                        </div>
                      </td>
                      <td><PillPaso estado={p.estado} /></td>
                      <td className="text-sm tabular-nums text-slate-500">{formatoFechaHora(p.fechaInicio)}</td>
                      <td className="text-sm tabular-nums text-slate-500">{formatoFechaHora(p.fechaFin)}</td>
                      <td className="text-sm"><Sla p={p} /></td>
                      <td className="text-sm">
                        {p.esServicio ? (
                          p.proveedor ? (
                            <div>
                              <div className="font-medium">{p.proveedor.razonSocial}</div>
                              <div className="text-xs text-slate-500">
                                {p.costo != null ? formatoMoneda(p.costo) : "Sin costo"}
                                {!cerrada && puede("operaciones.operar") ? <button type="button" className="ml-2 font-semibold text-aduanaBlue underline" onClick={() => abrirProveedor(p)}>Cambiar</button> : null}
                              </div>
                            </div>
                          ) : !cerrada && p.estado !== "NO_APLICA" && puede("operaciones.operar") ? (
                            <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => abrirProveedor(p)}>Asignar proveedor</button>
                          ) : <span className="text-slate-400">—</span>
                        ) : (
                          <div><div>{p.responsable ?? "Sin asignar"}</div><div className="text-xs text-slate-500">Interno</div></div>
                        )}
                      </td>
                      <td><div className="flex flex-wrap justify-end gap-1.5">{botones(p)}</div></td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer
        open={pedimentoPara != null}
        onClose={() => setPedimentoPara(null)}
        title="Validar pedimento"
        subtitle="Captura el número que asignó la validación. Se guarda en la operación y en el folio."
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setPedimentoPara(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente || numeroPedimento.replace(/\D/g, "").length !== 15}
              onClick={() => ejecutar(() => cambiarPasoAction(op.id, pedimentoPara!.id, "COMPLETAR", { numeroPedimento }), (ok) => ok && setPedimentoPara(null))}>
              {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Validar
            </button>
          </>
        }
      >
        <label className="clp-label" htmlFor="num-ped">Número de pedimento</label>
        <input id="num-ped" className="clp-input clp-mono" inputMode="numeric" placeholder="26 16 3711 6001850" value={numeroPedimento} onChange={(e) => setNumeroPedimento(e.target.value)} />
        <p className="clp-ayuda">15 dígitos: año, aduana, patente y consecutivo. Llevas {numeroPedimento.replace(/\D/g, "").length}.</p>
      </Drawer>

      <Drawer
        open={provPara != null}
        onClose={() => setProvPara(null)}
        title={`Proveedor para ${provPara?.nombre ?? ""}`}
        subtitle={`Solo aparecen proveedores que prestan este servicio en ${op.aduana}.`}
        footer={candidatos.length ? (
          <>
            {provPara?.proveedor ? <button type="button" className="clp-btn clp-btn-secondary mr-auto !text-red-700" disabled={pendiente} onClick={() => ejecutar(() => asignarProveedorAction(op.id, provPara!.id, null, null), (ok) => ok && setProvPara(null))}>Quitar proveedor</button> : null}
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setProvPara(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente || provElegido == null}
              onClick={() => ejecutar(() => asignarProveedorAction(op.id, provPara!.id, provElegido, costo.trim() === "" ? null : Number(costo.replace(/,/g, ""))), (ok) => ok && setProvPara(null))}>
              Asignar
            </button>
          </>
        ) : undefined}
      >
        {candidatos.length === 0 ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <b>Ningún proveedor presta “{provPara?.nombre}” en {op.aduana}.</b>
            <p className="mt-1">Regístralo en Proveedores y marca “{provPara?.nombre}” en Servicios que presta.</p>
            <Link href="/proveedores" className="clp-btn clp-btn-primary mt-3">Ir a Proveedores</Link>
          </div>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="clp-grupo-titulo">Proveedores que prestan este servicio</legend>
              {candidatos.map((c) => (
                <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${provElegido === c.id ? "border-aduanaBlue bg-tinte" : "border-linea"}`}>
                  <input type="radio" name="proveedor" checked={provElegido === c.id} onChange={() => { setProvElegido(c.id); setCosto(String(c.tarifa ?? "")); }} className="accent-aduanaBlue" />
                  <span className="flex-1">
                    <span className="block font-semibold">{c.razonSocial}</span>
                    <span className="text-xs text-slate-500">{ETIQUETA_TIPO_PROVEEDOR[c.tipo]} · {c.aduanas.length ? c.aduanas.join(", ") : "Todas las aduanas"}</span>
                  </span>
                  <span className="clp-mono">{c.tarifa != null ? formatoMoneda(c.tarifa) : "Sin tarifa"}</span>
                </label>
              ))}
            </fieldset>
            <div className="mt-4">
              <label className="clp-label" htmlFor="costo-prov">Costo para esta operación (MXN)</label>
              <input id="costo-prov" className="clp-input tabular-nums" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} />
              <p className="clp-ayuda">Viene de la tarifa base; cámbialo si este servicio costó distinto. Se suma a la cuenta de gastos.</p>
            </div>
          </>
        )}
      </Drawer>
    </section>
  );
}
