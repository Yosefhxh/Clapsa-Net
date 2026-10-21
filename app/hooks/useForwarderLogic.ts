import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForwarderClientNode } from "@/app/components/forwarders/ForwarderPanel";
import { uploadDocument } from '@/app/lib/actions/storage';

const encargoSchema = z.object({
  fechaVigencia: z.string().min(1, "La fecha de vigencia es obligatoria."),
  file: z.instanceof(File, { message: "Debes seleccionar un PDF de encargo." }),
});

export type EncargoFormValues = z.infer<typeof encargoSchema>;

function flattenClientes(nodes: ForwarderClientNode[]): ForwarderClientNode[] {
  return nodes.flatMap((node) => [node, ...(node.subclientes ? flattenClientes(node.subclientes) : [])]);
}

export function useForwarderLogic(
  clientes: ForwarderClientNode[],
  onUploadDocument?: (formData: FormData) => Promise<{ success: boolean; message: string; url?: string }>,
  onActualizarEncargo?: (input: { clienteId: number; pdfEncargoUrl: string; fechaVigenciaEncargo: Date; encargoConferido: boolean }) => Promise<{ success: boolean; message: string }>
) {
  const flatClientes = useMemo(() => flattenClientes(clientes), [clientes]);
  const [selectedId, setSelectedId] = useState<number | null>(flatClientes[0]?.id ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const selectedCliente = useMemo(
    () => flatClientes.find((cliente) => cliente.id === selectedId) ?? null,
    [flatClientes, selectedId],
  );

  const form = useForm<EncargoFormValues>({
    resolver: zodResolver(encargoSchema),
    values: {
      fechaVigencia: selectedCliente?.fechaVigenciaEncargo 
        ? new Date(selectedCliente.fechaVigenciaEncargo).toISOString().slice(0, 10) 
        : "",
      file: undefined as any
    }
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) form.setValue("file", acceptedFiles[0], { shouldValidate: true });
  };

  const dropzone = useDropzone({ onDrop, multiple: false, accept: { "application/pdf": [".pdf"] }, disabled: subiendo });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!selectedCliente) {
      setMensaje("Selecciona un cliente para registrar el encargo.");
      return;
    }
    setSubiendo(true);
    setMensaje("");

    try {
      const payload = new FormData();
      payload.append("file", values.file);
      payload.append("folder", "encargos");
      payload.append("prefix", `${selectedCliente.folio}-encargo`);

      if (!onUploadDocument || !onActualizarEncargo) {
        setMensaje("Acciones de backend no configuradas.");
        return;
      }

      const uploadResult = await onUploadDocument(payload);
      if (!uploadResult.success || !uploadResult.url) {
        setMensaje(uploadResult.message);
        return;
      }

      const updateResult = await onActualizarEncargo({
        clienteId: selectedCliente.id,
        pdfEncargoUrl: uploadResult.url,
        fechaVigenciaEncargo: new Date(`${values.fechaVigencia}T00:00:00.000Z`),
        encargoConferido: true,
      });

      setMensaje(updateResult.success ? "Encargo conferido actualizado correctamente." : updateResult.message);
    } finally {
      setSubiendo(false);
    }
  });

  return { flatClientes, selectedId, setSelectedId, selectedCliente, subiendo, mensaje, form, dropzone, onSubmit };
}