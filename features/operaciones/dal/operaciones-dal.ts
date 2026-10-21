import prisma from "@/shared/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  OperationClientOption,
  OperationDocumentKey,
  OperationLayoutData,
  OperationStageState,
} from "../types";

export const operationInclude = Prisma.validator<Prisma.TraficoDefaultArgs>()({
  include: {
    cliente: true,
    pasos: {
      include: { paso: true },
      orderBy: { createdAt: "asc" },
    },
    documento: true,
    contenedores: true,
  },
});

export type OperationWithRelations = Prisma.TraficoGetPayload<typeof operationInclude>;

const documentoFieldMap: Record<
  OperationDocumentKey,
  { existeField: keyof Prisma.DocumentoUpdateInput; urlField: keyof Prisma.DocumentoUpdateInput }
> = {
  FACTURA: { existeField: "facturaExiste", urlField: "facturaUrl" },
  BL: { existeField: "blExiste", urlField: "blUrl" },
  PL: { existeField: "plExiste", urlField: "plUrl" },
  CO: { existeField: "coExiste", urlField: "coUrl" },
  PERMISOS: { existeField: "permisosExiste", urlField: "permisosUrl" },
  CM: { existeField: "cmExiste", urlField: "cmUrl" },
  HT: { existeField: "htExiste", urlField: "htUrl" },
  HS: { existeField: "hsExiste", urlField: "hsUrl" },
  FOTOS: { existeField: "fotosExiste", urlField: "fotosUrl" },
  OTROS: { existeField: "otrosExiste", urlField: "otrosUrl" },
};

/**
 * DAL: Consulta y retorna clientes con contrato plano para selección en operaciones.
 */
export async function dalObtenerClientesOperacion(): Promise<OperationClientOption[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { folio: "desc" },
    select: {
      id: true,
      folio: true,
      razonSocial: true,
      rfc: true,
    },
  });

  return clientes;
}

/**
 * DAL: Obtiene el registro de tráfico/operación con todas sus relaciones resueltas.
 */
export async function dalObtenerOperacionDespacho(traficoId?: string): Promise<OperationLayoutData | null> {
  const operation = await prisma.trafico.findFirst({
    where: traficoId ? { id: traficoId } : undefined,
    orderBy: traficoId ? undefined : { createdAt: "desc" },
    ...operationInclude,
  });

  return operation;
}

/**
 * DAL: Actualiza la asignación de cliente a una operación.
 */
export async function dalAsignarClienteOperacion(traficoId: string, clienteId: number): Promise<void> {
  await prisma.trafico.update({
    where: { id: traficoId },
    data: { clienteId },
  });
}

export interface ActualizarEtapaResult {
  fechaInicio: Date | null;
  fechaFin: Date | null;
  tiempoInvertido: number | null;
}

/**
 * DAL: Transacción serializable para actualizar el estado del hito operativo / etapa.
 */
export async function dalActualizarEstadoEtapa(input: {
  traficoId: string;
  pasoId: string;
  estado: OperationStageState;
}): Promise<ActualizarEtapaResult> {
  return await prisma.$transaction(
    async (tx) => {
      const existente = await tx.traficoPaso.findUnique({
        where: {
          traficoId_pasoId: {
            traficoId: input.traficoId,
            pasoId: input.pasoId,
          },
        },
      });

      if (input.estado === "pendiente") {
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
      const fechaFin = input.estado === "completado" ? now : null;
      const tiempoInvertido = fechaFin
        ? Math.max(0, Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 1000))
        : null;

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
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

/**
 * DAL: Registra o actualiza la vinculación de un documento cargado en la BD.
 */
export async function dalVincularDocumentoOperacion(
  traficoId: string,
  documento: OperationDocumentKey,
  url: string
): Promise<void> {
  const fieldMap = documentoFieldMap[documento];

  await prisma.$transaction(async (tx) => {
    const existeDocumento = await tx.documento.findUnique({
      where: { traficoId },
    });

    if (existeDocumento) {
      await tx.documento.update({
        where: { traficoId },
        data: {
          [fieldMap.existeField]: true,
          [fieldMap.urlField]: url,
        },
      });
      return;
    }

    await tx.documento.create({
      data: {
        traficoId,
        [fieldMap.existeField]: true,
        [fieldMap.urlField]: url,
      },
    });
  });
}

/**
 * DAL: Actualiza el estado de validación (aprobado/rechazado) de un documento en la BD.
 */
export async function dalValidarDocumentoOperacion(
  traficoId: string,
  documento: OperationDocumentKey,
  aprobado: boolean
): Promise<void> {
  const fieldMap = documentoFieldMap[documento];

  await prisma.$transaction(async (tx) => {
    const existeDocumento = await tx.documento.findUnique({
      where: { traficoId },
    });

    if (!existeDocumento) {
      await tx.documento.create({
        data: {
          traficoId,
          [fieldMap.existeField]: aprobado,
        },
      });
      return;
    }

    await tx.documento.update({
      where: { traficoId },
      data: {
        [fieldMap.existeField]: aprobado,
      },
    });
  });
}

