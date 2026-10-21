"use client";

import { ClientesManagementPage } from "@/features/clientes/components/ClientesManagementPage";

export default function ClientesPage() {
  return (
    <ClientesManagementPage
      tipoCliente="FORWARDER"
      title="Clientes Forwarder"
      description="Administracion de clientes forwarder Clapsa."
    />
  );
}
