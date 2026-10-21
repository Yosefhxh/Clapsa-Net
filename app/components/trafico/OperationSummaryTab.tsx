"use client";

import { asignarClienteDespacho } from '@/app/lib/actions/despacho';
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientOption, OperationSummaryData } from "./types";

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
    } = useForm<ClientSelectorFormValues>({
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
            <section className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Detalles del Embarque</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="px-3 py-2 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-500">Aduana</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.aduana || "-"}</p>
                    </div>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-500">Tipo de operación</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.tipoOperacion}</p>
                    </div>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg md:col-span-2">
                        <p className="text-xs text-slate-500">ETA</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.eta ?? "-"}</p>
                    </div>
                    <div className="px-3 py-2 border border-slate-200 rounded-lg md:col-span-2">
                        <p className="text-xs text-slate-500">RFC del cliente</p>
                        <p className="text-sm font-medium text-slate-800">{resumen.rfc || "-"}</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Buscar cliente</label>
                        <input
                            type="text"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Folio, razón social o RFC"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Asignar cliente</label>
                        <select
                            {...register("clienteId")}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
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
                        className="px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Guardando..." : "Guardar asignación"}
                    </button>

                    {message ? <p className="text-sm text-slate-600">{message}</p> : null}
                </form>
            </section>

            <aside className="bg-aduanaBlue/5 border border-aduanaBlue/20 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-aduanaBlue font-semibold">Próximo paso a dar</p>
                <p className="mt-2 text-sm font-medium text-slate-700">{resumen.proximoPaso}</p>
                {resumen.alertasPendientes.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Alertas pendientes</p>
                        <ul className="space-y-2 text-sm text-slate-600">
                            {resumen.alertasPendientes.map((alerta) => (
                                <li key={alerta} className="px-3 py-2 rounded-lg bg-white border border-slate-200">
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
