'use server';

import { uploadDocument } from '@/shared/actions/storage';
import {
  OperationClientOption,
  OperationDocumentKey,
  OperationLayoutData,
  OperationStageState,
} from '../types';
import {
  dalActualizarEstadoEtapa,
  dalAsignarClienteOperacion,
  dalObtenerClientesOperacion,
  dalObtenerOperacionDespacho,
  dalValidarDocumentoOperacion,
  dalVincularDocumentoOperacion,
} from '../dal/operaciones-dal';

export type DespachoActionResult<T = void> =
  | {
      success: true;
      message: string;
      data: T;
    }
  | {
      success: false;
      message: string;
      data?: never;
    };

export async function obtenerClientesOperacion(): Promise<OperationClientOption[]> {
  return await dalObtenerClientesOperacion();
}

export async function obtenerOperacionDespacho(traficoId?: string): Promise<OperationLayoutData | null> {
  return await dalObtenerOperacionDespacho(traficoId);
}

export async function asignarClienteDespacho(
  traficoId: string,
  clienteId: number
): Promise<DespachoActionResult> {
  try {
    await dalAsignarClienteOperacion(traficoId, clienteId);

    return {
      success: true,
      message: 'Cliente asignado correctamente a la operación.',
      data: undefined,
    };
  } catch (error) {
    console.error('Error asignando cliente:', error);
    return {
      success: false,
      message: 'No se pudo asignar el cliente a la operación.',
    };
  }
}

export async function actualizarEstadoEtapaDespacho(input: {
  traficoId: string;
  pasoId: string;
  estado: OperationStageState;
}): Promise<
  DespachoActionResult<{
    fechaInicio: Date | null;
    fechaFin: Date | null;
    tiempoInvertido: number | null;
  }>
> {
  try {
    const resultado = await dalActualizarEstadoEtapa(input);

    return {
      success: true,
      message: 'Estado de etapa actualizado correctamente.',
      data: resultado,
    };
  } catch (error) {
    console.error('Error actualizando estado de etapa:', error);
    return {
      success: false,
      message: 'No se pudo actualizar el estado de la etapa.',
    };
  }
}

export async function subirDocumentoOperacion(
  inputOrTraficoId: { traficoId: string; documento: OperationDocumentKey; formData: FormData } | string,
  documentoArg?: OperationDocumentKey,
  formDataArg?: FormData
): Promise<DespachoActionResult<{ url: string }>> {
  try {
    const input =
      typeof inputOrTraficoId === 'string'
        ? {
            traficoId: inputOrTraficoId,
            documento: documentoArg!,
            formData: formDataArg!,
          }
        : inputOrTraficoId;

    const upload = await uploadDocument(input.formData);

    if (!upload.success) {
      return {
        success: false,
        message: upload.message,
      };
    }

    await dalVincularDocumentoOperacion(input.traficoId, input.documento, upload.url);

    return {
      success: true,
      message: 'Documento subido y vinculado correctamente.',
      data: { url: upload.url },
    };
  } catch (error) {
    console.error('Error subiendo documento:', error);
    return {
      success: false,
      message: 'No se pudo subir el documento.',
    };
  }
}

export async function validarDocumentoOperacion(
  inputOrTraficoId: { traficoId: string; documento: OperationDocumentKey; aprobado: boolean } | string,
  documentoArg?: OperationDocumentKey,
  aprobadoArg?: boolean
): Promise<DespachoActionResult> {
  try {
    const input =
      typeof inputOrTraficoId === 'string'
        ? {
            traficoId: inputOrTraficoId,
            documento: documentoArg!,
            aprobado: aprobadoArg!,
          }
        : inputOrTraficoId;

    await dalValidarDocumentoOperacion(input.traficoId, input.documento, input.aprobado);

    return {
      success: true,
      message: input.aprobado ? 'Documento aprobado.' : 'Documento rechazado.',
      data: undefined,
    };
  } catch (error) {
    console.error('Error validando documento:', error);
    return {
      success: false,
      message: 'No se pudo actualizar la validación del documento.',
    };
  }
}

