-- CreateEnum
CREATE TYPE "TipoOperacion" AS ENUM ('IMPO', 'EXPO');

-- CreateEnum
CREATE TYPE "HitoOperativo" AS ENUM ('PREVIO_ORIGEN', 'FLETE_MARITIMO', 'FLETE_AEREO', 'FT_INTERMODAL', 'DESPACHO_ADUANERO', 'FT_NACIONAL', 'UVA', 'ALMACENAJE', 'MANIOBRAS_ALMACEN', 'MANIOBRAS_PORTUARIAS', 'OTRAS');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "clientePadreId" INTEGER,
ADD COLUMN     "encargoConferido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaVigenciaEncargo" TIMESTAMP(3),
ADD COLUMN     "pdfEncargoUrl" TEXT;

-- CreateTable
CREATE TABLE "Trafico" (
    "id" TEXT NOT NULL,
    "clienteId" INTEGER,
    "tipoOperacion" "TipoOperacion" NOT NULL,
    "aduana" TEXT NOT NULL,
    "eta" TIMESTAMP(3),
    "etd" TIMESTAMP(3),
    "folioManual" TEXT,
    "referenciaAutomatica" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trafico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contenedor" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "numeroContenedor" TEXT NOT NULL,
    "tipoContenedor" TEXT,
    "precinto" TEXT,
    "naviera" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contenedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paso" (
    "id" TEXT NOT NULL,
    "clave" "HitoOperativo" NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraficoPaso" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "pasoId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "tiempoInvertido" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraficoPaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "facturaExiste" BOOLEAN NOT NULL DEFAULT false,
    "facturaUrl" TEXT,
    "blExiste" BOOLEAN NOT NULL DEFAULT false,
    "blUrl" TEXT,
    "plExiste" BOOLEAN NOT NULL DEFAULT false,
    "plUrl" TEXT,
    "coExiste" BOOLEAN NOT NULL DEFAULT false,
    "coUrl" TEXT,
    "permisosExiste" BOOLEAN NOT NULL DEFAULT false,
    "permisosUrl" TEXT,
    "cmExiste" BOOLEAN NOT NULL DEFAULT false,
    "cmUrl" TEXT,
    "htExiste" BOOLEAN NOT NULL DEFAULT false,
    "htUrl" TEXT,
    "hsExiste" BOOLEAN NOT NULL DEFAULT false,
    "hsUrl" TEXT,
    "fotosExiste" BOOLEAN NOT NULL DEFAULT false,
    "fotosUrl" TEXT,
    "otrosExiste" BOOLEAN NOT NULL DEFAULT false,
    "otrosUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposito" (
    "id" TEXT NOT NULL,
    "traficoId" TEXT NOT NULL,
    "folioDeposito" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "banco" TEXT,
    "referencia" TEXT,
    "fechaDeposito" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trafico_referenciaAutomatica_key" ON "Trafico"("referenciaAutomatica");

-- CreateIndex
CREATE INDEX "Trafico_clienteId_idx" ON "Trafico"("clienteId");

-- CreateIndex
CREATE INDEX "Trafico_tipoOperacion_aduana_idx" ON "Trafico"("tipoOperacion", "aduana");

-- CreateIndex
CREATE INDEX "Trafico_folioManual_idx" ON "Trafico"("folioManual");

-- CreateIndex
CREATE INDEX "Contenedor_traficoId_idx" ON "Contenedor"("traficoId");

-- CreateIndex
CREATE UNIQUE INDEX "Contenedor_traficoId_numeroContenedor_key" ON "Contenedor"("traficoId", "numeroContenedor");

-- CreateIndex
CREATE UNIQUE INDEX "Paso_clave_key" ON "Paso"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Paso_orden_key" ON "Paso"("orden");

-- CreateIndex
CREATE INDEX "TraficoPaso_traficoId_idx" ON "TraficoPaso"("traficoId");

-- CreateIndex
CREATE INDEX "TraficoPaso_pasoId_idx" ON "TraficoPaso"("pasoId");

-- CreateIndex
CREATE INDEX "TraficoPaso_fechaInicio_idx" ON "TraficoPaso"("fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "TraficoPaso_traficoId_pasoId_key" ON "TraficoPaso"("traficoId", "pasoId");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_traficoId_key" ON "Documento"("traficoId");

-- CreateIndex
CREATE INDEX "Documento_traficoId_idx" ON "Documento"("traficoId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposito_folioDeposito_key" ON "Deposito"("folioDeposito");

-- CreateIndex
CREATE INDEX "Deposito_traficoId_idx" ON "Deposito"("traficoId");

-- CreateIndex
CREATE INDEX "Deposito_fechaDeposito_idx" ON "Deposito"("fechaDeposito");

-- CreateIndex
CREATE INDEX "Cliente_tipo_idx" ON "Cliente"("tipo");

-- CreateIndex
CREATE INDEX "Cliente_clientePadreId_idx" ON "Cliente"("clientePadreId");

-- CreateIndex
CREATE INDEX "Proveedores_tipoProveedor_idx" ON "Proveedores"("tipoProveedor");

-- CreateIndex
CREATE INDEX "Usuario_tipoUsuario_estado_idx" ON "Usuario"("tipoUsuario", "estado");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_clientePadreId_fkey" FOREIGN KEY ("clientePadreId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trafico" ADD CONSTRAINT "Trafico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contenedor" ADD CONSTRAINT "Contenedor_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraficoPaso" ADD CONSTRAINT "TraficoPaso_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraficoPaso" ADD CONSTRAINT "TraficoPaso_pasoId_fkey" FOREIGN KEY ("pasoId") REFERENCES "Paso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposito" ADD CONSTRAINT "Deposito_traficoId_fkey" FOREIGN KEY ("traficoId") REFERENCES "Trafico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
