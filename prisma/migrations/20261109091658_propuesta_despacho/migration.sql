-- CreateEnum
CREATE TYPE "EstadoPaso" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RECONOCIMIENTO', 'COMPLETADO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE', 'POR_REVISAR', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('FACTURA', 'BL', 'PL', 'CO', 'PERMISOS', 'CM', 'HT', 'HS', 'FOTOS', 'OTROS');

-- CreateEnum
CREATE TYPE "RequisitoDocumento" AS ENUM ('OBLIGATORIO', 'SI_APLICA', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "MedioTransporte" AS ENUM ('MARITIMO', 'AEREO', 'TERRESTRE', 'FERROVIARIO');

-- CreateEnum
CREATE TYPE "Semaforo" AS ENUM ('VERDE', 'ROJO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('OPERACION', 'ASIGNACION', 'DOCUMENTO', 'ETAPA', 'COSTO');

-- CreateEnum
CREATE TYPE "TipoCargo" AS ENUM ('CONTRIBUCION', 'HONORARIO', 'OTRO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HitoOperativo" ADD VALUE 'CLASIFICACION';
ALTER TYPE "HitoOperativo" ADD VALUE 'REVALIDACION_BL';
ALTER TYPE "HitoOperativo" ADD VALUE 'PAGO_CONTRIBUCIONES';
ALTER TYPE "HitoOperativo" ADD VALUE 'MODULACION';
ALTER TYPE "HitoOperativo" ADD VALUE 'CUENTA_GASTOS';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "padronImportadores" BOOLEAN;

-- AlterTable
ALTER TABLE "Paso" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "esServicio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "faseExpo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "faseImpo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "medios" "MedioTransporte"[] DEFAULT ARRAY[]::"MedioTransporte"[],
ADD COLUMN     "ordenExpo" INTEGER,
ADD COLUMN     "slaHoras" INTEGER;

-- AlterTable
ALTER TABLE "Proveedores" ADD COLUMN     "aduanas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Trafico" ADD COLUMN     "blGuia" TEXT,
ADD COLUMN     "cerradaEn" TIMESTAMP(3),
ADD COLUMN     "clavePedimento" TEXT,
ADD COLUMN     "ejecutivoId" INTEGER,
ADD COLUMN     "fracciones" TEXT,
ADD COLUMN     "importadorId" INTEGER,
ADD COLUMN     "incoterm" TEXT,
ADD COLUMN     "medioTransporte" "MedioTransporte" NOT NULL DEFAULT 'MARITIMO',
ADD COLUMN     "monedaFactura" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "naviera" TEXT,
ADD COLUMN     "numeroPedimento" TEXT,
ADD COLUMN     "puertoOrigen" TEXT,
ADD COLUMN     "semaforo" "Semaforo",
ADD COLUMN     "valorFactura" DECIMAL(14,2),
ADD COLUMN     "vendedorExtranjero" TEXT;

-- AlterTable
ALTER TABLE "TraficoPaso" ADD COLUMN     "costo" DECIMAL(14,2),
ADD COLUMN     "estado" "EstadoPaso" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "proveedorId" INTEGER,
ADD COLUMN     "responsableId" INTEGER,
ALTER COLUMN "fechaInicio" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProveedorServicio" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "pasoId" TEXT NOT NULL,
    "tarifaBase" DECIMAL(14,2),

    CONSTRAINT "ProveedorServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoOperacion" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "url" TEXT,
    "nombreArchivo" TEXT,
    "motivoRechazo" TEXT,
    "subidoPorId" INTEGER,
    "subidoEn" TIMESTAMP(3),
    "revisadoPorId" INTEGER,
    "revisadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoOperacion" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "tipo" "TipoEvento" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoOperacion" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "tipo" "TipoCargo" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consecutivo" (
    "prefijo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Consecutivo_pkey" PRIMARY KEY ("prefijo","anio")
);

-- CreateTable
CREATE TABLE "ConfiguracionAgencia" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "razonSocial" TEXT NOT NULL DEFAULT 'Conexión Logística y Aduanera del Pacífico S.A.',
    "rfc" TEXT,
    "agenteAduanal" TEXT,
    "patente" TEXT,
    "honorariosBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ivaHonorarios" DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionAgencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aduana" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aduana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClavePedimento" (
    "clave" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "aplicaImpo" BOOLEAN NOT NULL DEFAULT true,
    "aplicaExpo" BOOLEAN NOT NULL DEFAULT true,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClavePedimento_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "DocumentoConfig" (
    "tipo" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "requisitoImpo" "RequisitoDocumento" NOT NULL DEFAULT 'SI_APLICA',
    "requisitoExpo" "RequisitoDocumento" NOT NULL DEFAULT 'SI_APLICA',

    CONSTRAINT "DocumentoConfig_pkey" PRIMARY KEY ("tipo")
);

-- CreateTable
CREATE TABLE "AlertaConfig" (
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AlertaConfig_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "WidgetUsuario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "widget" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tono" TEXT NOT NULL,
    "umbral" INTEGER,

    CONSTRAINT "WidgetUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProveedorServicio_pasoId_idx" ON "ProveedorServicio"("pasoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProveedorServicio_proveedorId_pasoId_key" ON "ProveedorServicio"("proveedorId", "pasoId");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE INDEX "Sesion_expiraEn_idx" ON "Sesion"("expiraEn");

-- CreateIndex
CREATE INDEX "DocumentoOperacion_estado_idx" ON "DocumentoOperacion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoOperacion_traficoId_tipo_key" ON "DocumentoOperacion"("traficoId", "tipo");

-- CreateIndex
CREATE INDEX "EventoOperacion_traficoId_createdAt_idx" ON "EventoOperacion"("traficoId", "createdAt");

-- CreateIndex
CREATE INDEX "CargoOperacion_traficoId_idx" ON "CargoOperacion"("traficoId");

-- CreateIndex
CREATE UNIQUE INDEX "Aduana_clave_key" ON "Aduana"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Aduana_nombre_key" ON "Aduana"("nombre");

-- CreateIndex
CREATE INDEX "WidgetUsuario_usuarioId_idx" ON "WidgetUsuario"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetUsuario_usuarioId_widget_key" ON "WidgetUsuario"("usuarioId", "widget");

-- CreateIndex
CREATE INDEX "Trafico_importadorId_idx" ON "Trafico"("importadorId");

-- CreateIndex
CREATE INDEX "Trafico_cerradaEn_idx" ON "Trafico"("cerradaEn");

-- CreateIndex
CREATE INDEX "TraficoPaso_estado_idx" ON "TraficoPaso"("estado");

-- CreateIndex
CREATE INDEX "TraficoPaso_proveedorId_idx" ON "TraficoPaso"("proveedorId");

-- AddForeignKey
ALTER TABLE "ProveedorServicio" ADD CONSTRAINT "ProveedorServicio_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorServicio" ADD CONSTRAINT "ProveedorServicio_pasoId_fkey" FOREIGN KEY ("pasoId") REFERENCES "Paso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trafico" ADD CONSTRAINT "Trafico_importadorId_fkey" FOREIGN KEY ("importadorId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trafico" ADD CONSTRAINT "Trafico_ejecutivoId_fkey" FOREIGN KEY ("ejecutivoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraficoPaso" ADD CONSTRAINT "TraficoPaso_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraficoPaso" ADD CONSTRAINT "TraficoPaso_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperacion" ADD CONSTRAINT "DocumentoOperacion_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperacion" ADD CONSTRAINT "DocumentoOperacion_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperacion" ADD CONSTRAINT "DocumentoOperacion_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoOperacion" ADD CONSTRAINT "EventoOperacion_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoOperacion" ADD CONSTRAINT "EventoOperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoOperacion" ADD CONSTRAINT "CargoOperacion_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetUsuario" ADD CONSTRAINT "WidgetUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Migración de datos existentes =====

-- Los pasos ya registrados conservan su estado: con fecha de fin = completado, sin ella = en proceso.
UPDATE "TraficoPaso"
SET "estado" = CASE WHEN "fechaFin" IS NOT NULL THEN 'COMPLETADO'::"EstadoPaso" ELSE 'EN_PROCESO'::"EstadoPaso" END;

-- En operaciones de clientes directos, el importador es el mismo cliente.
UPDATE "Trafico" t
SET "importadorId" = t."clienteId"
FROM "Cliente" c
WHERE c."id" = t."clienteId" AND c."tipo" = 'DIRECTO' AND t."importadorId" IS NULL;

-- Los documentos marcados en la tabla anterior pasan al expediente nuevo como aprobados.
-- La tabla "Documento" se conserva sin cambios hasta confirmar esta migración.
INSERT INTO "DocumentoOperacion" ("id", "traficoId", "tipo", "estado", "url", "subidoEn", "revisadoEn", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d."traficoId", x.tipo::"TipoDocumento", 'APROBADO'::"EstadoDocumento", x.url, d."updatedAt", d."updatedAt", NOW(), NOW()
FROM "Documento" d
CROSS JOIN LATERAL (VALUES
  ('FACTURA',  d."facturaExiste",  d."facturaUrl"),
  ('BL',       d."blExiste",       d."blUrl"),
  ('PL',       d."plExiste",       d."plUrl"),
  ('CO',       d."coExiste",       d."coUrl"),
  ('PERMISOS', d."permisosExiste", d."permisosUrl"),
  ('CM',       d."cmExiste",       d."cmUrl"),
  ('HT',       d."htExiste",       d."htUrl"),
  ('HS',       d."hsExiste",       d."hsUrl"),
  ('FOTOS',    d."fotosExiste",    d."fotosUrl"),
  ('OTROS',    d."otrosExiste",    d."otrosUrl")
) AS x(tipo, existe, url)
WHERE x.existe
ON CONFLICT ("traficoId", "tipo") DO NOTHING;
