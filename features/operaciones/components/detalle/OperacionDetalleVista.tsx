"use client";

import { useState } from "react";
import type { ClavePedimento, HitoOperativo } from "@prisma/client";
import { formatoMoneda } from "@/shared/utils/formato";
import type { OpcionCliente, OperacionDetalle } from "../../types/vistas";
import type { ProveedorParaPaso } from "@/features/proveedores/types";
import { BarraOperacion } from "./BarraOperacion";
import { TabDetalles } from "./TabDetalles";
import { TabDocumentos } from "./TabDocumentos";
import { TabEtapas } from "./TabEtapas";
import { TabCuentaGastos, calcularCuenta } from "./TabCuentaGastos";
import { TabBitacora } from "./TabBitacora";

type Tab = "proceso" | "datos" | "documentos" | "cuenta" | "bitacora";

interface Props {
  operacion: OperacionDetalle;
  opciones: OpcionCliente[];
  claves: ClavePedimento[];
  proveedores: Partial<Record<HitoOperativo, ProveedorParaPaso[]>>;
}

export function OperacionDetalleVista({ operacion: op, opciones, claves, proveedores }: Props) {
  const [tab, setTab] = useState<Tab>("proceso");
  const [fase, setFase] = useState(op.fase);
  const docsAprobados = op.documentos.filter((d) => d.estado === "APROBADO").length;
  const cuenta = calcularCuenta(op);

  const tabs: { id: Tab; etiqueta: string; contador?: string }[] = [
    { id: "proceso", etiqueta: "Proceso", contador: `${op.avance.completados}/${op.avance.total}` },
    { id: "datos", etiqueta: "Datos del embarque" },
    { id: "documentos", etiqueta: "Documentación", contador: `${docsAprobados}/${op.documentos.length}` },
    { id: "cuenta", etiqueta: "Cuenta de gastos", contador: formatoMoneda(cuenta.total).replace(/\.00$/, "") },
    { id: "bitacora", etiqueta: "Bitácora" },
  ];

  // El botón "Próximo paso" lleva a donde se hace: datos, documentos, la fase del paso o la cuenta.
  const irAlProximo = () => {
    if (op.estado === "CERRADA") return setTab("cuenta");
    if (!op.cliente || !op.importador) return setTab("datos");
    if (op.proximoPaso === "Aprobar documentos obligatorios") return setTab("documentos");
    const paso = op.pasos.find((p) => p.nombre === op.proximoPaso);
    setFase(paso?.fase ?? op.fase);
    setTab("proceso");
  };

  return (
    <div className="clp-op-detalle">
      <BarraOperacion op={op} alProximo={irAlProximo} />

      <div className="clp-op-tabs">
        <nav className="clp-tabs2" role="tablist" aria-label="Secciones de la operación">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.etiqueta}
              {t.contador ? <span className="clp-cnt">{t.contador}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <div role="tabpanel" className="clp-op-panel" key={tab}>
        {tab === "proceso" ? <TabEtapas op={op} proveedores={proveedores} fase={fase} alElegirFase={setFase} /> : null}
        {tab === "datos" ? <TabDetalles op={op} opciones={opciones} claves={claves} /> : null}
        {tab === "documentos" ? <TabDocumentos op={op} /> : null}
        {tab === "cuenta" ? <TabCuentaGastos op={op} /> : null}
        {tab === "bitacora" ? <TabBitacora eventos={op.eventos} /> : null}
      </div>
    </div>
  );
}
