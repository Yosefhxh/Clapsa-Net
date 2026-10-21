"use client";

import { uploadDocument } from '@/shared/actions/storage';
import { CalendarClock, Loader2, UploadCloud } from "lucide-react";
import { useForwarderLogic } from "@/features/forwarders/hooks/useForwarderLogic";

export interface ForwarderClientNode {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  encargoConferido: boolean;
  fechaVigenciaEncargo: Date | null;
  pdfEncargoUrl: string | null;
  subclientes?: ForwarderClientNode[];
}

export interface ForwarderPanelProps {
  forwarderNombre: string;
  clientes: ForwarderClientNode[];
  onUploadDocument?: (formData: FormData) => Promise<{ success: boolean; message: string; url?: string }>;
  onActualizarEncargo?: (input: { clienteId: number; pdfEncargoUrl: string; fechaVigenciaEncargo: Date; encargoConferido: boolean }) => Promise<{ success: boolean; message: string }>;
}

function isVigente(fechaVigencia: Date | null) {
  if (!fechaVigencia) return false;
  const limite = new Date(fechaVigencia);
  limite.setHours(23, 59, 59, 999);
  return limite.getTime() >= Date.now();
}

export function ForwarderPanel({ forwarderNombre, clientes, onUploadDocument, onActualizarEncargo }: ForwarderPanelProps) {
  const { 
    flatClientes, selectedId, setSelectedId, selectedCliente, subiendo, mensaje, 
    form: { register, formState: { errors } }, 
    dropzone: { getRootProps, getInputProps, isDragActive }, 
    onSubmit 
  } = useForwarderLogic(clientes, onUploadDocument, onActualizarEncargo);

  return (
    <section className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Sub-panel de Forwarders</h3>
        <p className="text-sm text-slate-500">Forwarder: {forwarderNombre}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="border border-slate-200 rounded-lg p-2 max-h-[420px] overflow-auto">
          <p className="text-xs font-semibold text-slate-500 px-2 py-2">Clientes asignados</p>
          <ul className="space-y-1">
            {flatClientes.map((cliente) => (
              <li key={cliente.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(cliente.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    selectedId === cliente.id ? "bg-aduanaBlue/10 border-aduanaBlue/30 text-aduanaBlue" : "bg-white border-transparent text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-medium">{cliente.razonSocial}</p>
                  <p className="text-xs text-slate-500">{cliente.folio}</p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          {!selectedCliente ? (
            <p className="text-sm text-slate-500">Selecciona un cliente para ver el detalle.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedCliente.razonSocial}</p>
                  <p className="text-xs text-slate-500">RFC: {selectedCliente.rfc}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold ${
                    isVigente(selectedCliente.fechaVigenciaEncargo) ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  {isVigente(selectedCliente.fechaVigenciaEncargo) ? "Vigente" : "Expirado"}
                </span>
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Fecha de vigencia</label>
                  <input
                    type="date"
                    {...register("fechaVigencia")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                  />
                  {errors.fechaVigencia ? <p className="text-xs text-red-600 mt-1">{errors.fechaVigencia.message}</p> : null}
                </div>

                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all ${
                    isDragActive ? "border-aduanaBlue bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-aduanaBlue"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-2 text-center">
                    <UploadCloud className="w-6 h-6 text-aduanaBlue" />
                    <p className="text-sm text-slate-700 font-medium">Subir PDF de Encargo</p>
                  </div>
                </div>
                {errors.file ? <p className="text-xs text-red-600">{errors.file.message}</p> : null}

                <button type="submit" disabled={subiendo} className="inline-flex items-center gap-2 px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 disabled:opacity-50">
                  {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {subiendo ? "Guardando..." : "Guardar Encargo"}
                </button>
              </form>

              {selectedCliente.pdfEncargoUrl ? (
                <a href={selectedCliente.pdfEncargoUrl} target="_blank" rel="noreferrer" className="text-sm text-aduanaBlue hover:underline">
                  Ver PDF actual
                </a>
              ) : null}
              {mensaje ? <p className="text-sm text-slate-600">{mensaje}</p> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}