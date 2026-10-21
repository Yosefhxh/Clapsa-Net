import { OperationLayout } from "@/app/components/trafico/OperationLayout";
import { OperationGlobalStatus, OperationLayoutData } from "@/app/components/trafico/types";
import {
  asignarClienteDespacho,
  actualizarEstadoEtapaDespacho,
  obtenerClientesOperacion,
  obtenerOperacionDespacho,
  subirDocumentoOperacion,
  validarDocumentoOperacion,
} from "@/app/lib/actions/despacho";
import {
  construirBitacoraOperacion,
  construirDocumentRows,
  construirResumenOperacion,
  construirStageRows,
} from "@/app/lib/utils/despacho";
import { HitoOperativo } from "@prisma/client";

function buildFallbackOperation(): OperationLayoutData {
  const now = new Date();
  const pasoLabels = [
    "Previo en Origen",
    "Flete Marítimo",
    "Flete Aéreo",
    "F.T. Intermodal",
    "Despacho Aduanero",
    "F.T. Nacional",
    "UVA",
    "Almacenaje",
    "Maniobras en Almacén",
    "Maniobras Portuarias",
    "Otras",
  ];

  return {
    id: "draft-operacion",
    clienteId: null,
    tipoOperacion: "IMPO",
    aduana: "Manzanillo",
    eta: now,
    etd: null,
    folioManual: null,
    referenciaAutomatica: "CLPD-26-00001",
    createdAt: now,
    updatedAt: now,
    cliente: null,
    contenedores: [],
    documento: null,
    pasos: pasoLabels.map((nombre, index) => ({
      id: `draft-step-${index + 1}`,
      traficoId: "draft-operacion",
      pasoId: `draft-paso-${index + 1}`,
      fechaInicio: null,
      fechaFin: null,
      tiempoInvertido: null,
      createdAt: now,
      updatedAt: now,
      paso: {
        id: `draft-paso-${index + 1}`,
        clave:
          [
            HitoOperativo.PREVIO_ORIGEN,
            HitoOperativo.FLETE_MARITIMO,
            HitoOperativo.FLETE_AEREO,
            HitoOperativo.FT_INTERMODAL,
            HitoOperativo.DESPACHO_ADUANERO,
            HitoOperativo.FT_NACIONAL,
            HitoOperativo.UVA,
            HitoOperativo.ALMACENAJE,
            HitoOperativo.MANIOBRAS_ALMACEN,
            HitoOperativo.MANIOBRAS_PORTUARIAS,
            HitoOperativo.OTRAS,
          ][index],
        nombre,
        orden: index + 1,
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
    })),
  } as OperationLayoutData;
}

function resolveEstadoGlobal(etapas: ReturnType<typeof construirStageRows>): OperationGlobalStatus {
  if (etapas.length === 0) return "detenido";
  if (etapas.every((etapa) => etapa.estado === "completado")) return "finalizado";
  if (etapas.some((etapa) => etapa.estado === "en-proceso")) return "en-proceso";
  return "detenido";
}

export default async function DespachoAduanalPage() {
  const [clientes, operationFromDb] = await Promise.all([
    obtenerClientesOperacion(),
    obtenerOperacionDespacho(),
  ]);

  const operation = operationFromDb ?? buildFallbackOperation();
  const resumen = construirResumenOperacion(operation);
  const etapas = construirStageRows(operation);
  const documentos = construirDocumentRows(operation);
  const historial = construirBitacoraOperacion(operation);
  const estadoGlobal = resolveEstadoGlobal(etapas);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Despacho Aduanal</h1>
            <p className="text-slate-500 text-sm">Seguimiento operativo del pedimento y avance por etapa.</p>
          </div>
        </div>
      </div>

      <OperationLayout
        operation={operation}
        clientes={clientes}
        documentos={documentos}
        historial={historial}
        resumen={{
          ...resumen,
          etapasCompletadas: resumen.etapasCompletadas,
          etapasTotales: resumen.etapasTotales,
        }}
        etapas={etapas}
        estadoGlobal={estadoGlobal}
        onAssignCliente={asignarClienteDespacho}
        onChangeEstadoEtapa={actualizarEstadoEtapaDespacho}
        onUploadDocumento={subirDocumentoOperacion}
        onValidarDocumento={validarDocumentoOperacion}
      />
    </div>
  );
}
