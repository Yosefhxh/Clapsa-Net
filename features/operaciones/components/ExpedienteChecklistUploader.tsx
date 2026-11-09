"use client";

import { uploadDocument } from '@/shared/actions/storage';
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";

const checklistByOperacion = {
  IMPO: ["FACTURA", "BL", "PL", "CO", "PERMISOS", "CM", "HT"],
  EXPO: ["FACTURA", "PL", "HS", "FOTOS", "OTROS"],
} as const;

const uploaderSchema = z.object({
  documento: z.string().min(1, "Selecciona un tipo de documento."),
  file: z.instanceof(File, { message: "Debes seleccionar un PDF." }),
});

type UploaderFormValues = z.infer<typeof uploaderSchema>;

export interface UploadDocumentActionResult {
  success: boolean;
  message: string;
  url?: string;
}

export interface ExpedienteChecklistUploaderProps {
  traficoId: string;
  tipoOperacion: "IMPO" | "EXPO";
  onUploadDocument?: (formData: FormData) => Promise<UploadDocumentActionResult>;
}

export function ExpedienteChecklistUploader({
  traficoId,
  tipoOperacion,
  onUploadDocument,
}: ExpedienteChecklistUploaderProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [uploadedMap, setUploadedMap] = useState<Record<string, string>>({});

  const checklist = checklistByOperacion[tipoOperacion];

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploaderFormValues>({
    resolver: zodResolver(uploaderSchema),
    defaultValues: {
      documento: checklist[0],
    },
  });

  const selectedFile = watch("file");

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setValue("file", file, { shouldValidate: true });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    disabled: subiendo,
  });

  const completados = useMemo(
    () => checklist.filter((item) => Boolean(uploadedMap[item])).length,
    [checklist, uploadedMap],
  );

  const onSubmit = handleSubmit(async (values) => {
    setSubiendo(true);
    setMensaje("");

    try {
      const payload = new FormData();
      payload.append("file", values.file);
      payload.append("folder", "expedientes");
      payload.append("prefix", `${traficoId}-${values.documento.toLowerCase()}`);

      let result: UploadDocumentActionResult = {
        success: false,
        message: "No hay action de carga configurada.",
      };

      if (onUploadDocument) {
        result = await onUploadDocument(payload);
      } else {
        result = await uploadDocument(payload);
      }

      if (!result.success || !result.url) {
        setMensaje(result.message);
        return;
      }

      setUploadedMap((prev) => ({
        ...prev,
        [values.documento]: result.url as string,
      }));
      setMensaje("Documento cargado correctamente.");
      reset({ documento: values.documento });
    } finally {
      setSubiendo(false);
    }
  });

  return (
    <section className="clp-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="clp-section-title">Expediente Digital</h3>
        <span className="clp-chip">
          {completados}/{checklist.length} cargados
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="space-y-2">
          {checklist.map((doc) => {
            const listo = Boolean(uploadedMap[doc]);
            return (
              <div key={doc} className="flex items-center justify-between clp-dato">
                <span className="text-sm font-medium text-slate-700">{doc}</span>
                <span className={listo ? "text-green-600" : "text-slate-600"}>{listo ? "✅" : "○"}</span>
              </div>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="clp-label">Documento a cargar</label>
            <select
              {...register("documento")}
              className="clp-input"
            >
              {checklist.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.documento ? <p className="text-xs text-red-600 mt-1">{errors.documento.message}</p> : null}
          </div>

          <div
            {...getRootProps()}
            className={`clp-dropzone ${
              isDragActive ? "clp-dropzone-activa" : ""
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center gap-2">
              <UploadCloud className="w-6 h-6 text-aduanaBlue" />
              <p className="text-sm font-medium text-slate-700">Arrastra tu PDF o haz clic para seleccionarlo</p>
              <p className="text-xs text-slate-500">Solo PDF</p>
              {selectedFile ? <p className="text-xs text-green-700 font-medium">Seleccionado: {selectedFile.name}</p> : null}
            </div>
          </div>
          {errors.file ? <p className="text-xs text-red-600">{errors.file.message}</p> : null}

          <button
            type="submit"
            disabled={subiendo}
            className="clp-btn clp-btn-primary"
          >
            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {subiendo ? "Subiendo..." : "Cargar documento"}
          </button>

          {mensaje ? <p className="text-sm text-slate-600">{mensaje}</p> : null}
        </form>
      </div>
    </section>
  );
}
