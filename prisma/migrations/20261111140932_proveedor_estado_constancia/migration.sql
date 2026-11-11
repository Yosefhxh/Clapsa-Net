-- AlterTable
ALTER TABLE "Proveedores" ADD COLUMN     "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',
ADD COLUMN     "pdfConstanciaUrl" TEXT;

-- CreateIndex
CREATE INDEX "Proveedores_estado_idx" ON "Proveedores"("estado");
