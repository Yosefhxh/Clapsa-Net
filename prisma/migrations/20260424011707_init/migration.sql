-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('DIRECTO', 'FORWARDER');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_folio_key" ON "Cliente"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_rfc_key" ON "Cliente"("rfc");
