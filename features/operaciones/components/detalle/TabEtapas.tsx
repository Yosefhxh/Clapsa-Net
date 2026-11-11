"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Lock } from "lucide-react";
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
import { INFO_FASES } from "../../domain/fases-info";
import { ETIQUETA_ESTADO_PASO } from "../../types/vistas";

const PASOS_PEDIMENTO: HitoOperativo[] = ["DESPACHO_ADUANERO", "PAGO_CONTRIBUCIONES", "MODULACION"];
const PASOS_NUEVOS: HitoOperativo[] = ["CLASIFICACION", "REVALIDACION_BL", "PAGO_CONTRIBUCIONES", "MODULACION", "CUENTA_GASTOS"];

function permisoDelPaso(p: PasoOperacion): Permiso {
  if (p.clave === "CUENTA_GASTOS") return "cuenta.emitir";
  if (PASOS_PEDIMENTO.includes(p.clave)) return "pedimento.gestionar";
  return "operaciones.operar";
}

/** Fecha y hora en dos renglones para que la tabla del proceso quepa completa. */
function FechaHora({ iso }: { iso: string | null }) {
  if (!iso) return <>-</>;
  const [fecha, hora] = formatoFechaHora(iso).split(", ");
  return <span className="clp-fecha2">{fecha}<small>{hora}</small></span>;
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
  if ((p.estado === "EN_PROCESO" || p.estado === "RECONOCIMIENTO") && p.fechaInicio && ahora > 0) {
    const restante = p.slaHoras - (ahora - new Date(p.fechaInicio).getTime()) / 3_600_000;
    return restante >= 0
      ? <span className="font-semibold text-green-700">Quedan {Math.floor(restante)} h <span className="font-normal text-slate-500">de {p.slaHoras} h</span></span>
      : <span className="font-semibold text-red-700">Vencido {Math.ceil(-restante)} h</span>;
  }
  return <span className="text-slate-500">{p.slaHoras} h</span>;
}

interface PropsEtapas {
  op: OperacionDetalle;
  proveedores: Partial<Record<HitoOperativo, ProveedorParaPaso[]>>;
  /** Fase que se muestra (1 a 8). */
  fase: number;
  alElegirFase: (fase: number) => void;
}

