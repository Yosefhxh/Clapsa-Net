"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PROVEEDORES_TABS, SectionTabs } from "@/shared/components/layout/SectionTabs";
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
import { extractPdfData } from '@/shared/utils/extractPdfData';
import { ESTADOS_MEXICO, obtenerEstadoDesdeDireccion } from '@/shared/utils/estadosMexico';
import { 
  registrarProveedor, 
  obtenerProveedores, 
  eliminarProveedorAction 
} from '@/features/proveedores';

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
        direccion: datosExtraidos.domicilio || prev.direccion,
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
    <div className="space-y-5">
      <div className="clp-page-head">
        <h1 className="clp-page-title">Alta de Proveedores</h1>
        <p className="clp-page-sub mt-0.5 text-sm">Gestión centralizada en base de datos.</p>
        <SectionTabs label="Proveedores" tabs={PROVEEDORES_TABS} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1 md:w-full">
          <div className="relative w-full md:max-w-md lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="clp-input pl-10"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-[250px]">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenProveedor)}
              className="clp-input pl-10"
            >
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
              <option value="estado">Por estado</option>
            </select>
          </div>
        </div>
        <button
          onClick={abrirModal}
          className="clp-btn clp-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {error && (
        <div className="clp-alert">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="clp-card overflow-hidden">
        <div className="clp-panel-head">
          <p className="text-sm text-slate-600">Total de proveedores registrados: <strong>{proveedores.length}</strong></p>
        </div>

        <div className="overflow-x-auto">
          <table className="clp-table  min-w-[1100px]">
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>Tipo</th>
                <th>RFC</th>
                <th>Dirección</th>
                <th>Fecha</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clp-table-vacia">No hay proveedores registrados. Usa &quot;Registrar Proveedor&quot; para agregar uno.</td>
                </tr>
              ) : (
                proveedoresFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.razonSocial}</td>
                    <td>
                      <span className="clp-badge border-aduanaBlue/15 bg-aduanaBlue/10 text-aduanaBlue">
                        {tipoProveedorLabels[p.tipoProveedor]}
                      </span>
                    </td>
                    <td className="font-mono">{p.rfc}</td>
                    <td className="max-w-xs truncate">{p.direccion}</td>
                    <td>{formatFechaAlta(p.fechaAlta)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => eliminarProveedor(p.id)} className="clp-icon-btn clp-icon-btn-danger">
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
        <div className="clp-modal-scrim">
          <div className="clp-modal">
            <div className="clp-modal-head">
              <h2 className="clp-modal-title">Nuevo Proveedor</h2>
              <button onClick={limpiarModal} className="clp-icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="clp-label">Cargar Constancia Fiscal (Opcional)</label>
                <div
                  {...getRootProps()}
                  className={`clp-dropzone ${
                    isDragActive ? "clp-dropzone-activa" : ""
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
                      <p className="text-xs text-slate-500 mt-1">Solo PDF (Máx. 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="clp-alert">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="clp-label">Razón Social *</label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Nombre de la empresa"
                    className="clp-input"
                  />
                </div>

                <div>
                  <label className="clp-label">Tipo *</label>
                  <select
                    value={formData.tipoProveedor}
                    onChange={(e) => setFormData({ ...formData, tipoProveedor: e.target.value as TipoProveedor })}
                    className="clp-input"
                  >
                    <option value="LOGISTICA">Logística</option>
                    <option value="ADUANAL">Aduanal</option>
                    <option value="GENERALES">Generales</option>
                  </select>
                </div>

                <div>
                  <label className="clp-label">RFC *</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="RFC (obligatorio)"
                    maxLength={13}
                    className="clp-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Entre 12 y 13 caracteres</p>
                </div>

                <div>
                  <label className="clp-label">Correo *</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="email@empresa.com"
                    className="clp-input"
                  />
                </div>

                <div>
                  <label className="clp-label">Teléfono *</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+1-555-0000"
                    className="clp-input"
                  />
                </div>

                <div>
                  <label className="clp-label">Dirección *</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, ciudad, estado"
                    rows={3}
                    className="clp-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-linea">
                <button
                  onClick={limpiarModal}
                  className="clp-btn clp-btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarProveedor}
                  disabled={guardando || estaEscaneando || !formData.rfc.trim()}
                  className="clp-btn clp-btn-primary flex-1"
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