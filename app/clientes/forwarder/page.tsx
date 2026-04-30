"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Search, Trash2, CheckCircle2, Loader2, AlertCircle, Plus, X, Pencil } from 'lucide-react';
import { extractPdfData } from '@/app/lib/utils/extractPdfData';
import { registrarCliente, obtenerClientes, eliminarCliente, actualizarCliente } from '@/app/lib/actions/clientes';

interface Cliente {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  regimen: string;
  tipo: 'DIRECTO' | 'FORWARDER';
}

interface FormData {
  razonSocial: string;
  rfc: string;
}

type ModalMode = 'create' | 'edit';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [estaEscaneando, setEstaEscaneando] = useState(false);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState<FormData>({ razonSocial: '', rfc: '' });
  const [guardando, setGuardando] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    const cargarClientes = async () => {
      const clientesGuardados = await obtenerClientes('FORWARDER');

      setClientes(
        clientesGuardados.map((cliente) => ({
          id: cliente.id,
          folio: cliente.folio,
          razonSocial: cliente.razonSocial,
          rfc: cliente.rfc,
          regimen: 'No especificado',
          tipo: 'FORWARDER',
        }))
      );
    };

    cargarClientes();
  }, []);

  // Lógica de carga y validación de PDF
  const onDropModal = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    setEstaEscaneando(true);
    setError('');

    try {
      const datosExtraidos = await extractPdfData(file);

      if (!datosExtraidos.rfc) {
        setError('No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.');
        setEstaEscaneando(false);
        return;
      }

      setFormData({
        razonSocial: datosExtraidos.razonSocial || '',
        rfc: datosExtraidos.rfc
      });
      setError('');
    } catch (err) {
      console.error('Error procesando PDF:', err);
      setError('Error al procesar el PDF. Intenta con otro archivo.');
    } finally {
      setEstaEscaneando(false);
    }
  }, []);

  const { getRootProps: getRootPropsModal, getInputProps: getInputPropsModal, isDragActive: isDragActiveModal } = useDropzone({
    onDrop: onDropModal,
    accept: { 'application/pdf': ['.pdf'] }, // Solo PDF
    maxSize: 5242880, // Máximo 5MB
    multiple: false,
    disabled: estaEscaneando
  });

  const abrirModalNuevo = () => {
    setModalMode('create');
    setClienteEditando(null);
    setFormData({ razonSocial: '', rfc: '' });
    setError('');
    setModalAbierto(true);
  };

  const abrirModalEdicion = (cliente: Cliente) => {
    setModalMode('edit');
    setClienteEditando(cliente);
    setFormData({
      razonSocial: cliente.razonSocial,
      rfc: cliente.rfc,
    });
    setError('');
    setModalAbierto(true);
  };

  const handleGuardarCliente = async () => {
    if (!formData.rfc.trim()) {
      setError('El RFC es obligatorio');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const payload = {
        razonSocial: formData.razonSocial || 'No especificada',
        rfc: formData.rfc.toUpperCase(),
        tipo: 'FORWARDER' as const,
      };

      if (modalMode === 'edit' && clienteEditando) {
        const resultado = await actualizarCliente(clienteEditando.id, payload);

        if (resultado.success && resultado.cliente) {
          setClientes(prev => prev.map((cliente) => (
            cliente.id === clienteEditando.id
              ? {
                  ...cliente,
                  razonSocial: resultado.cliente.razonSocial,
                  rfc: resultado.cliente.rfc,
                }
              : cliente
          )));
          setFormData({ razonSocial: '', rfc: '' });
          setClienteEditando(null);
          setModalAbierto(false);
        } else {
          setError(resultado.error || 'Error al actualizar el cliente');
        }
      } else {
        const resultado = await registrarCliente(payload);

        if (resultado.success && resultado.cliente) {
          const nuevoCliente: Cliente = {
            id: resultado.cliente.id,
            folio: resultado.cliente.folio,
            razonSocial: resultado.cliente.razonSocial,
            rfc: resultado.cliente.rfc,
            regimen: 'No especificado',
            tipo: 'FORWARDER'
          };

          setClientes(prev => [nuevoCliente, ...prev]);
          setFormData({ razonSocial: '', rfc: '' });
          setModalAbierto(false);
          alert("Cliente registrado con éxito\nFolio: " + nuevoCliente.folio);
        } else {
          setError(resultado.error || 'Error al registrar el cliente');
        }
      }
    } catch (err) {
      console.error(modalMode === 'edit' ? 'Error actualizando cliente:' : 'Error registrando cliente:', err);
      setError(modalMode === 'edit' ? 'Error al actualizar el cliente' : 'Error al registrar el cliente');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarModal = () => {
    setFormData({ razonSocial: '', rfc: '' });
    setError('');
    setEstaEscaneando(false);
    setModalMode('create');
    setClienteEditando(null);
    setModalAbierto(false);
  };

  // Lógica de filtrado y búsqueda
  const clientesFiltrados = clientes.filter(c => {
    const coincideBusqueda = c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || c.rfc.includes(busqueda.toUpperCase());
    return coincideBusqueda;
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Clientes Forwarder</h1>
        <p className="text-slate-500 text-sm">Administra los clientes registrados en tu base de datos.</p>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-80 lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Razón Social o RFC..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 rounded-lg hover:bg-aduanaBlue/15 hover:border-aduanaBlue/30 transition-colors font-medium md:ml-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Cliente
        </button>
      </div>

      {/* MOSTRAR ERRORES GLOBALES */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-900 font-medium">Error</h3>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* LISTADO DE CLIENTES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <p className="text-sm text-slate-600">Total de clientes registrados: <strong>{clientes.length}</strong></p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Folio</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Razón Social</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clientesFiltrados.length > 0 ? (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-700 font-mono text-sm font-medium">{cliente.folio}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-4 h-4 text-aduanaBlue" />
                      </div>
                      <span className="font-medium text-slate-700">{cliente.razonSocial}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-sm">{cliente.rfc}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Registrado</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirModalEdicion(cliente)}
                        className="p-2 text-slate-400 hover:text-aduanaBlue transition-colors"
                        aria-label={`Editar ${cliente.razonSocial}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          const confirmado = window.confirm(`¿Eliminar a ${cliente.razonSocial} de la base de datos?`);
                          if (!confirmado) return;

                          const resultado = await eliminarCliente(cliente.id);
                          if (resultado.success) {
                            setClientes(prev => prev.filter(c => c.id !== cliente.id));
                          } else {
                            setError(resultado.error || 'Error al eliminar el cliente');
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label={`Eliminar ${cliente.razonSocial}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  No hay clientes registrados. Carga un PDF para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REGISTRO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-bold text-slate-800">{modalMode === 'edit' ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
              <button
                onClick={limpiarModal}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ÁREA DE CARGA PDF */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Cargar Constancia Fiscal (Opcional)</label>
                <div 
                  {...getRootPropsModal()}
                  className={`border-2 border-dashed rounded-lg p-6 transition-all flex flex-col items-center justify-center cursor-pointer
                    ${isDragActiveModal ? 'border-aduanaBlue bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-aduanaBlue'}`}
                >
                  <input {...getInputPropsModal()} />
                  {estaEscaneando ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-aduanaBlue animate-spin mb-2" />
                      <p className="text-sm font-medium text-slate-700">Extrayendo...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-aduanaBlue mb-2" />
                      <p className="text-sm font-medium text-slate-700">Arrastra o haz clic aquí</p>
                      <p className="text-xs text-slate-400 mt-1">Solo PDF (Máx. 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* ERROR EN MODAL */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* CAMPOS DE FORMULARIO */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Razón Social</label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Nombre de la empresa o persona"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">RFC *</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="RFC (obligatorio)"
                    maxLength={13}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">Entre 12 y 13 caracteres</p>
                </div>
              </div>

              {/* BOTONES */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={limpiarModal}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCliente}
                  disabled={guardando || estaEscaneando || !formData.rfc.trim()}
                  className="flex-1 px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
                  {guardando ? 'Guardando...' : modalMode === 'edit' ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}