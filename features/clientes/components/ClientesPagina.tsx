import { Suspense } from "react";
import type { TipoCliente } from "@prisma/client";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { dalListarClientes, dalListarForwarders, dalSiguientesFolios } from "../dal/clientes-dal";
import { ClientesEsqueleto } from "./ClientesEsqueleto";
import { ClientesVista } from "./ClientesVista";

const TITULO: Record<TipoCliente, string> = { DIRECTO: "Clientes Directos", FORWARDER: "Clientes Forwarder" };

async function Datos({ tipo }: { tipo: TipoCliente }) {
  await usuarioConPermiso();
  const [clientes, forwarders, siguientesFolios] = await Promise.all([dalListarClientes(tipo), dalListarForwarders(), dalSiguientesFolios()]);
  return (
    <TrasEsqueleto esqueleto={<ClientesEsqueleto titulo={TITULO[tipo]} />}>
      <ClientesVista tipo={tipo} clientes={clientes} forwarders={forwarders} siguientesFolios={siguientesFolios} hoy={new Date().toISOString()} />
    </TrasEsqueleto>
  );
}

/** Página de clientes de un tipo, con esqueleto mientras llegan los datos reales. */
export function ClientesPagina({ tipo }: { tipo: TipoCliente }) {
  return (
    <Suspense fallback={<MarcaEsqueleto><ClientesEsqueleto titulo={TITULO[tipo]} /></MarcaEsqueleto>}>
      <Datos tipo={tipo} />
    </Suspense>
  );
}
