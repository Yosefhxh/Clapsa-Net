import { usuarioConPermiso } from "@/shared/auth/paginas";
import { ClientesVista } from "@/features/clientes/components/ClientesVista";
import { dalListarClientes, dalListarForwarders } from "@/features/clientes/dal/clientes-dal";

/** Fecha de referencia para la vigencia del encargo (se calcula en el servidor). */
const hoy = () => new Date().toISOString();

export default async function Page() {
  await usuarioConPermiso();
  const [clientes, forwarders] = await Promise.all([dalListarClientes("DIRECTO"), dalListarForwarders()]);
  return <ClientesVista tipo="DIRECTO" clientes={clientes} forwarders={forwarders} hoy={hoy()} />;
}
