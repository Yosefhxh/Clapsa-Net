import {
  documentChecklistByOperacion,
  documentLabels,
  OperationAuditItem,
  OperationDocumentRow,
  OperationLayoutData,
  OperationStageState,
  OperationStageView,
  OperationSummaryData,
} from '@/app/components/trafico/types';

function formatDateTime(date: Date | null | undefined) {
  if (!date) return '-';

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapStageState(fechaInicio: Date | null, fechaFin: Date | null): OperationStageState {
  if (fechaFin) return 'completado';
  if (fechaInicio) return 'en-proceso';
  return 'pendiente';
}

function calcularSiguientePaso(operation: OperationLayoutData) {
  const siguientePendiente = operation.pasos.find((item) => !item.fechaFin);
  return siguientePendiente?.paso.nombre ?? 'Todas las etapas se encuentran completadas.';
}

export function construirResumenOperacion(operation: OperationLayoutData): OperationSummaryData & {
  etapasCompletadas: number;
  etapasTotales: number;
} {
  const docRows = construirDocumentRows(operation);
  const estados = operation.pasos.map((item) => mapStageState(item.fechaInicio, item.fechaFin));
  const completadas = estados.filter((estado) => estado === 'completado').length;
  const siguientePaso = calcularSiguientePaso(operation);

  return {
    aduana: operation.aduana,
    tipoOperacion: operation.tipoOperacion,
    eta: operation.eta ? formatDateTime(operation.eta) : null,
    rfc: operation.cliente?.rfc ?? '-',
    proximoPaso: siguientePaso,
    alertasPendientes: [
      operation.cliente ? '' : 'Sin cliente asignado.',
      docRows.some((doc) => !doc.validado) ? 'Hay documentos pendientes de validación.' : '',
      operation.pasos.length === 0 ? 'No hay etapas registradas todavía.' : '',
    ].filter(Boolean),
    etapasCompletadas: completadas,
    etapasTotales: operation.pasos.length,
  };
}

export function construirStageRows(operation: OperationLayoutData): OperationStageView[] {
  return operation.pasos.map((item) => ({
    id: item.id,
    pasoId: item.pasoId,
    nombre: item.paso.nombre,
    estado: mapStageState(item.fechaInicio, item.fechaFin),
    fechaInicio: item.fechaInicio ? formatDateTime(item.fechaInicio) : null,
    fechaFin: item.fechaFin ? formatDateTime(item.fechaFin) : null,
    tiempoInvertido: item.tiempoInvertido,
  }));
}

export function construirDocumentRows(operation: OperationLayoutData): OperationDocumentRow[] {
  const documento = operation.documento;
  const fecha = operation.updatedAt ?? operation.createdAt;

  return (documentChecklistByOperacion[operation.tipoOperacion] ?? []).map((key) => {
    const uploaded = documento ? Boolean(documento[`${key.toLowerCase()}Existe` as keyof typeof documento]) : false;
    const url = documento ? String(documento[`${key.toLowerCase()}Url` as keyof typeof documento] ?? '') : null;

    return {
      id: `${operation.id}-${key}`,
      key,
      nombre: documentLabels[key],
      fechaSubida: uploaded ? formatDateTime(fecha) : null,
      subidoPor: uploaded ? 'Sistema' : '-',
      url: url || null,
      validado: uploaded,
    };
  });
}

export function construirBitacoraOperacion(operation: OperationLayoutData): OperationAuditItem[] {
  const historial: OperationAuditItem[] = [];

  historial.push({
    id: `${operation.id}-created`,
    actor: 'Sistema',
    accion: `Operación creada con folio ${operation.referenciaAutomatica}`,
    fecha: formatDateTime(operation.createdAt),
  });

  operation.pasos.forEach((item) => {
    if (item.fechaInicio) {
      historial.push({
        id: `${item.id}-start`,
        actor: 'Despachador',
        accion: `Etapa ${item.paso.nombre} iniciada`,
        fecha: formatDateTime(item.fechaInicio),
        valorAnterior: 'Pendiente',
        valorNuevo: 'En proceso',
      });
    }

    if (item.fechaFin) {
      historial.push({
        id: `${item.id}-stop`,
        actor: 'Despachador',
        accion: `Etapa ${item.paso.nombre} completada`,
        fecha: formatDateTime(item.fechaFin),
        valorAnterior: 'En proceso',
        valorNuevo: 'Completado',
      });
    }
  });

  if (operation.documento) {
    Object.entries(operation.documento).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        historial.push({
          id: `${operation.id}-${key}`,
          actor: 'Sistema',
          accion: `Documento ${key} actualizado`,
          fecha: formatDateTime(operation.documento!.updatedAt),
        });
      }
    });
  }

  return historial.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
