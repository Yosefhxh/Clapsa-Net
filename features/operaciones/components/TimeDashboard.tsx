"use client";

import { gestionarTimerTraficoPaso } from '@/shared/actions/timers';
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";

export type TimerStatus = "pendiente" | "en-proceso" | "completado";

export interface TimeDashboardPaso {
    pasoId: string;
    nombre: string;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    tiempoInvertido: number | null;
}

export interface TimerActionResult {
    success: boolean;
    message: string;
    data?: {
        fechaInicio: Date | null;
        fechaFin: Date | null;
        tiempoInvertido: number | null;
    };
}

export interface TimeDashboardProps {
    traficoId: string;
    pasos: TimeDashboardPaso[];
    onTimerAction?: (input: {
        traficoId: string;
        pasoId: string;
        action: "start" | "stop";
    }) => Promise<TimerActionResult>;
}

const defaultPasos = [
    "Previo en origen",
    "Flete marítimo",
    "Flete aéreo",
    "F.T. Intermodal",
    "Despacho Aduanero",
    "F.T. Nacional",
    "UVA",
    "Almacenaje",
    "Maniobras en almacén",
    "Maniobras portuarias",
    "Otras",
];

const estadoStyles: Record<TimerStatus, string> = {
    pendiente: "bg-slate-50 text-slate-600 border border-slate-200",
    "en-proceso": "bg-amber-50 text-amber-700 border border-amber-200",
    completado: "bg-green-50 text-green-700 border border-green-200",
};

function resolverEstado(paso: TimeDashboardPaso): TimerStatus {
    if (paso.fechaFin) return "completado";
    if (paso.fechaInicio) return "en-proceso";
    return "pendiente";
}

function formatearDuracion(segundos: number | null): string {
    if (!segundos || segundos <= 0) return "-";
    const horas = segundos / 3600;
    const dias = horas / 24;

    if (dias >= 1) {
        return `${dias.toFixed(2)} días`;
    }

    return `${horas.toFixed(2)} horas`;
}

export function TimeDashboard({ traficoId, pasos, onTimerAction }: TimeDashboardProps) {
    const [pasosLocal, setPasosLocal] = useState<TimeDashboardPaso[]>(pasos);
    const [loadingPasoId, setLoadingPasoId] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const pasosRender = useMemo(() => {
        if (pasosLocal.length > 0) return pasosLocal;

        return defaultPasos.map((nombre, index) => ({
            pasoId: `paso-${index + 1}`,
            nombre,
            fechaInicio: null,
            fechaFin: null,
            tiempoInvertido: null,
        }));
    }, [pasosLocal]);

    const manejarTimer = async (paso: TimeDashboardPaso, action: "start" | "stop") => {
        setLoadingPasoId(paso.pasoId);
        setMessage("");

        try {
            let result: TimerActionResult = {
                success: false,
                message: "No hay action de temporizador configurada.",
            };

            if (onTimerAction) {
                result = await onTimerAction({
                    traficoId,
                    pasoId: paso.pasoId,
                    action,
                });
            } else {
                result = await gestionarTimerTraficoPaso({
                    traficoId,
                    pasoId: paso.pasoId,
                    action,
                });
            }

            if (!result.success) {
                setMessage(result.message);
                return;
            }

            setMessage(result.message);
            setPasosLocal((prev) =>
                prev.map((item) => {
                    if (item.pasoId !== paso.pasoId) return item;

                    return {
                        ...item,
                        fechaInicio: result.data?.fechaInicio ?? (action === "start" ? new Date() : item.fechaInicio),
                        fechaFin: result.data?.fechaFin ?? (action === "stop" ? new Date() : null),
                        tiempoInvertido: result.data?.tiempoInvertido ?? item.tiempoInvertido,
                    };
                }),
            );
        } finally {
            setLoadingPasoId(null);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="clp-section-title text-lg">Dashboard de Tiempos</h3>
                <span className="clp-chip">
                    {pasosRender.length} hitos
                </span>
            </div>

            {message ? (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{message}</p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pasosRender.map((paso) => {
                    const estado = resolverEstado(paso);
                    const isLoading = loadingPasoId === paso.pasoId;

                    return (
                        <article key={paso.pasoId} className="clp-card p-5 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{paso.nombre}</p>
                                    <p className="text-xs text-slate-500">SLA: {formatearDuracion(paso.tiempoInvertido)}</p>
                                </div>

                                <span className={`clp-badge ${estadoStyles[estado]}`}>
                                    {estado === "pendiente" ? "Pendiente" : estado === "en-proceso" ? "En proceso" : "Completado"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                {estado === "completado" ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Clock3 className="w-4 h-4 text-amber-600" />
                                )}
                                <span>
                                    Inicio: {paso.fechaInicio ? paso.fechaInicio.toLocaleString("es-MX") : "-"} | Fin: {paso.fechaFin ? paso.fechaFin.toLocaleString("es-MX") : "-"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => manejarTimer(paso, "start")}
                                    disabled={isLoading || estado === "en-proceso"}
                                    className="clp-btn clp-btn-secondary"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Iniciar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => manejarTimer(paso, "stop")}
                                    disabled={isLoading || estado !== "en-proceso"}
                                    className="clp-btn clp-btn-primary"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Detener"}
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
