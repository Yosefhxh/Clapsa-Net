import { Upload } from "lucide-react";
import { TipoOperacion, checklistPorOperacion } from "./types";

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
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Checklist Documental
        </h3>
        <span className="text-xs px-3 py-1 rounded-lg bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 font-medium">
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
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-3 border border-slate-200 rounded-lg"
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
                  className="inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
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
