-- CreateEnum
CREATE TYPE "FuenteAltaProveedor" AS ENUM ('MANUAL', 'CONSTANCIA');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');

-- AlterTable
ALTER TABLE "Proveedores" ADD COLUMN     "fuenteAlta" "FuenteAltaProveedor" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "tipoUsuario" "TipoUsuario" NOT NULL DEFAULT 'VIEWER',
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "passwordHash" TEXT NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");
