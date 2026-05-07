import { FOLIO_COUNTER_KEY, STORAGE_KEY, etapasBase, EstadoOperacion, HistorialCambio } from "./types";

export function generarFolio(): string {
  const year = new Date().getFullYear().toString().slice(-2);

  if (typeof window === "undefined") {
    return `CLPD-${year}-00001`;
  }

  const current = Number(window.localStorage.getItem(FOLIO_COUNTER_KEY) ?? "0");
  const next = current + 1;
  window.localStorage.setItem(FOLIO_COUNTER_KEY, String(next));
  return `CLPD-${year}-${String(next).padStart(5, "0")}`;
}

export function fechaActual(): string {
  return new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fechaCortaISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function crearEstadoInicial() {
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
        pasos: Array<{ id: number; etapa: string; fecha: string; estado: string }>;
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
