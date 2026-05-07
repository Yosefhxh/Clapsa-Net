-- CreateEnum
CREATE TYPE "TipoProveedor" AS ENUM ('LOGISTICA', 'ADUANAL', 'GENERALES');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "regimen" TEXT NOT NULL DEFAULT 'No especificado';

-- CreateTable
CREATE TABLE "Proveedores" (
    "id" SERIAL NOT NULL,
    "tipoProveedor" "TipoProveedor" NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_rfc_key" ON "Proveedores"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_correo_key" ON "Proveedores"("correo");
