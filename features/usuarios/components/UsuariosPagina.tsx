import { Suspense } from "react";
import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { obtenerMatrizPermisos } from "@/shared/auth/matriz";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { dalObtenerUsuarios } from "../dal/usuarios-dal";
import { UsuariosEsqueleto } from "./UsuariosEsqueleto";
import { UsuariosVista } from "./UsuariosVista";

async function Datos() {
  if (!(await usuarioConPermiso("usuarios.gestionar"))) return <SinPermiso />;
  const [usuarios, matriz] = await Promise.all([dalObtenerUsuarios(), obtenerMatrizPermisos()]);
  return (
    <TrasEsqueleto esqueleto={<UsuariosEsqueleto />}>
      <UsuariosVista
        ahora={new Date().toISOString()}
        matriz={matriz}
        usuarios={usuarios.map((u) => ({ ...u, fechaRegistro: u.fechaRegistro.toISOString(), ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null }))}
      />
    </TrasEsqueleto>
  );
}

/** Página de usuarios (solo administradores), con esqueleto mientras llegan los datos. */
export function UsuariosPagina() {
  return (
    <Suspense fallback={<MarcaEsqueleto><UsuariosEsqueleto /></MarcaEsqueleto>}>
      <Datos />
    </Suspense>
  );
}
