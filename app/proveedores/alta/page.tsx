"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle,
  FileText,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { extractPdfData } from '@/app/lib/utils/extractPdfData';
import { ESTADOS_MEXICO, obtenerEstadoDesdeDireccion } from '@/app/lib/utils/estadosMexico';
import { 
  registrarProveedor, 
  obtenerProveedores, 
  eliminarProveedorAction 
} from '@/app/lib/actions/proveedores';

type TipoProveedor = 'LOGISTICA' | 'ADUANAL' | 'GENERALES';
type FuenteAlta = 'manual' | 'constancia';
type OrdenProveedor = 'az' | 'za' | 'estado';

interface Proveedor {
  id: number;
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fechaAlta: string | Date;
  fuente?: FuenteAlta;
}

interface FormData {
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
}

const emptyFormData: FormData = {
  razonSocial: '',
  tipoProveedor: 'GENERALES',
  rfc: '',
  correo: '',
  telefono: '',
  direccion: '',
};

const tipoProveedorLabels: Record<TipoProveedor, string> = {
  LOGISTICA: 'Logística',
  ADUANAL: 'Aduanal',
  GENERALES: 'Generales',
};

function formatFechaAlta(fechaAlta: string | Date) {
  return new Date(fechaAlta).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ProveedoresAltaPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<OrdenProveedor>('az');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [estaEscaneando, setEstaEscaneando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [fuenteAlta, setFuenteAlta] = useState<FuenteAlta>('manual');

  // Carga inicial desde la base de datos a través del Server Action
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const datos = await obtenerProveedores();
        setProveedores(datos as unknown as Proveedor[]);
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
        setError('No se pudieron cargar los proveedores del servidor.');
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    if (orden !== 'estado' && estadoFiltro) {
      setEstadoFiltro('');
    }
  }, [orden, estadoFiltro]);

  const onDropModal = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setEstaEscaneando(true);
    setError('');

    try {
      const datosExtraidos = await extractPdfData(file);

      if (!datosExtraidos.rfc) {
        setError('No se pudo encontrar el RFC en el PDF.');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        razonSocial: datosExtraidos.razonSocial || prev.razonSocial,
        rfc: datosExtraidos.rfc,
      }));
      setFuenteAlta('constancia');
    } catch (pdfError) {
      console.error('Error procesando PDF:', pdfError);
      setError('Error al procesar el PDF.');
    } finally {
      setEstaEscaneando(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropModal,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 5242880,
    multiple: false,
    disabled: estaEscaneando,
  });

  const abrirModal = () => {
    setFormData(emptyFormData);
    setError('');
    setFuenteAlta('manual');
    setModalAbierto(true);
  };

  const limpiarModal = () => {
    setFormData(emptyFormData);
    setError('');
    setEstaEscaneando(false);
    setModalAbierto(false);
  };

  const handleGuardarProveedor = async () => {
    if (!formData.razonSocial.trim() || !formData.rfc.trim() || !formData.correo.trim() || !formData.telefono.trim() || !formData.direccion.trim()) {
      setError('Todos los campos marcados con * son obligatorios');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      // Guardar en la base de datos usando el Server Action
      const result = await registrarProveedor({
        razonSocial: formData.razonSocial.trim(),
        tipoProveedor: formData.tipoProveedor,
        rfc: formData.rfc.trim().toUpperCase(),
        correo: formData.correo.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
      });

      if (result.success && result.proveedor) {
        setProveedores((prev) => [result.proveedor as unknown as Proveedor, ...prev]);
        setModalAbierto(false);
        setFormData(emptyFormData);
      } else {
        setError(result.error || 'Error al registrar el proveedor');
      }
    } catch (registroError) {
      console.error('Error:', registroError);
      setError('Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProveedor = async (id: number) => {
    const proveedor = proveedores.find((item) => item.id === id);
    if (!proveedor) return;

    const confirmado = window.confirm(`¿Eliminar a ${proveedor.razonSocial} definitivamente?`);
    if (!confirmado) return;

    try {
      const result = await eliminarProveedorAction(id);
      if (result.success) {
        setProveedores((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(result.error || 'No se pudo eliminar');
      }
    } catch (err) {
      alert('Error al procesar la eliminación');
    }
  };

  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const proveedoresFiltrados = useMemo(() => {
    const term = normalize(busqueda);
    const filtrados = proveedores.filter((p) => {
      const estadoProv = obtenerEstadoDesdeDireccion(p.direccion);
      if (estadoFiltro && normalize(estadoProv) !== normalize(estadoFiltro)) return false;
      return normalize(p.razonSocial).includes(term) || normalize(p.rfc).includes(term) || normalize(p.direccion).includes(term);
    });

    return [...filtrados].sort((a, b) => {
      const compare = (l: string, r: string) => l.localeCompare(r, 'es', { sensitivity: 'base' });
      if (orden === 'za') return compare(b.razonSocial, a.razonSocial);
      if (orden === 'estado') return compare(obtenerEstadoDesdeDireccion(a.direccion), obtenerEstadoDesdeDireccion(b.direccion)) || compare(a.razonSocial, b.razonSocial);
      return compare(a.razonSocial, b.razonSocial);
    });
  }, [busqueda, estadoFiltro, orden, proveedores]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Alta de Proveedores</h1>
        <p className="text-slate-500 text-sm">Gestión centralizada en base de datos.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1 md:w-full">
          <div className="relative w-full md:max-w-md lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 focus:border-aduanaBlue/30 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-[250px]">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenProveedor)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:border-aduanaBlue/30 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15"
            >
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
              <option value="estado">Por estado</option>
            </select>
          </div>
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 rounded-lg border border-aduanaBlue/20 bg-aduanaBlue/10 px-4 py-2 font-medium text-aduanaBlue transition-colors hover:border-aduanaBlue/30 hover:bg-aduanaBlue/15"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <p className="text-sm text-slate-600">Total de proveedores registrados: <strong>{proveedores.length}</strong></p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Razón Social</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Dirección</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No hay proveedores registrados. Usa &quot;Registrar Proveedor&quot; para agregar uno.</td>
                </tr>
              ) : (
                proveedoresFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{p.razonSocial}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-aduanaBlue/10 px-3 py-1 text-xs font-semibold text-aduanaBlue">
                        {tipoProveedorLabels[p.tipoProveedor]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{p.rfc}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{p.direccion}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{formatFechaAlta(p.fechaAlta)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => eliminarProveedor(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Nuevo Proveedor</h2>
              <button onClick={limpiarModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Cargar Constancia Fiscal (Opcional)</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isDragActive ? "border-aduanaBlue bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-aduanaBlue"
                  }`}
                >
                  <input {...getInputProps()} />
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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Razón Social *</label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Nombre de la empresa"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Tipo *</label>
                  <select
                    value={formData.tipoProveedor}
                    onChange={(e) => setFormData({ ...formData, tipoProveedor: e.target.value as TipoProveedor })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    <option value="LOGISTICA">Logística</option>
                    <option value="ADUANAL">Aduanal</option>
                    <option value="GENERALES">Generales</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">RFC *</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="RFC (obligatorio)"
                    maxLength={13}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">Entre 12 y 13 caracteres</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Correo *</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="email@empresa.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Teléfono *</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+1-555-0000"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Dirección *</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, ciudad, estado"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 px-6 pb-6">
                <button
                  onClick={limpiarModal}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarProveedor}
                  disabled={guardando || estaEscaneando || !formData.rfc.trim()}
                  className="flex-1 px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
                  {guardando ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}