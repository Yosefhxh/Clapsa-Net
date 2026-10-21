"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";


const containerSchema = z.object({
  numeroContenedor: z.string().min(4, "El número de contenedor es obligatorio."),
  tipoContenedor: z.string().optional(),
  naviera: z.string().optional(),
  precinto: z.string().optional(),
});

const containerManagerSchema = z.object({
  contenedores: z.array(containerSchema).min(1, "Debes registrar al menos un contenedor."),
});

type ContainerManagerValues = z.infer<typeof containerManagerSchema>;

export interface ContainerManagerProps {
  traficoId: string;
  onSubmitContainers?: (input: {
    traficoId: string;
    contenedores: ContainerManagerValues["contenedores"];
  }) => Promise<{ success: boolean; message: string }>;
}

export function ContainerManager({ traficoId, onSubmitContainers }: ContainerManagerProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContainerManagerValues>({
    resolver: zodResolver(containerManagerSchema),
    defaultValues: {
      contenedores: [
        {
          numeroContenedor: "",
          tipoContenedor: "",
          naviera: "",
          precinto: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contenedores",
  });

  const onSubmit = handleSubmit(async (values) => {
    if (onSubmitContainers) {
      await onSubmitContainers({
        traficoId,
        contenedores: values.contenedores,
      });
    } else {
      // TODO: Llamar a action para guardar contenedores vinculados al tráfico
    }

    reset({
      contenedores: [
        {
          numeroContenedor: "",
          tipoContenedor: "",
          naviera: "",
          precinto: "",
        },
      ],
    });
  });

  return (
    <section className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Gestor de Contenedores</h3>
        <button
          type="button"
          onClick={() =>
            append({
              numeroContenedor: "",
              tipoContenedor: "",
              naviera: "",
              precinto: "",
            })
          }
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar otro contenedor
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Contenedor {index + 1}</p>
              {fields.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Número de contenedor</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.numeroContenedor`)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                />
                {errors.contenedores?.[index]?.numeroContenedor ? (
                  <p className="text-xs text-red-600 mt-1">{errors.contenedores[index]?.numeroContenedor?.message}</p>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Tipo de contenedor</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.tipoContenedor`)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Naviera</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.naviera`)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Precinto</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.precinto`)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-aduanaBlue text-white rounded-lg hover:bg-aduanaBlue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Guardando..." : "Guardar contenedores"}
        </button>
      </form>
    </section>
  );
}
