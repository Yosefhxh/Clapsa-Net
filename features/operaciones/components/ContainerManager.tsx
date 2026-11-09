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
    <section className="clp-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="clp-section-title text-lg">Gestor de Contenedores</h3>
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
          className="clp-btn clp-btn-secondary"
        >
          <Plus className="w-4 h-4" />
          Agregar otro contenedor
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="clp-fila p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="clp-section-title">Contenedor {index + 1}</p>
              {fields.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="clp-btn clp-btn-danger clp-btn-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="clp-label">Número de contenedor</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.numeroContenedor`)}
                  className="clp-input"
                />
                {errors.contenedores?.[index]?.numeroContenedor ? (
                  <p className="text-xs text-red-600 mt-1">{errors.contenedores[index]?.numeroContenedor?.message}</p>
                ) : null}
              </div>

              <div>
                <label className="clp-label">Tipo de contenedor</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.tipoContenedor`)}
                  className="clp-input"
                />
              </div>

              <div>
                <label className="clp-label">Naviera</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.naviera`)}
                  className="clp-input"
                />
              </div>

              <div>
                <label className="clp-label">Precinto</label>
                <input
                  type="text"
                  {...register(`contenedores.${index}.precinto`)}
                  className="clp-input"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="clp-btn clp-btn-primary"
        >
          {isSubmitting ? "Guardando..." : "Guardar contenedores"}
        </button>
      </form>
    </section>
  );
}
