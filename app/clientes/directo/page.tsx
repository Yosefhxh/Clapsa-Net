"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Search, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { extractPdfData } from '@/app/lib/utils/extractPdfData';
import { registrarCliente, obtenerClientes, eliminarCliente } from '@/app/lib/actions/clientes';

interface Cliente {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  regimen: string;
  tipo: 'DIRECTO' | 'FORWARDER';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [estaEscaneando, setEstaEscaneando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarClientes = async () => {
      const clientesGuardados = await obtenerClientes('DIRECTO');

      setClientes(
        clientesGuardados.map((cliente) => ({
          id: cliente.id,
          folio: cliente.folio,
          razonSocial: cliente.razonSocial,
          rfc: cliente.rfc,
          regimen: 'No especificado',
          tipo: 'DIRECTO',
        }))
      );
    };

    cargarClientes();
  }, []);

  // Lógica de carga y validación de PDF
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    setEstaEscaneando(true);
    setError('');

    try {
      // Extraer datos reales del PDF
      const datosExtraidos = await extractPdfData(file);
      
      // Validar que al menos tengamos RFC (obligatorio)
      if (!datosExtraidos.rfc) {
        setError('No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.');
        setEstaEscaneando(false);
        return;
      }

      // Si no hay razón social, usar un placeholder
      const razonSocial = datosExtraidos.razonSocial || 'No especificada';
      
      // Registrar en el servidor
      const resultado = await registrarCliente({
        razonSocial: razonSocial,
        rfc: datosExtraidos.rfc,
        tipo: 'DIRECTO'
      });

      if (resultado.success && resultado.cliente) {
        const nuevoCliente: Cliente = {
          id: resultado.cliente.id,
          folio: resultado.cliente.folio,
          razonSocial: resultado.cliente.razonSocial,
          rfc: resultado.cliente.rfc,
          regimen: datosExtraidos.regimen || 'No especificado',
          tipo: 'DIRECTO'
        };

        setClientes(prev => [nuevoCliente, ...prev]);
        alert("Constancia procesada e registrada con éxito\nFolio: " + nuevoCliente.folio);
      } else {
        setError(resultado.error || 'Error al registrar el cliente');
      }
    } catch (err) {
      console.error('Error procesando PDF:', err);
      setError('Error al procesar el PDF. Intenta con otro archivo.');
    } finally {
      setEstaEscaneando(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }, // Solo PDF
    maxSize: 5242880, // Máximo 5MB
    multiple: false
  });

  // Lógica de filtrado y búsqueda
  const clientesFiltrados = clientes.filter(c => {
    const coincideBusqueda = c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || c.rfc.includes(busqueda.toUpperCase());
    return coincideBusqueda;
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Clientes</h1>
        <p className="text-slate-500 text-sm">Carga la Constancia de Situación Fiscal para registrar automáticamente.</p>
      </div>

      {/* ÁREA DE CARGA (DROPZONE) */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center cursor-pointer
          ${isDragActive ? 'border-aduanaBlue bg-blue-50' : 'border-slate-300 bg-white hover:border-aduanaBlue'}`}
      >
        <input {...getInputProps()} />
        {estaEscaneando ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-aduanaBlue animate-spin mb-4" />
            <p className="font-medium text-slate-700">Extrayendo información del PDF...</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-aduanaBlue" />
            </div>
            <p className="text-lg font-medium text-slate-700">Arrastra la Constancia o haz clic aquí</p>
            <p className="text-sm text-slate-400 mt-2">Solo archivos PDF (Máx. 5MB)</p>
          </>
        )}
      </div>

      {/* MOSTRAR ERRORES */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-900 font-medium">Error procesando PDF</h3>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Razón Social o RFC..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

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
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
    </div>
  );
}