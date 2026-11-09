"use client";

import { asignarClienteDespacho } from '../actions/operaciones-actions';
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientOption, OperationSummaryData } from "../types";

const clientSelectorSchema = z.object({
    clienteId: z.coerce.number().int().positive("Selecciona un cliente válido."),
});

type ClientSelectorFormValues = z.infer<typeof clientSelectorSchema>;

export interface OperationSummaryTabProps {
    traficoId: string;
    clienteActualId: number | null;
    clientes: ClientOption[];
    resumen: OperationSummaryData;
    onAssignCliente?: (traficoId: string, clienteId: number) => Promise<{ success: boolean; message: string }>;
}

export function OperationSummaryTab({
    traficoId,
    clienteActualId,
    clientes,
    resumen,
    onAssignCliente,
}: OperationSummaryTabProps) {
    const [filter, setFilter] = useState("");
    const [message, setMessage] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.input<typeof clientSelectorSchema>, any, z.output<typeof clientSelectorSchema>>({
        resolver: zodResolver(clientSelectorSchema),
        defaultValues: {
            clienteId: clienteActualId ?? clientes[0]?.id,
        },
    });

    const clientesFiltrados = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term) return clientes;

        return clientes.filter((cliente) => {
            const searchable = `${cliente.folio} ${cliente.razonSocial} ${cliente.rfc}`.toLowerCase();
            return searchable.includes(term);
        });
    }, [clientes, filter]);

    const onSubmit = handleSubmit(async (values) => {
        setMessage("");

        if (onAssignCliente) {
            const result = await onAssignCliente(traficoId, values.clienteId);
            setMessage(result.message);
            return;
        }

        const result = await asignarClienteDespacho(traficoId, values.clienteId);
        setMessage(result.message);
    });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
            <section className="clp-card p-5 space-y-4">
                <h3 className="clp-section-title">Detalles del Embarque</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="clp-dato">
                        <p className="text-xs text-slate-600">Aduana</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.aduana || "-"}</p>
                    </div>
                    <div className="clp-dato">
                        <p className="text-xs text-slate-600">Tipo de operación</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.tipoOperacion}</p>
                    </div>
                    <div className="clp-dato md:col-span-2">
                        <p className="text-xs text-slate-600">ETA</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.eta ?? "-"}</p>
                    </div>
                    <div className="clp-dato md:col-span-2">
                        <p className="text-xs text-slate-600">RFC del cliente</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.rfc || "-"}</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label className="clp-label">Buscar cliente</label>
                        <input
                            type="text"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Folio, razón social o RFC"
                            className="clp-input"
                        />
                    </div>

                    <div>
                        <label className="clp-label">Asignar cliente</label>
                        <select
                            {...register("clienteId")}
                            className="clp-input"
                        >
                            {clientesFiltrados.map((cliente) => (
                                <option key={cliente.id} value={cliente.id}>
                                    {cliente.folio} - {cliente.razonSocial}
                                </option>
                            ))}
                        </select>
                        {errors.clienteId ? <p className="text-xs text-red-600 mt-1">{errors.clienteId.message}</p> : null}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="clp-btn clp-btn-primary"
                    >
                        {isSubmitting ? "Guardando..." : "Guardar asignación"}
                    </button>

                    {message ? <p className="text-sm text-slate-600">{message}</p> : null}
                </form>
            </section>

            <aside className="h-fit rounded-[10px] bg-aduanaBlue p-5">
                <p className="text-sm text-white/70">Próximo paso a dar</p>
                <p className="mt-1 text-xl font-semibold text-white">{resumen.proximoPaso}</p>
                {resumen.alertasPendientes.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm text-white/70">Alertas pendientes</p>
                        <ul className="space-y-2 text-sm text-white">
                            {resumen.alertasPendientes.map((alerta) => (
                                <li key={alerta} className="rounded-lg bg-white/10 px-3 py-2">
                                    {alerta}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}
