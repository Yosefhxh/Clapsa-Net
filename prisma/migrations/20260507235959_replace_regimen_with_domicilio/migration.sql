-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "domicilio" TEXT NOT NULL DEFAULT 'No especificado';
ALTER TABLE "Cliente" DROP COLUMN "regimen";
