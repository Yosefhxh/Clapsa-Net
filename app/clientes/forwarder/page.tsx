"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Search, Filter, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

// Interfaz para nuestros clientes simulados
interface Cliente {
  id: number;
  razonSocial: string;
  rfc: string;
  regimen: string;
  tipo: 'Directo' | 'Forwarder';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Directo' | 'Forwarder'>('Todos');
  const [estaEscaneando, setEstaEscaneando] = useState(false);

  // Lógica de carga y validación de PDF
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    setEstaEscaneando(true);

    // Simulamos un proceso de extracción de datos (OCR) que tardaría 2 segundos
    setTimeout(() => {
      const nuevoCliente: Cliente = {
        id: Date.now(),
        razonSocial: "EMPRESA SIMULADA S.A. DE C.V.", // Esto vendría del PDF
        rfc: "ABC123456H01",
        regimen: "General de Ley Personas Morales",
        tipo: Math.random() > 0.5 ? 'Directo' : 'Forwarder'
      };

      setClientes(prev => [nuevoCliente, ...prev]);
      setEstaEscaneando(false);
      alert("Constancia procesada con éxito");
    }, 2000);
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
    const coincideFiltro = filtroTipo === 'Todos' || c.tipo === filtroTipo;
    return coincideBusqueda && coincideFiltro;
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
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select 
            className="border rounded-lg px-3 py-2 focus:outline-none"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as 'Todos' | 'Directo' | 'Forwarder')}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Directo">Directo</option>
            <option value="Forwarder">Forwarder</option>
          </select>
        </div>
      </div>

      {/* LISTADO DE CLIENTES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Razón Social</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clientesFiltrados.length > 0 ? (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cliente.tipo === 'Directo' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {cliente.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Validado</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setClientes(clientes.filter(c => c.id !== cliente.id))}
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