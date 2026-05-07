"use client";

import { ClientesManagementPage } from "@/app/components/clientes/ClientesManagementPage";

export default function ClientesPage() {
  return (
    <ClientesManagementPage
      tipoCliente="FORWARDER"
      title="Clientes Forwarder"
      description="Administracion de clientes forwarder Clapsa."
    />
  );
}
