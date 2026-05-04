"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { extractPdfData } from '@/app/lib/utils/extractPdfData';

type TipoProveedor = 'LOGISTICA' | 'ADUANAL' | 'GENERALES';

type FuenteAlta = 'manual' | 'constancia';

interface Proveedor {
  id: number;
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fechaAlta: string;
  fuente: FuenteAlta;
}

interface FormData {
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
}

const STORAGE_KEY = 'clapsa-proveedores-alta';

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

function formatFechaAlta(fechaAlta: string) {
  return new Date(fechaAlta).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ProveedoresAltaPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [estaEscaneando, setEstaEscaneando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [fuenteAlta, setFuenteAlta] = useState<FuenteAlta>('manual');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Proveedor[];
      setProveedores(parsed);
    } catch (storageError) {
      console.error('Error leyendo proveedores guardados:', storageError);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(proveedores));
  }, [proveedores]);

  const onDropModal = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setEstaEscaneando(true);
    setError('');

    try {
      const datosExtraidos = await extractPdfData(file);

      if (!datosExtraidos.rfc) {
        setError('No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.');
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
      setError('Error al procesar el PDF. Intenta con otro archivo.');
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
    if (!formData.razonSocial.trim()) {
      setError('La razón social es obligatoria');
      return;
    }

    if (!formData.rfc.trim()) {
      setError('El RFC es obligatorio');
      return;
    }

    if (!formData.correo.trim()) {
      setError('El correo es obligatorio');
      return;
    }

    if (!formData.telefono.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }

    if (!formData.direccion.trim()) {
      setError('La dirección es obligatoria');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const nuevoProveedor: Proveedor = {
        id: Date.now(),
        razonSocial: formData.razonSocial.trim(),
        tipoProveedor: formData.tipoProveedor,
        rfc: formData.rfc.trim().toUpperCase(),
        correo: formData.correo.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        fechaAlta: new Date().toISOString(),
        fuente: fuenteAlta,
      };

      setProveedores((prev) => [nuevoProveedor, ...prev]);
      setModalAbierto(false);
      setFormData(emptyFormData);
    } catch (registroError) {
      console.error('Error registrando proveedor:', registroError);
      setError('No se pudo registrar el proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProveedor = (id: number) => {
    const proveedor = proveedores.find((item) => item.id === id);
    if (!proveedor) return;

    const confirmado = window.confirm(`¿Eliminar a ${proveedor.razonSocial} de la lista?`);
    if (!confirmado) return;

    setProveedores((prev) => prev.filter((item) => item.id !== id));
  };

  const proveedoresFiltrados = proveedores.filter((proveedor) => {
    const term = busqueda.toLowerCase();
    return (
      proveedor.razonSocial.toLowerCase().includes(term) ||
      proveedor.rfc.toLowerCase().includes(term) ||
      proveedor.correo.toLowerCase().includes(term) ||
      proveedor.tipoProveedor.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Alta de Proveedores</h1>
        <p className="text-slate-500 text-sm">Registra y consulta los proveedores dados de alta desde constancia fiscal o captura manual.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-80 lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, RFC, correo o tipo..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2 bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 rounded-lg hover:bg-aduanaBlue/15 hover:border-aduanaBlue/30 transition-colors font-medium md:ml-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-900 font-medium">Error</h3>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Total de proveedores registrados: <strong>{proveedores.length}</strong>
          </p>
          <Link href="/proveedores/busqueda" className="text-sm font-medium text-aduanaBlue hover:underline">
            Ir a búsqueda
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Razón Social</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Correo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Teléfono</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Dirección</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha de alta</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {proveedoresFiltrados.length > 0 ? (
                proveedoresFiltrados.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-4 h-4 text-aduanaBlue" />
                        </div>
                        <span className="font-medium text-slate-700">{proveedor.razonSocial}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-aduanaBlue/10 px-3 py-1 text-xs font-semibold text-aduanaBlue">
                        {tipoProveedorLabels[proveedor.tipoProveedor]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{proveedor.rfc}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{proveedor.correo}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{proveedor.telefono}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm max-w-xs">
                      <p className="break-words">{proveedor.direccion}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">{formatFechaAlta(proveedor.fechaAlta)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => eliminarProveedor(proveedor.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label={`Eliminar ${proveedor.razonSocial}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    No hay proveedores registrados. Haz clic en &quot;Registrar Proveedor&quot; para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Proveedor</h2>
                <p className="text-sm text-slate-500">Captura manual o carga una constancia fiscal para completar RFC y razón social.</p>
              </div>
              <button onClick={limpiarModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Cargar Constancia Fiscal (Opcional)</label>
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all ${
                    isDragActive ? 'border-aduanaBlue bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-aduanaBlue'
                  }`}
                >
                  <input {...getInputProps()} />
                  {estaEscaneando ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-aduanaBlue" />
                      <p className="text-sm font-medium text-slate-700">Extrayendo datos...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-6 w-6 text-aduanaBlue" />
                      <p className="text-sm font-medium text-slate-700">Arrastra o haz clic aquí</p>
                      <p className="mt-1 text-xs text-slate-400">Solo PDF (máx. 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Razón Social *</label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Nombre del proveedor"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de proveedor *</label>
                  <select
                    value={formData.tipoProveedor}
                    onChange={(e) => setFormData({ ...formData, tipoProveedor: e.target.value as TipoProveedor })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  >
                    <option value="LOGISTICA">Logística</option>
                    <option value="ADUANAL">Aduanal</option>
                    <option value="GENERALES">Generales</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">RFC *</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="RFC"
                    maxLength={13}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Correo *</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="correo@empresa.com"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Teléfono *</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="55 1234 5678"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Dirección *</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Dirección fiscal o comercial"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Fecha de alta</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    Se registrará con la fecha actual: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={limpiarModal}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarProveedor}
                  disabled={guardando || estaEscaneando}
                  className="flex-1 rounded-lg bg-aduanaBlue px-4 py-2 font-medium text-white transition-colors hover:bg-aduanaBlue/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
                  {guardando ? 'Guardando...' : 'Registrar proveedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
