-- CreateTable
CREATE TABLE "PermisoRol" (
    "rol" "TipoUsuario" NOT NULL,
    "permiso" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermisoRol_pkey" PRIMARY KEY ("rol","permiso")
);

-- Valores iniciales: los mismos permisos que el sistema tenía fijos en el código.
INSERT INTO "PermisoRol" ("rol", "permiso", "permitido", "updatedAt") VALUES
  ('EDITOR', 'operaciones.ver', true, NOW()),
  ('EDITOR', 'operaciones.operar', true, NOW()),
  ('EDITOR', 'documentos.revisar', true, NOW()),
  ('EDITOR', 'pedimento.gestionar', false, NOW()),
  ('EDITOR', 'pasos.reabrir', false, NOW()),
  ('EDITOR', 'cuenta.emitir', false, NOW()),
  ('EDITOR', 'catalogos.editar', true, NOW()),
  ('EDITOR', 'catalogos.eliminar', false, NOW()),
  ('EDITOR', 'usuarios.gestionar', false, NOW()),
  ('EDITOR', 'configuracion.editar', false, NOW()),
  ('VIEWER', 'operaciones.ver', true, NOW()),
  ('VIEWER', 'operaciones.operar', false, NOW()),
  ('VIEWER', 'documentos.revisar', false, NOW()),
  ('VIEWER', 'pedimento.gestionar', false, NOW()),
  ('VIEWER', 'pasos.reabrir', false, NOW()),
  ('VIEWER', 'cuenta.emitir', false, NOW()),
  ('VIEWER', 'catalogos.editar', false, NOW()),
  ('VIEWER', 'catalogos.eliminar', false, NOW()),
  ('VIEWER', 'usuarios.gestionar', false, NOW()),
  ('VIEWER', 'configuracion.editar', false, NOW())
ON CONFLICT DO NOTHING;
