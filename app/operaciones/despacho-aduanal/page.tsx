"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Search, Upload } from "lucide-react";

type TipoCliente = "DIRECTO" | "FORWARDER";
type TipoOperacion = "IMPO" | "EXPO";

type PasoEstado = "completado" | "en-proceso" | "pendiente";

interface PasoDespacho {
  id: number;
  etapa: string;
  fecha: string;
  estado: PasoEstado;
}

interface HistorialCambio {
  id: number;
  mensaje: string;
  fecha: string;
}

interface EstadoOperacion {
  folio: string;
  clienteNombre: string;
  clienteTipo: TipoCliente;
  rfc: string;
  aduana: string;
  tipoOperacion: TipoOperacion;
  eta: string;
  etd: string;
}

const FOLIO_COUNTER_KEY = "clapsa-despacho-folio-counter";
const STORAGE_KEY = "clapsa-despacho-operacion";

const aduanas = [
  "Nuevo Laredo",
  "Manzanillo",
  "Veracruz",
  "Altamira",
  "CDMX AICM",
];

const etapasBase: PasoDespacho[] = [
  { id: 1, etapa: "Previo en Origen", fecha: "-", estado: "pendiente" },
  { id: 2, etapa: "Flete Maritimo", fecha: "-", estado: "pendiente" },
  { id: 3, etapa: "Flete Aereo", fecha: "-", estado: "pendiente" },
  { id: 4, etapa: "Flete Terrestre Nacional", fecha: "-", estado: "pendiente" },
  { id: 5, etapa: "Despacho Aduanero", fecha: "-", estado: "pendiente" },
  { id: 6, etapa: "Flete Terrestre Internacional", fecha: "-", estado: "pendiente" },
  { id: 7, etapa: "UVA", fecha: "-", estado: "pendiente" },
  { id: 8, etapa: "Almacenaje", fecha: "-", estado: "pendiente" },
  { id: 9, etapa: "Maniobras en Almacen", fecha: "-", estado: "pendiente" },
  { id: 10, etapa: "Maniobras Portuarias", fecha: "-", estado: "pendiente" },
  { id: 11, etapa: "Otros", fecha: "-", estado: "pendiente" },
];

const checklistPorOperacion: Record<TipoOperacion, string[]> = {
  IMPO: [
    "Factura",
    "BL (Bill of Lading)",
    "Packing List (PL)",
    "Certificado de Origen (CO)",
    "Permisos",
    "Hoja Tecnica",
  ],
  EXPO: ["Hoja de Seguridad (HS)", "Fotos"],
};

function generarFolio() {
  const year = new Date().getFullYear().toString().slice(-2);

  if (typeof window === "undefined") {
    return `CLPD-${year}-00001`;
  }

  const current = Number(window.localStorage.getItem(FOLIO_COUNTER_KEY) ?? "0");
  const next = current + 1;
  window.localStorage.setItem(FOLIO_COUNTER_KEY, String(next));
  return `CLPD-${year}-${String(next).padStart(5, "0")}`;
}

function fechaActual() {
  return new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fechaCortaISO() {
  return new Date().toISOString().slice(0, 10);
}

function crearEstadoInicial() {
  const operacionBase: EstadoOperacion = {
    folio: "",
    clienteNombre: "Comercializadora Futura del Bajio, S.A. de C.V.",
    clienteTipo: "DIRECTO",
    rfc: "CFB260104QK1",
    aduana: "Nuevo Laredo",
    tipoOperacion: "IMPO",
    eta: fechaCortaISO(),
    etd: "",
  };

  if (typeof window === "undefined") {
    const folio = generarFolio();
    return {
      operacion: { ...operacionBase, folio },
      pasos: etapasBase,
      documentos: {} as Record<string, string>,
      historial: [
        {
          id: 1,
          mensaje: `Operacion creada con folio ${folio}`,
          fecha: fechaActual(),
        },
      ] as HistorialCambio[],
    };
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved) as {
        operacion: EstadoOperacion;
        pasos: PasoDespacho[];
        documentos: Record<string, string>;
        historial: HistorialCambio[];
      };
    } catch (loadError) {
      console.error("Error cargando despacho aduanal:", loadError);
    }
  }

  const folio = generarFolio();
  return {
    operacion: { ...operacionBase, folio },
    pasos: etapasBase,
    documentos: {} as Record<string, string>,
    historial: [
      {
        id: 1,
        mensaje: `Operacion creada con folio ${folio}`,
        fecha: fechaActual(),
      },
    ] as HistorialCambio[],
  };
}

