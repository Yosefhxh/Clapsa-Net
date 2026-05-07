"use client";

import { useEffect, useMemo, useState } from "react";
import { DespachoAduanalHeader } from "@/app/components/despacho-aduanal/DespachoAduanalHeader";
import { FolioHeader } from "@/app/components/despacho-aduanal/FolioHeader";
import { MasterDataSection } from "@/app/components/despacho-aduanal/MasterDataSection";
import { ChecklistSection } from "@/app/components/despacho-aduanal/ChecklistSection";
import { SearchBar } from "@/app/components/despacho-aduanal/SearchBar";
import { WorkflowTable } from "@/app/components/despacho-aduanal/WorkflowTable";
import { ProgressWidget } from "@/app/components/despacho-aduanal/ProgressWidget";
import { HistorialWidget } from "@/app/components/despacho-aduanal/HistorialWidget";
import {
  EstadoOperacion,
  HistorialCambio,
  PasoDespacho,
  PasoEstado,
  TipoOperacion,
  checklistPorOperacion,
  estadoLabel,
} from "@/app/components/despacho-aduanal/types";
import { STORAGE_KEY } from "@/app/components/despacho-aduanal/types";
import {
  crearEstadoInicial,
  fechaCortaISO,
  fechaActual,
} from "@/app/components/despacho-aduanal/utils";

export default function DespachoAduanalPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estadoInicial] = useState(() => crearEstadoInicial());
  const [operacion, setOperacion] = useState<EstadoOperacion>(
    estadoInicial.operacion
  );
  const [pasos, setPasos] = useState<PasoDespacho[]>(estadoInicial.pasos);
  const [documentos, setDocumentos] = useState<Record<string, string>>(
    estadoInicial.documentos
  );
  const [historial, setHistorial] = useState<HistorialCambio[]>(
    estadoInicial.historial
  );

  // Persistencia en localStorage
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

  // Lógica de filtrado
  const pasosFiltrados = pasos.filter((paso) => {
    const term = busqueda.toLowerCase();
    return (
      paso.etapa.toLowerCase().includes(term) ||
      estadoLabel[paso.estado].toLowerCase().includes(term)
    );
  });

  // Cálculo de progreso
  const progreso = useMemo(() => {
    const score = pasos.reduce((acc, paso) => {
      if (paso.estado === "completado") return acc + 1;
      if (paso.estado === "en-proceso") return acc + 0.5;
      return acc;
    }, 0);

    return Math.round((score / pasos.length) * 100);
  }, [pasos]);

  // Agregación de historial
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

  // Manejadores de eventos
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
    if (etapa)
      agregarHistorial(
        `Etapa actualizada: ${etapa} -> ${estadoLabel[estado]}`
      );
  };

  return (
    <div className="space-y-8">
      <DespachoAduanalHeader />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <FolioHeader folio={operacion.folio} pasos={pasos} />
        <MasterDataSection
          operacion={operacion}
          onCambioOperacion={handleCambioOperacion}
          onTipoOperacion={handleTipoOperacion}
        />

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ChecklistSection
                tipoOperacion={operacion.tipoOperacion}
                documentos={documentos}
                onUploadDocumento={handleUploadDocumento}
              />

              <SearchBar
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
              />

              <WorkflowTable
                pasos={pasosFiltrados}
                onEstadoPaso={handleEstadoPaso}
              />
            </div>

            <div className="space-y-4">
              <ProgressWidget pasos={pasos} progreso={progreso} />
              <HistorialWidget historial={historial} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
