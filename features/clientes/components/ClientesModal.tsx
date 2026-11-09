"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { extractPdfData } from "@/shared/utils/extractPdfData";
import { Cliente, FormDataCliente, ModalMode } from "../types/clientes-types";
import { construirDomicilio } from "../utils/clientes-utils";

interface ClientesModalProps {
  open: boolean;
  mode: ModalMode;
  formData: FormDataCliente;
  error: string;
  isScanning: boolean;
  isSaving: boolean;
  clienteEditando: Cliente | null;
  onClose: () => void;
  onChangeFormData: (data: FormDataCliente) => void;
  onSubmit: () => void;
  onUploadData: (data: FormDataCliente) => void;
  onErrorChange: (error: string) => void;
  onScanningChange: (value: boolean) => void;
}

export function ClientesModal({
  open,
  mode,
  formData,
  error,
  isScanning,
  isSaving,
  onClose,
  onChangeFormData,
  onSubmit,
  onUploadData,
  onErrorChange,
  onScanningChange,
}: ClientesModalProps) {
  const onDropModal = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      onScanningChange(true);
      onErrorChange("");

      try {
        const datosExtraidos = await extractPdfData(file);
        if (!datosExtraidos.rfc) {
          onErrorChange(
            "No se pudo encontrar el RFC en el PDF. Verifica que sea una Constancia de Situación Fiscal válida."
          );
          onScanningChange(false);
          return;
        }

        onUploadData({
          razonSocial: datosExtraidos.razonSocial || "",
          rfc: datosExtraidos.rfc,
            calle: "",
          estado: "",
          codigoPostal: "",
          domicilio: datosExtraidos.domicilio || "No especificado",
        });
      } catch (err) {
        console.error("Error procesando PDF:", err);
        onErrorChange("Error al procesar el PDF. Intenta con otro archivo.");
      } finally {
        onScanningChange(false);
      }
    },
    [onErrorChange, onScanningChange, onUploadData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropModal,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 5242880,
    multiple: false,
    disabled: isScanning,
  });

  if (!open) return null;

  return (
    <div className="clp-modal-scrim">
      <div className="clp-modal">
        <div className="clp-modal-head">
          <h2 className="clp-modal-title">
            {mode === "edit" ? "Editar Cliente" : "Registrar Nuevo Cliente"}
          </h2>
          <button onClick={onClose} className="clp-icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="clp-label">Cargar Constancia Fiscal (Opcional)</label>
            <div
              {...getRootProps()}
              className={`clp-dropzone ${
                isDragActive ? "clp-dropzone-activa" : ""
              }`}
            >
              <input {...getInputProps()} />
              {isScanning ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-aduanaBlue animate-spin mb-2" />
                  <p className="text-sm font-medium text-slate-700">Extrayendo...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-aduanaBlue mb-2" />
                  <p className="text-sm font-medium text-slate-700">Arrastra o haz clic aquí</p>
                  <p className="text-xs text-slate-500 mt-1">Solo PDF (Máx. 5MB)</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="clp-alert">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="clp-label">Razón Social</label>
              <input
                type="text"
                value={formData.razonSocial}
                onChange={(e) => onChangeFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Nombre de la empresa o persona"
                className="clp-input"
              />
            </div>

            <div>
              <label className="clp-label">RFC *</label>
              <input
                type="text"
                value={formData.rfc}
                onChange={(e) => onChangeFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="RFC (obligatorio)"
                maxLength={13}
                className="clp-input"
              />
              <p className="text-xs text-slate-500 mt-1">Entre 12 y 13 caracteres</p>
            </div>

            <div>
              <label className="clp-label">Calle</label>
              <input
                type="text"
                value={formData.calle}
                onChange={(e) => {
                  const calle = e.target.value;
                  const domicilio = construirDomicilio(calle, formData.estado, formData.codigoPostal);
                  onChangeFormData({ ...formData, calle, domicilio });
                }}
                placeholder="Calle y número"
                className="clp-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="clp-label">Estado</label>
                <input
                  type="text"
                  value={formData.estado}
                  onChange={(e) => {
                    const estado = e.target.value;
                    const domicilio = construirDomicilio(formData.calle, estado, formData.codigoPostal);
                    onChangeFormData({ ...formData, estado, domicilio });
                  }}
                  placeholder="Estado"
                  className="clp-input"
                />
              </div>

              <div>
                <label className="clp-label">Código Postal</label>
                <input
                  type="text"
                  value={formData.codigoPostal}
                  onChange={(e) => {
                    const codigoPostal = e.target.value;
                    const domicilio = construirDomicilio(formData.calle, formData.estado, codigoPostal);
                    onChangeFormData({ ...formData, codigoPostal, domicilio });
                  }}
                  placeholder="00000"
                  maxLength={5}
                  className="clp-input"
                />
              </div>
            </div>

            <div>
              <label className="clp-label">Domicilio completo</label>
              <input
                type="text"
                value={formData.domicilio}
                readOnly
                placeholder="Se completará automáticamente"
                className="clp-input"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="clp-btn clp-btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={isSaving || isScanning || !formData.rfc.trim()}
              className="clp-btn clp-btn-primary flex-1"
            >
              {isSaving ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
              {isSaving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
