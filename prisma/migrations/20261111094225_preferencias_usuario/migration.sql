-- CreateTable
CREATE TABLE "PreferenciaUsuario" (
    "usuarioId" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenciaUsuario_pkey" PRIMARY KEY ("usuarioId","clave")
);

-- AddForeignKey
ALTER TABLE "PreferenciaUsuario" ADD CONSTRAINT "PreferenciaUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
