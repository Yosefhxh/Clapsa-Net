import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { UsuariosVista } from "@/features/usuarios/components/UsuariosVista";
import { dalObtenerUsuarios } from "@/features/usuarios/dal/usuarios-dal";

export default async function UsuariosPage() {
  if (!(await usuarioConPermiso("usuarios.gestionar"))) return <SinPermiso />;
  const usuarios = await dalObtenerUsuarios();
  return (
    <UsuariosVista
      usuarios={usuarios.map((u) => ({ ...u, fechaRegistro: u.fechaRegistro.toISOString(), ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null }))}
    />
  );
}
