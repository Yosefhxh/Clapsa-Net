"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Search } from "lucide-react";

type PasoEstado = "completado" | "en-proceso" | "pendiente";

interface PasoDespacho {
  id: number;
  etapa: string;
  responsable: string;
  fecha: string;
  estado: PasoEstado;
}

const operacionDemo = {
  referencia: "OP-DA-2026-0184",
  pedimento: "26 48 3901 6001842",
  cliente: "Logistica Boreal del Norte, S.A. de C.V.",
  rfc: "LBN240315KQ2",
  aduana: "Nuevo Laredo",
  regimen: "Importacion definitiva",
  fechaApertura: "2026-05-02",
};

const pasos: PasoDespacho[] = [
  {
    id: 1,
    etapa: "Documentos recibidos",
    responsable: "Mesa de control",
    fecha: "2026-05-02",
    estado: "completado",
  },
  {
    id: 2,
    etapa: "Expediente aperturado",
    responsable: "Ejecutivo de cuenta",
    fecha: "2026-05-03",
    estado: "completado",
  },
  {
    id: 3,
    etapa: "Clasificacion arancelaria",
    responsable: "Area tecnica",
    fecha: "2026-05-04",
    estado: "en-proceso",
  },
  {
    id: 4,
    etapa: "Generacion de COVE",
    responsable: "Documentacion",
    fecha: "-",
    estado: "pendiente",
  },
  {
    id: 5,
    etapa: "Captura de pedimento",
    responsable: "Glosa",
    fecha: "-",
    estado: "pendiente",
  },
  {
    id: 6,
    etapa: "Pago y validacion",
    responsable: "Tesoreria",
    fecha: "-",
    estado: "pendiente",
  },
];

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
  const completados = pasos.filter((paso) => paso.estado === "completado").length;
  const progreso = Math.round((completados / pasos.length) * 100);

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
              <p className="text-sm text-slate-500">Operacion de referencia</p>
              <p className="font-semibold text-slate-700">{operacionDemo.referencia}</p>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Progreso general: <strong>{completados}/{pasos.length}</strong> etapas ({progreso}%)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.cliente}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">RFC</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.rfc}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pedimento</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.pedimento}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Aduana</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.aduana}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Regimen</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.regimen}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Fecha de apertura</p>
            <p className="text-sm font-medium text-slate-700">{operacionDemo.fechaApertura}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-5">
            <div className="relative w-full md:w-80 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value=""
                readOnly
                placeholder="Filtrar etapa, responsable o estado..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 cursor-not-allowed"
              />
            </div>
            <span className="text-xs px-3 py-2 rounded-lg bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 font-medium">
              Vista demo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Etapa</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Responsable</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Fecha</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pasos.map((paso) => (
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
                    <td className="px-6 py-4 text-slate-600 text-sm">{paso.responsable}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{paso.fecha}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${estadoStyles[paso.estado]}`}>
                        {estadoLabel[paso.estado]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}