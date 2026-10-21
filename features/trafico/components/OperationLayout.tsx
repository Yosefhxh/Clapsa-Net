"use client";

import { useMemo, useState } from "react";
import { OperationAuditTab } from "./OperationAuditTab";
import { OperationDocumentationTab } from "./OperationDocumentationTab";
import { OperationHeader } from "./OperationHeader";
import { OperationSummaryTab } from "./OperationSummaryTab";
import { OperationTabsNav } from "./OperationTabsNav";
import { OperationTrackingTab } from "./OperationTrackingTab";
import {
  OperationClientOption as ClientOption,
  OperationAuditItem,
  OperationDocumentKey,
  OperationDocumentRow,
  OperationGlobalStatus,
  OperationLayoutData,
  OperationStageState,
  OperationStageView,
  OperationSummaryData,
  OperationTabId,
} from "@/features/trafico/types/trafico-types";

export interface OperationLayoutProps {
  operation: OperationLayoutData;
  clientes: ClientOption[];
  documentos: OperationDocumentRow[];
  historial: OperationAuditItem[];
  resumen: OperationSummaryData & { etapasCompletadas: number; etapasTotales: number };
  etapas: OperationStageView[];
  estadoGlobal: OperationGlobalStatus;
  onAssignCliente?: (
    traficoId: string,
    clienteId: number,
  ) => Promise<{ success: boolean; message: string }>;
  onChangeEstadoEtapa?: (input: {
    traficoId: string;
    pasoId: string;
    estado: OperationStageState;
  }) => Promise<{ success: boolean; message: string }>;
  onUploadDocumento?: (
    traficoId: string,
    documento: OperationDocumentKey,
    formData: FormData,
  ) => Promise<{ success: boolean; message: string }>;
  onValidarDocumento?: (
    traficoId: string,
    documento: OperationDocumentKey,
    aprobado: boolean,
  ) => Promise<{ success: boolean; message: string }>;
}

export function OperationLayout({
  operation,
  clientes,
  documentos,
  historial,
  resumen,
  etapas,
  estadoGlobal,
  onAssignCliente,
  onChangeEstadoEtapa,
  onUploadDocumento,
  onValidarDocumento,
}: OperationLayoutProps) {
  const [activeTab, setActiveTab] = useState<OperationTabId>("resumen");

  const clienteNombre = operation.cliente?.razonSocial ?? "Sin cliente asignado";

  const header = useMemo(
    () => ({
      folio: operation.referenciaAutomatica,
      clienteNombre,
      etapasCompletadas: resumen.etapasCompletadas,
      etapasTotales: resumen.etapasTotales,
      estadoGlobal,
    }),
    [clienteNombre, estadoGlobal, operation.referenciaAutomatica, resumen.etapasCompletadas, resumen.etapasTotales],
  );

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 py-1">
        <OperationHeader {...header} />
      </div>

      <OperationTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div hidden={activeTab !== "resumen"}>
        <OperationSummaryTab
          traficoId={operation.id}
          clienteActualId={operation.clienteId ?? null}
          clientes={clientes}
          resumen={resumen}
          onAssignCliente={onAssignCliente}
        />
      </div>

      <div hidden={activeTab !== "documentacion"}>
        <OperationDocumentationTab
          traficoId={operation.id}
          documentos={documentos}
          onUploadDocumento={onUploadDocumento}
          onValidarDocumento={onValidarDocumento}
        />
      </div>

      <div hidden={activeTab !== "seguimiento"}>
        <OperationTrackingTab traficoId={operation.id} etapas={etapas} onChangeEstado={onChangeEstadoEtapa} />
      </div>

      <div hidden={activeTab !== "bitacora"}>
        <OperationAuditTab historial={historial} />
      </div>
    </section>
  );
}