const estadoStyles: Record<PasoEstado, string> = {
  completado: "bg-green-50 text-green-700 border border-green-200",
  "en-proceso": "bg-amber-50 text-amber-700 border border-amber-200",
  pendiente: "bg-slate-50 text-slate-600 border border-slate-200",
};

const estadoLabel: Record<PasoEstado, string> = {
  completado: "Completado",
  "en-proceso": "En proceso",
  pendiente: "Pendiente",
};

export default function DespachoAduanalPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estadoInicial] = useState(() => crearEstadoInicial());
  const [operacion, setOperacion] = useState<EstadoOperacion>(estadoInicial.operacion);
  const [pasos, setPasos] = useState<PasoDespacho[]>(estadoInicial.pasos);
  const [documentos, setDocumentos] = useState<Record<string, string>>(estadoInicial.documentos);
  const [historial, setHistorial] = useState<HistorialCambio[]>(estadoInicial.historial);

  useEffect(() => {
    if (!operacion.folio) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        operacion,
        pasos,
        documentos,
        historial,
      })
    );
  }, [operacion, pasos, documentos, historial]);

  const checklistActual = checklistPorOperacion[operacion.tipoOperacion];

  const pasosFiltrados = pasos.filter((paso) => {
    const term = busqueda.toLowerCase();
    return (
      paso.etapa.toLowerCase().includes(term) ||
      estadoLabel[paso.estado].toLowerCase().includes(term)
    );
  });

  const completados = pasos.filter((paso) => paso.estado === "completado").length;
  const progreso = useMemo(() => {
    const score = pasos.reduce((acc, paso) => {
      if (paso.estado === "completado") return acc + 1;
      if (paso.estado === "en-proceso") return acc + 0.5;
      return acc;
    }, 0);

    return Math.round((score / pasos.length) * 100);
  }, [pasos]);

  const agregarHistorial = (mensaje: string) => {
    setHistorial((prev) => {
      const nextId = (prev[0]?.id ?? 0) + 1;
      const entrada: HistorialCambio = {
        id: nextId,
        mensaje,
        fecha: fechaActual(),
      };

      return [entrada, ...prev].slice(0, 20);
    });
  };

  const handleCambioOperacion = <K extends keyof EstadoOperacion>(
    campo: K,
    valor: EstadoOperacion[K]
  ) => {
    setOperacion((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleTipoOperacion = (tipo: TipoOperacion) => {
    setOperacion((prev) => ({
      ...prev,
      tipoOperacion: tipo,
      eta: tipo === "IMPO" ? prev.eta || fechaCortaISO() : "",
      etd: tipo === "EXPO" ? prev.etd || fechaCortaISO() : "",
    }));

    setDocumentos((prev) => {
      const validos = checklistPorOperacion[tipo];
      const depurado: Record<string, string> = {};

      validos.forEach((doc) => {
        if (prev[doc]) depurado[doc] = prev[doc];
      });

      return depurado;
    });

    agregarHistorial(`Tipo de operacion cambiado a ${tipo}`);
  };

  const handleUploadDocumento = (documento: string, file: File | null) => {
    if (!file) return;

    setDocumentos((prev) => ({ ...prev, [documento]: file.name }));
    agregarHistorial(`Archivo cargado en ${documento}: ${file.name}`);
  };

  const handleEstadoPaso = (id: number, estado: PasoEstado) => {
    setPasos((prev) =>
      prev.map((paso) => {
        if (paso.id !== id) return paso;

        return {
          ...paso,
          estado,
          fecha: estado === "pendiente" ? "-" : fechaCortaISO(),
        };
      })
    );

    const etapa = pasos.find((paso) => paso.id === id)?.etapa;
    if (etapa) agregarHistorial(`Etapa actualizada: ${etapa} -> ${estadoLabel[estado]}`);
  };

  const checklistCompletado = checklistActual.filter((doc) => Boolean(documentos[doc])).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Despacho Aduanal</h1>
          <p className="text-slate-500 text-sm">Seguimiento operativo del pedimento y avance por etapa.</p>
        </div>
        <Link
          href="/operaciones"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a operaciones
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-4 h-4 text-aduanaBlue" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Folio de operacion</p>
              <p className="font-semibold text-slate-700">{operacion.folio || "Generando..."}</p>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Progreso general: <strong>{completados}/{pasos.length}</strong> etapas ({progreso}%)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente (Ficticio)</p>
            <input
              type="text"
              value={operacion.clienteNombre}
              onChange={(e) => handleCambioOperacion("clienteNombre", e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Tipo de Cliente</p>
            <select
              value={operacion.clienteTipo}
              onChange={(e) => handleCambioOperacion("clienteTipo", e.target.value as TipoCliente)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            >
              <option value="DIRECTO">Directo</option>
              <option value="FORWARDER">Forwarder</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">RFC</p>
            <input
              type="text"
              value={operacion.rfc}
              onChange={(e) => handleCambioOperacion("rfc", e.target.value.toUpperCase())}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Aduana</p>
            <select
              value={operacion.aduana}
              onChange={(e) => handleCambioOperacion("aduana", e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            >
              {aduanas.map((aduana) => (
                <option key={aduana} value={aduana}>
                  {aduana}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Tipo de Operacion</p>
            <select
              value={operacion.tipoOperacion}
              onChange={(e) => handleTipoOperacion(e.target.value as TipoOperacion)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            >
              <option value="IMPO">IMPO</option>
              <option value="EXPO">EXPO</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {operacion.tipoOperacion === "IMPO" ? "ETA" : "ETD"}
            </p>
            <input
              type="date"
              value={operacion.tipoOperacion === "IMPO" ? operacion.eta : operacion.etd}
              onChange={(e) =>
                operacion.tipoOperacion === "IMPO"
                  ? handleCambioOperacion("eta", e.target.value)
                  : handleCambioOperacion("etd", e.target.value)
              }
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30 text-sm"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Checklist Documental</h3>
                  <span className="text-xs px-3 py-1 rounded-lg bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 font-medium">
                    {checklistCompletado}/{checklistActual.length} documentos
                  </span>
                </div>

                <div className="space-y-3">
                  {checklistActual.map((doc) => {
                    const inputId = `doc-${doc.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                    const cargado = documentos[doc];

                    return (
                      <div key={doc} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-3 border border-slate-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{doc}</p>
                          <p className="text-xs text-slate-500">
                            {cargado ? `Archivo: ${cargado}` : "Sin archivo cargado"}
                          </p>
                        </div>
                        <div>
                          <input
                            id={inputId}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleUploadDocumento(doc, e.target.files?.[0] ?? null)}
                          />
                          <label
                            htmlFor={inputId}
                            className="inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            Upload
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-1">
                <div className="relative w-full md:w-80 lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Filtrar etapa o estado..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30"
                  />
                </div>
                <span className="text-xs px-3 py-2 rounded-lg bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 font-medium">
                  Workflow activo
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Etapa</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pasosFiltrados.map((paso) => (
                      <tr key={paso.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              {paso.estado === "completado" ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock3 className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <span className="font-medium text-slate-700">{paso.etapa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{paso.fecha}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${estadoStyles[paso.estado]}`}>
                              {estadoLabel[paso.estado]}
                            </span>
                            <select
                              value={paso.estado}
                              onChange={(e) => handleEstadoPaso(paso.id, e.target.value as PasoEstado)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-600"
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="en-proceso">En Proceso</option>
                              <option value="completado">Completado</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Progreso General</h3>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-aduanaBlue transition-all" style={{ width: `${progreso}%` }} />
                </div>
                <p className="text-sm text-slate-600">
                  <strong>{progreso}%</strong> completado
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Etapas completadas: {completados} de {pasos.length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial de Cambios</h3>
                {historial.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin movimientos registrados.</p>
                ) : (
                  <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
                    {historial.map((item) => (
                      <li key={item.id} className="text-xs border-b border-slate-100 pb-2">
                        <p className="text-slate-700">{item.mensaje}</p>
                        <p className="text-slate-500 mt-0.5">{item.fecha}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}