"use client";

import { useEffect, useState } from "react";
import {
  actualizarCliente,
  eliminarCliente,
  obtenerClientes,
  registrarCliente,
} from "@/app/lib/actions/clientes";
import { Cliente, FormDataCliente, ModalMode, TipoCliente } from "./types";
import { ClientesErrorAlert } from "./ClientesErrorAlert";
import { ClientesModal } from "./ClientesModal";
import { ClientesPageHeader } from "./ClientesPageHeader";
import { ClientesSearchBar } from "./ClientesSearchBar";
import { ClientesTable } from "./ClientesTable";
import { construirDomicilio, descomponerDomicilio } from "./utils";

interface ClientesManagementPageProps {
  tipoCliente: TipoCliente;
  title: string;
  description: string;
}

export function ClientesManagementPage({ tipoCliente, title, description }: ClientesManagementPageProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estaEscaneando, setEstaEscaneando] = useState(false);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState<FormDataCliente>({ razonSocial: "", rfc: "", calle: "", estado: "", codigoPostal: "", domicilio: "No especificado" });
  const [guardando, setGuardando] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    const cargarClientes = async () => {
      const clientesGuardados = await obtenerClientes(tipoCliente);

      setClientes(
        clientesGuardados.map((cliente) => ({
          id: cliente.id,
          folio: cliente.folio,
          razonSocial: cliente.razonSocial,
          rfc: cliente.rfc,
          domicilio: cliente.domicilio,
          tipo: tipoCliente,
        }))
      );
    };

    cargarClientes();
  }, [tipoCliente]);

  const abrirModalNuevo = () => {
    setModalMode("create");
    setClienteEditando(null);
    setFormData({ razonSocial: "", rfc: "", calle: "", estado: "", codigoPostal: "", domicilio: "No especificado" });
    setError("");
    setModalAbierto(true);
  };

  const abrirModalEdicion = (cliente: Cliente) => {
    setModalMode("edit");
    setClienteEditando(cliente);
    const partes = descomponerDomicilio(cliente.domicilio);
    setFormData({
      razonSocial: cliente.razonSocial,
      rfc: cliente.rfc,
      calle: partes.calle,
      estado: partes.estado,
      codigoPostal: partes.codigoPostal,
      domicilio: cliente.domicilio,
    });
    setError("");
    setModalAbierto(true);
  };

  const limpiarModal = () => {
    setFormData({ razonSocial: "", rfc: "", calle: "", estado: "", codigoPostal: "", domicilio: "No especificado" });
    setError("");
    setEstaEscaneando(false);
    setModalMode("create");
    setClienteEditando(null);
    setModalAbierto(false);
  };

  const handleGuardarCliente = async () => {
    if (!formData.rfc.trim()) {
      setError("El RFC es obligatorio");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const payload = {
        razonSocial: formData.razonSocial || "No especificada",
        rfc: formData.rfc.toUpperCase(),
        domicilio: formData.domicilio || construirDomicilio(formData.calle, formData.estado, formData.codigoPostal),
        tipo: tipoCliente,
      };

      if (modalMode === "edit" && clienteEditando) {
        const resultado = await actualizarCliente(clienteEditando.id, payload);

        if (resultado.success && resultado.cliente) {
          setClientes((prev) =>
            prev.map((cliente) =>
              cliente.id === clienteEditando.id
                ? {
                    ...cliente,
                    razonSocial: resultado.cliente.razonSocial,
                    rfc: resultado.cliente.rfc,
                    domicilio: resultado.cliente.domicilio,
                  }
                : cliente
            )
          );
          setFormData({ razonSocial: "", rfc: "", calle: "", estado: "", codigoPostal: "", domicilio: "No especificado" });
          setClienteEditando(null);
          setModalAbierto(false);
        } else {
          setError(resultado.error || "Error al actualizar el cliente");
        }
      } else {
        const resultado = await registrarCliente(payload);

        if (resultado.success && resultado.cliente) {
          const nuevoCliente: Cliente = {
            id: resultado.cliente.id,
            folio: resultado.cliente.folio,
            razonSocial: resultado.cliente.razonSocial,
            rfc: resultado.cliente.rfc,
            domicilio: resultado.cliente.domicilio,
            tipo: tipoCliente,
          };

          setClientes((prev) => [nuevoCliente, ...prev]);
          setFormData({ razonSocial: "", rfc: "", calle: "", estado: "", codigoPostal: "", domicilio: "No especificado" });
          setModalAbierto(false);
          alert(`Cliente registrado con éxito\nFolio: ${nuevoCliente.folio}`);
        } else {
          setError(resultado.error || "Error al registrar el cliente");
        }
      }
    } catch (err) {
      console.error(modalMode === "edit" ? "Error actualizando cliente:" : "Error registrando cliente:", err);
      setError(modalMode === "edit" ? "Error al actualizar el cliente" : "Error al registrar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const handleDeleteCliente = async (cliente: Cliente) => {
    const confirmado = window.confirm(`¿Eliminar a ${cliente.razonSocial} de la base de datos?`);
    if (!confirmado) return;

    const resultado = await eliminarCliente(cliente.id);
    if (resultado.success) {
      setClientes((prev) => prev.filter((item) => item.id !== cliente.id));
    } else {
      setError(resultado.error || "Error al eliminar el cliente");
    }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    return cliente.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || cliente.rfc.includes(busqueda.toUpperCase());
  });

  return (
    <div className="space-y-8">
      <ClientesPageHeader title={title} description={description} />

      <ClientesSearchBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onRegistrarCliente={abrirModalNuevo}
      />

      <ClientesErrorAlert error={error} />

      <ClientesTable
        clientes={clientesFiltrados}
        totalClientes={clientes.length}
        onEditCliente={abrirModalEdicion}
        onDeleteCliente={handleDeleteCliente}
      />

      <ClientesModal
        open={modalAbierto}
        mode={modalMode}
        formData={formData}
        error={error}
        isScanning={estaEscaneando}
        isSaving={guardando}
        clienteEditando={clienteEditando}
        onClose={limpiarModal}
        onChangeFormData={setFormData}
        onSubmit={handleGuardarCliente}
        onUploadData={setFormData}
        onErrorChange={setError}
        onScanningChange={setEstaEscaneando}
      />
    </div>
  );
}
