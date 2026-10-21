"use client";

import { ClientesManagementPage } from "@/features/clientes/components/ClientesManagementPage";

export default function ClientesPage() {
  return (
    <ClientesManagementPage
      tipoCliente="DIRECTO"
      title="Clientes Directos"
      description="Administracion de clientes directos Clapsa."
    />
  );
}
