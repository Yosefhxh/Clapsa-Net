-- CreateEnum
CREATE TYPE "EstadoCatalogo" AS ENUM ('ACTIVO', 'INACTIVO');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "estado" "EstadoCatalogo" NOT NULL DEFAULT 'ACTIVO',
ADD COLUMN     "pdfConstanciaUrl" TEXT;

-- CreateIndex
CREATE INDEX "Cliente_estado_idx" ON "Cliente"("estado");