export function TabEtapas({ op, proveedores, fase: faseSel, alElegirFase }: PropsEtapas) {
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
  const docsFaseUno = op.documentosObligatoriosAprobados ? "COMPLETADO" : op.documentos.some((d) => d.estado !== "PENDIENTE") ? "EN_PROCESO" : "PENDIENTE";

  // Resumen de cada fase para la navegación: hechos/total y estado.
  const resumen = op.fases.map((nombre, i) => {
    const fase = i + 1;
    const pasos = op.pasos.filter((p) => p.fase === fase);
    const aplican = pasos.filter((p) => p.estado !== "NO_APLICA");
    const hechos = fase === 1 ? Number(faseUnoClienteOk) + Number(op.documentosObligatoriosAprobados) + aplican.filter((p) => p.estado === "COMPLETADO").length : aplican.filter((p) => p.estado === "COMPLETADO").length;
    const total = fase === 1 ? 2 + aplican.length : aplican.length;
    const completa = cerrada || hechos === total;
    const bloqueada = !completa && fase > op.fase && aplican.some((p) => p.estado === "PENDIENTE" && p.bloqueo);
    const estado = completa ? "Completada" : fase === op.fase ? "En curso" : bloqueada ? "Bloqueada" : "Pendiente";
    return { fase, nombre, pasos, hechos, total, completa, bloqueada, estado };
  });
  const sel = resumen[faseSel - 1] ?? resumen[0];
  const info = INFO_FASES[op.tipo][sel.fase - 1];
  const numeroBase = 1 + (sel.fase > 1 ? 2 : 0) + op.pasos.filter((p) => p.fase < sel.fase).length;
  let numero = numeroBase - 1;

  // Movimientos de la fase: eventos de la bitácora que mencionan sus pasos (o la apertura en la fase 1).
  const nombres = sel.pasos.map((p) => p.nombre);
  const movimientos = op.eventos.filter((e) => nombres.some((n) => e.descripcion.includes(n)) || (sel.fase === 1 && (e.tipo === "ASIGNACION" || e.tipo === "DOCUMENTO" || e.tipo === "OPERACION"))).slice(0, 4);
  const docsDeFase = info.docs.map((t) => op.documentos.find((d) => d.tipo === t)).filter((d): d is NonNullable<typeof d> => d != null);

  // Qué falta para avanzar: pasos de esta fase y los candados de la siguiente.
  const siguiente = sel.fase < 8 ? resumen[sel.fase] : null;
  const requisitos = [
    ...(sel.fase === 1 ? [
      { ok: faseUnoClienteOk, t: "Cliente e importador asignados", d: faseUnoClienteOk ? "Completado" : "Se asigna en Datos del embarque" },
      { ok: op.documentosObligatoriosAprobados, t: "Documentos obligatorios aprobados", d: op.documentosObligatoriosAprobados ? "Completado" : "Se aprueban en Documentación" },
    ] : []),
    ...sel.pasos.filter((p) => p.estado !== "NO_APLICA").map((p) => ({ ok: p.estado === "COMPLETADO", t: p.nombre, d: p.estado === "PENDIENTE" ? p.bloqueo ?? "Pendiente de iniciar" : ETIQUETA_ESTADO_PASO[p.estado] })),
    ...(siguiente ? [...new Set(siguiente.pasos.filter((p) => p.estado === "PENDIENTE" && p.bloqueo).map((p) => p.bloqueo!))].map((m) => ({ ok: false, t: m, d: `Requisito de ${siguiente.nombre}` })) : []),
  ];

  return (
    <div className="clp-proceso">
      <nav className="clp-card clp-fases-nav" aria-label="Fases del proceso">
        {resumen.map((r) => (
          <button key={r.fase} type="button" className={r.completa ? "hecha" : ""} aria-current={r.fase === sel.fase} onClick={() => alElegirFase(r.fase)}>
            <span className={`clp-fn-ico ${r.completa ? "ok" : r.fase === op.fase ? "act" : r.bloqueada ? "lock" : ""}`}>{r.completa ? <Check aria-hidden /> : r.bloqueada ? <Lock aria-hidden /> : r.fase}</span>
            <span className="clp-fn-nom">{r.nombre}<small>{r.estado}</small></span>
            <span className="clp-fn-cnt">{r.hechos}/{r.total}</span>
          </button>
        ))}
      </nav>

      <div className="clp-proceso-cont">
        <div className="clp-eta-bar">
          <span className="clp-eta-titulo">Proceso de esta operación · {op.tipo === "IMPO" ? "Importación" : "Exportación"}</span>
          <span className="clp-leyenda">
            <span><i className="tuyas" />Tus etapas</span>
            <span><i className="nuevas" />Pasos nuevos del proceso</span>
            <span><Lock aria-hidden />Bloqueado hasta cumplir lo anterior</span>
          </span>
        </div>
        <section className="clp-card clp-eta-tabla">
          <div className="clp-dt-scroll !max-h-none">
            <table className="clp-dt-tabla">
              <thead>
                <tr><th className="w-10">#</th><th>Paso</th><th>Estado</th><th>Inicio</th><th>Fin</th><th>SLA</th><th>Proveedor / Responsable</th><th className="text-right">Acción</th></tr>
              </thead>
              <tbody>
                <tr className="clp-fila-fase">
                  <td colSpan={8}>
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="clp-fila-fase-n">{sel.fase}</span><span>{sel.nombre}</span>
                      <span className="font-medium text-slate-500">{sel.hechos}/{sel.total}</span>
                      {sel.pasos.find((p) => p.bloqueo && p.estado === "PENDIENTE")?.bloqueo ? <span className="clp-candado"><Lock className="h-3 w-3" />{sel.pasos.find((p) => p.bloqueo && p.estado === "PENDIENTE")!.bloqueo}</span> : null}
                    </span>
                  </td>
                </tr>
                {sel.fase === 1 ? (
                  <>
                    <tr>
                      <td className="text-slate-500">{++numero}</td>
                      <td><div className="clp-paso-nombre clp-paso-nuevo font-semibold">Asignar cliente e importador</div></td>
                      <td><PillPaso estado={faseUnoClienteOk ? "COMPLETADO" : "PENDIENTE"} /></td>
                      <td colSpan={4} className="text-sm text-slate-500">{faseUnoClienteOk ? `${op.cliente!.folio} · importador ${op.importador!.folio}` : "Se completa en Datos del embarque."}</td>
                      <td />
                    </tr>
                    <tr>
                      <td className="text-slate-500">{++numero}</td>
                      <td><div className="clp-paso-nombre clp-paso-nuevo font-semibold">Recepción y aprobación de documentos</div></td>
                      <td><PillPaso estado={docsFaseUno} /></td>
                      <td colSpan={4} className="text-sm text-slate-500">Se completa al aprobar los documentos obligatorios en Documentación.</td>
                      <td />
                    </tr>
                  </>
                ) : null}
                {sel.pasos.map((p) => (
                  <tr key={p.id} className={p.estado === "NO_APLICA" ? "opacity-60" : ""}>
                    <td className="text-slate-500">{++numero}</td>
                    <td>
                      <div className={`clp-paso-nombre ${PASOS_NUEVOS.includes(p.clave) ? "clp-paso-nuevo" : ""}`}>
                        <div className={`font-semibold ${p.estado === "NO_APLICA" ? "line-through decoration-slate-300" : ""}`}>{p.nombre}</div>
                        {p.descripcion ? <div className="text-xs text-slate-500">{p.descripcion}</div> : null}
                      </div>
                    </td>
                    <td><PillPaso estado={p.estado} /></td>
                    <td className="text-sm tabular-nums text-slate-500"><FechaHora iso={p.fechaInicio} /></td>
                    <td className="text-sm tabular-nums text-slate-500"><FechaHora iso={p.fechaFin} /></td>
                    <td className="whitespace-nowrap text-sm"><Sla p={p} /></td>
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
                    <td><div className="flex justify-end gap-1.5 whitespace-nowrap">{botones(p)}</div></td>
                  </tr>
                ))}
                {sel.fase !== 1 && sel.pasos.length === 0 ? <tr><td colSpan={8} className="text-sm text-slate-500">Esta fase no tiene pasos activos para esta operación.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="clp-card clp-fase-info" aria-label={`Información de la fase ${sel.fase}`}>
          <div><div className="clp-fi-t">Qué se hace en esta fase</div><div className="clp-fi-txt">{info.hace}</div></div>
          <div>
            <div className="clp-fi-t">Documentos que pide</div>
            <div className="clp-fi-docs">{docsDeFase.length ? docsDeFase.map((d) => <span key={d.id} className={d.estado === "APROBADO" ? "ok" : ""}>{d.estado === "APROBADO" ? "✓ " : ""}{d.nombre}</span>) : <span>Sin documentos nuevos</span>}</div>
          </div>
          <div><div className="clp-fi-t">Al completarla</div><div className="clp-fi-txt">{info.habilita}</div></div>
          <div>
            <div className="clp-fi-t">Movimientos de la fase</div>
            {movimientos.length ? <ol className="clp-fi-mov">{movimientos.map((m) => <li key={m.id}>{m.descripcion}<small>{m.usuario} · {formatoFechaHora(m.fecha)}</small></li>)}</ol> : <div className="clp-fi-vacio">Sin movimientos todavía.</div>}
          </div>
          <div className="clp-fi-sig">
            <div className="clp-fi-t">{siguiente ? `Para avanzar a ${siguiente.fase}. ${siguiente.nombre}` : "Para cerrar la operación"}</div>
            <ul className="clp-fi-req">{requisitos.map((x) => <li key={x.t}><i className={x.ok ? "ok" : ""}>{x.ok ? "✓" : ""}</i><div>{x.t}<small>{x.d}</small></div></li>)}</ul>
          </div>
        </section>
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
    </div>
  );
}
