"use client";

import { useState } from "react";
import type { ClavePedimento, HitoOperativo } from "@prisma/client";
import { formatoMoneda } from "@/shared/utils/formato";
import type { OpcionCliente, OperacionDetalle } from "../../types/vistas";
import type { ProveedorParaPaso } from "@/features/proveedores/types";
import { EncabezadoOperacion } from "./EncabezadoOperacion";
import { TabDetalles } from "./TabDetalles";
import { TabDocumentos } from "./TabDocumentos";
import { TabEtapas } from "./TabEtapas";
import { TabCuentaGastos, calcularCuenta } from "./TabCuentaGastos";
import { TabBitacora } from "./TabBitacora";

type Tab = "detalles" | "documentos" | "etapas" | "cuenta" | "bitacora";

interface Props {
  operacion: OperacionDetalle;
  opciones: OpcionCliente[];
  claves: ClavePedimento[];
  proveedores: Partial<Record<HitoOperativo, ProveedorParaPaso[]>>;
}

export function OperacionDetalleVista({ operacion: op, opciones, claves, proveedores }: Props) {
  const [tab, setTab] = useState<Tab>("detalles");
  const docsAprobados = op.documentos.filter((d) => d.estado === "APROBADO").length;
  const cuenta = calcularCuenta(op);

  const tabs: { id: Tab; etiqueta: string; contador?: string }[] = [
    { id: "detalles", etiqueta: "Detalles del Embarque" },
    { id: "documentos", etiqueta: "Documentación", contador: `${docsAprobados}/${op.documentos.length}` },
    { id: "etapas", etiqueta: "Seguimiento y Etapas", contador: `${op.avance.completados}/${op.avance.total}` },
    { id: "cuenta", etiqueta: "Cuenta de gastos", contador: formatoMoneda(cuenta.total).replace(/\.00$/, "") },
    { id: "bitacora", etiqueta: "Bitácora" },
  ];

  return (
    <div className="space-y-1">
      <div className="clp-page-head">
        <h1 className="clp-page-title">Despacho Aduanal</h1>
        <p className="clp-page-sub mt-0.5 text-sm">Seguimiento operativo del pedimento y avance por fase.</p>
      </div>

      <EncabezadoOperacion op={op} />

      <nav className="clp-tabs-op" role="tablist" aria-label="Secciones de la operación">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`clp-tab inline-flex items-center gap-2 ${tab === t.id ? "clp-tab-activa" : ""}`} onClick={() => setTab(t.id)}>
            {t.etiqueta}
            {t.contador ? <span className="clp-contador">{t.contador}</span> : null}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {tab === "detalles" ? <TabDetalles op={op} opciones={opciones} claves={claves} /> : null}
        {tab === "documentos" ? <TabDocumentos op={op} /> : null}
        {tab === "etapas" ? <TabEtapas op={op} proveedores={proveedores} /> : null}
        {tab === "cuenta" ? <TabCuentaGastos op={op} /> : null}
        {tab === "bitacora" ? <TabBitacora eventos={op.eventos} /> : null}
      </div>
    </div>
  );
}
