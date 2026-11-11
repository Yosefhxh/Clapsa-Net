"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ClavePedimento } from "@prisma/client";
import { DataTable, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { useSession } from "@/features/session";
import { formatoFecha } from "@/shared/utils/formato";
import { ETIQUETA_MEDIO, type OpcionCliente, type OperacionResumen } from "../types/vistas";
import { BarraAvance, PillSituacion, Semaforo, TipoClienteBadge, TipoOperacionTag } from "./etiquetas";
import { NuevaOperacionDrawer } from "./NuevaOperacionDrawer";

interface Props {
  operaciones: OperacionResumen[];
  opciones: OpcionCliente[];
  aduanas: { clave: string; nombre: string }[];
  claves: ClavePedimento[];
}

export function BandejaOperaciones({ operaciones, opciones, aduanas, claves }: Props) {
  const router = useRouter();
  const { puede } = useSession();
  const [nueva, setNueva] = useState(false);

  const columnas = useMemo<Columna<OperacionResumen>[]>(() => [
    {
      id: "folio", encabezado: "Folio",
      celda: (o) => <Link href={`/operaciones/${o.id}`} className="clp-mono font-semibold text-aduanaBlue hover:underline">{o.folio}</Link>,
      orden: (o) => o.folio, csv: (o) => o.folio,
    },
    { id: "tipo", encabezado: "Tipo", celda: (o) => <TipoOperacionTag tipo={o.tipo} />, orden: (o) => o.tipo, csv: (o) => o.tipo },
    {
      id: "cliente", encabezado: "Cliente",
      celda: (o) => o.clienteNombre ? (
        <div className="max-w-[18rem]">
          <div className="truncate font-medium">{o.clienteNombre} {o.clienteTipo ? <TipoClienteBadge tipo={o.clienteTipo} /> : null}</div>
          {o.clienteTipo === "FORWARDER" && o.importadorNombre ? <div className="truncate text-xs text-slate-500">Importador: {o.importadorNombre}</div> : null}
        </div>
      ) : <span className="text-slate-500">Sin cliente</span>,
      orden: (o) => o.clienteNombre, csv: (o) => o.clienteNombre,
    },
    { id: "aduana", encabezado: "Aduana", celda: (o) => o.aduana, orden: (o) => o.aduana, csv: (o) => o.aduana },
    { id: "medio", encabezado: "Medio", celda: (o) => ETIQUETA_MEDIO[o.medio], orden: (o) => o.medio, csv: (o) => ETIQUETA_MEDIO[o.medio] },
    { id: "pedimento", encabezado: "Pedimento", celda: (o) => <span className="clp-mono">{o.numeroPedimento ?? "—"}</span>, orden: (o) => o.numeroPedimento, csv: (o) => o.numeroPedimento },
    { id: "eta", encabezado: "ETA", celda: (o) => formatoFecha(o.eta), orden: (o) => o.eta, csv: (o) => formatoFecha(o.eta), alinear: "der" },
    { id: "avance", encabezado: "Avance", celda: (o) => <BarraAvance {...o.avance} />, orden: (o) => o.avance.porcentaje, csv: (o) => `${o.avance.completados}/${o.avance.total}` },
    { id: "semaforo", encabezado: "Semáforo", celda: (o) => <Semaforo valor={o.semaforo} />, orden: (o) => o.semaforo, csv: (o) => o.semaforo ?? "" },
    { id: "situacion", encabezado: "Situación", celda: (o) => <PillSituacion situacion={o.situacion} />, orden: (o) => o.situacion, csv: (o) => o.situacion },
  ], []);

  const filtros = useMemo<FiltroRapido<OperacionResumen>[]>(() => [
    { id: "abiertas", etiqueta: "Abiertas", cumple: (o) => o.estado !== "CERRADA" },
    { id: "espera", etiqueta: "En espera de cliente", cumple: (o) => o.estado === "EN_ESPERA_CLIENTE" },
    { id: "pagar", etiqueta: "Por pagar pedimento", cumple: (o) => o.situacion === "Por pagar pedimento" },
    { id: "rojo", etiqueta: "Reconocimiento", cumple: (o) => o.situacion === "En reconocimiento" },
    { id: "impo", etiqueta: "Importación", cumple: (o) => o.tipo === "IMPO" },
    { id: "expo", etiqueta: "Exportación", cumple: (o) => o.tipo === "EXPO" },
    { id: "cerradas", etiqueta: "Cerradas", cumple: (o) => o.estado === "CERRADA" },
  ], []);

  return (
    <>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="clp-page-title">Operaciones</h1>
        </div>
        {puede("operaciones.operar") ? (
          <button type="button" className="clp-btn clp-btn-primary" onClick={() => setNueva(true)}>
            <Plus className="h-4 w-4" /> Nueva operación
          </button>
        ) : null}
      </div>

      <DataTable
        filas={operaciones}
        columnas={columnas}
        idFila={(o) => o.id}
        textoBusqueda={(o) => [o.folio, o.folioManual, o.clienteNombre, o.importadorNombre, o.numeroPedimento, o.aduana, ...o.contenedores].filter(Boolean).join(" ")}
        placeholderBusqueda="Folio, cliente, pedimento o contenedor"
        nombreRegistros="operaciones"
        filtros={filtros}
        ordenInicial={{ columna: "folio", dir: "desc" }}
        exportarComo="operaciones"
        alPicarFila={(o) => router.push(`/operaciones/${o.id}`)}
        vacio={operaciones.length === 0 ? "Aún no hay operaciones. Crea la primera con “Nueva operación”." : undefined}
      />

      <NuevaOperacionDrawer open={nueva} onClose={() => setNueva(false)} opciones={opciones} aduanas={aduanas} claves={claves} />
    </>
  );
}
