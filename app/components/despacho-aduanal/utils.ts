import { FOLIO_COUNTER_KEY, STORAGE_KEY, etapasBase, EstadoOperacion, HistorialCambio, PasoDespacho, PasoEstado } from "./types";

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
      const parsed = JSON.parse(saved) as any;

      // Normalizar pasos desde localStorage y validar `estado`
      const pasosParsed: PasoDespacho[] = (parsed.pasos ?? []).map((p: any) => {
        const estadoCandidate = String(p?.estado ?? "").trim() as PasoEstado;
        const isValidEstado = estadoCandidate === "completado" || estadoCandidate === "en-proceso" || estadoCandidate === "pendiente";
        const estado: PasoEstado = isValidEstado ? estadoCandidate : "pendiente";

        return {
          id: Number(p?.id ?? 0),
          etapa: String(p?.etapa ?? ""),
          fecha: String(p?.fecha ?? "-"),
          estado,
        };
      });

      return {
        operacion: parsed.operacion as EstadoOperacion,
        pasos: pasosParsed.length ? pasosParsed : etapasBase,
        documentos: parsed.documentos ?? ({} as Record<string, string>),
        historial: parsed.historial ?? ([] as HistorialCambio[]),
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
