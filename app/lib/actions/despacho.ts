'use server';

import prisma from '@/lib/prisma';
import { uploadDocument } from '@/app/lib/actions/storage';
import { Prisma } from '@prisma/client';
import {
  OperationClientOption,
  OperationDocumentKey,
  OperationLayoutData,
  OperationStageState,
} from '@/app/components/trafico/types';

const operationInclude = Prisma.validator<Prisma.TraficoDefaultArgs>()({
  include: {
    cliente: true,
    pasos: {
      include: { paso: true },
      orderBy: { createdAt: 'asc' },
    },
    documento: true,
    contenedores: true,
  },
});

export type OperationWithRelations = Prisma.TraficoGetPayload<typeof operationInclude>;

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

const documentoFieldMap: Record<
  OperationDocumentKey,
  { existeField: keyof Prisma.DocumentoUpdateInput; urlField: keyof Prisma.DocumentoUpdateInput }
> = {
  FACTURA: { existeField: 'facturaExiste', urlField: 'facturaUrl' },
  BL: { existeField: 'blExiste', urlField: 'blUrl' },
  PL: { existeField: 'plExiste', urlField: 'plUrl' },
  CO: { existeField: 'coExiste', urlField: 'coUrl' },
  PERMISOS: { existeField: 'permisosExiste', urlField: 'permisosUrl' },
  CM: { existeField: 'cmExiste', urlField: 'cmUrl' },
  HT: { existeField: 'htExiste', urlField: 'htUrl' },
  HS: { existeField: 'hsExiste', urlField: 'hsUrl' },
  FOTOS: { existeField: 'fotosExiste', urlField: 'fotosUrl' },
  OTROS: { existeField: 'otrosExiste', urlField: 'otrosUrl' },
};

const documentoFieldLookup = documentoFieldMap;

export async function obtenerClientesOperacion(): Promise<OperationClientOption[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { folio: 'desc' },
    select: {
      id: true,
      folio: true,
      razonSocial: true,
      rfc: true,
    },
  });

  return clientes;
}

export async function obtenerOperacionDespacho(traficoId?: string): Promise<OperationLayoutData | null> {
  const operation = await prisma.trafico.findFirst({
    where: traficoId ? { id: traficoId } : undefined,
    orderBy: traficoId ? undefined : { createdAt: 'desc' },
    ...operationInclude,
  });

  return operation;
}

export async function asignarClienteDespacho(traficoId: string, clienteId: number): Promise<DespachoActionResult> {
  try {
    await prisma.trafico.update({
      where: { id: traficoId },
      data: { clienteId },
    });

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
    const resultado = await prisma.$transaction(async (tx) => {
      const existente = await tx.traficoPaso.findUnique({
        where: {
          traficoId_pasoId: {
            traficoId: input.traficoId,
            pasoId: input.pasoId,
          },
        },
      });

      if (input.estado === 'pendiente') {
        if (existente) {
          await tx.traficoPaso.delete({
            where: {
              traficoId_pasoId: {
                traficoId: input.traficoId,
                pasoId: input.pasoId,
              },
            },
          });
        }

        return {
          fechaInicio: null,
          fechaFin: null,
          tiempoInvertido: null,
        };
      }

      const now = new Date();
      const fechaInicio = existente?.fechaInicio ?? now;
      const fechaFin = input.estado === 'completado' ? now : null;
      const tiempoInvertido = fechaFin ? Math.max(0, Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 1000)) : null;

      const upserted = await tx.traficoPaso.upsert({
        where: {
          traficoId_pasoId: {
            traficoId: input.traficoId,
            pasoId: input.pasoId,
          },
        },
        update: {
          fechaInicio,
          fechaFin,
          tiempoInvertido,
        },
        create: {
          traficoId: input.traficoId,
          pasoId: input.pasoId,
          fechaInicio,
          fechaFin,
          tiempoInvertido,
        },
      });

      return {
        fechaInicio: upserted.fechaInicio,
        fechaFin: upserted.fechaFin,
        tiempoInvertido: upserted.tiempoInvertido,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

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

export async function subirDocumentoOperacion(input: {
  traficoId: string;
  documento: OperationDocumentKey;
  formData: FormData;
}): Promise<DespachoActionResult<{ url: string }>> {
  try {
    const upload = await uploadDocument(input.formData);

    if (!upload.success) {
      return {
        success: false,
        message: upload.message,
      };
    }

    const fieldMap = documentoFieldLookup[input.documento];

    await prisma.$transaction(async (tx) => {
      const existeDocumento = await tx.documento.findUnique({
        where: { traficoId: input.traficoId },
      });

      if (existeDocumento) {
        await tx.documento.update({
          where: { traficoId: input.traficoId },
          data: {
            [fieldMap.existeField]: true,
            [fieldMap.urlField]: upload.url,
          },
        });
        return;
      }

      await tx.documento.create({
        data: {
          traficoId: input.traficoId,
          [fieldMap.existeField]: true,
          [fieldMap.urlField]: upload.url,
        },
      });
    });

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

export async function validarDocumentoOperacion(input: {
  traficoId: string;
  documento: OperationDocumentKey;
  aprobado: boolean;
}): Promise<DespachoActionResult> {
  try {
    const fieldMap = documentoFieldLookup[input.documento];

    await prisma.$transaction(async (tx) => {
      const existeDocumento = await tx.documento.findUnique({
        where: { traficoId: input.traficoId },
      });

      if (!existeDocumento) {
        await tx.documento.create({
          data: {
            traficoId: input.traficoId,
            [fieldMap.existeField]: input.aprobado,
          },
        });
        return;
      }

      await tx.documento.update({
        where: { traficoId: input.traficoId },
        data: {
          [fieldMap.existeField]: input.aprobado,
        },
      });
    });

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
