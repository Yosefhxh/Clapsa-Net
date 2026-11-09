import { Upload } from "lucide-react";
import { TipoOperacion, checklistPorOperacion } from "../types";

interface ChecklistSectionProps {
  tipoOperacion: TipoOperacion;
  documentos: Record<string, string>;
  onUploadDocumento: (documento: string, file: File | null) => void;
}

export function ChecklistSection({
  tipoOperacion,
  documentos,
  onUploadDocumento,
}: ChecklistSectionProps) {
  const checklistActual = checklistPorOperacion[tipoOperacion];
  const checklistCompletado = checklistActual.filter(
    (doc) => Boolean(documentos[doc])
  ).length;

  return (
    <div className="clp-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="clp-section-title">
          Checklist Documental
        </h3>
        <span className="clp-chip">
          {checklistCompletado}/{checklistActual.length} documentos
        </span>
      </div>

      <div className="space-y-3">
        {checklistActual.map((doc) => {
          const inputId = `doc-${doc.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          const cargado = documentos[doc];

          return (
            <div
              key={doc}
              className="clp-fila flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{doc}</p>
                <p className="text-xs text-slate-500">
                  {cargado ? `Archivo: ${cargado}` : "Sin archivo cargado"}
                </p>
              </div>
              <div>
                <input
                  id={inputId}
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    onUploadDocumento(doc, e.target.files?.[0] ?? null)
                  }
                />
                <label
                  htmlFor={inputId}
                  className="clp-btn clp-btn-secondary cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
