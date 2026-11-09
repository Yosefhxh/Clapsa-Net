import { EstadoOperacion, TipoCliente, TipoOperacion, aduanas } from "../types";

interface MasterDataSectionProps {
  operacion: EstadoOperacion;
  onCambioOperacion: <K extends keyof EstadoOperacion>(
    campo: K,
    valor: EstadoOperacion[K]
  ) => void;
  onTipoOperacion: (tipo: TipoOperacion) => void;
}

export function MasterDataSection({
  operacion,
  onCambioOperacion,
  onTipoOperacion,
}: MasterDataSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 border-b border-slate-100">
      <div>
        <p className="clp-label">
          Cliente (Ficticio)
        </p>
        <input
          type="text"
          value={operacion.clienteNombre}
          onChange={(e) =>
            onCambioOperacion("clienteNombre", e.target.value)
          }
          className="clp-input"
        />
      </div>
      <div>
        <p className="clp-label">
          Tipo de Cliente
        </p>
        <select
          value={operacion.clienteTipo}
          onChange={(e) =>
            onCambioOperacion("clienteTipo", e.target.value as TipoCliente)
          }
          className="clp-input"
        >
          <option value="DIRECTO">Directo</option>
          <option value="FORWARDER">Forwarder</option>
        </select>
      </div>
      <div>
        <p className="clp-label">RFC</p>
        <input
          type="text"
          value={operacion.rfc}
          onChange={(e) =>
            onCambioOperacion("rfc", e.target.value.toUpperCase())
          }
          className="clp-input"
        />
      </div>
      <div>
        <p className="clp-label">
          Aduana
        </p>
        <select
          value={operacion.aduana}
          onChange={(e) => onCambioOperacion("aduana", e.target.value)}
          className="clp-input"
        >
          {aduanas.map((aduana) => (
            <option key={aduana} value={aduana}>
              {aduana}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="clp-label">
          Tipo de Operacion
        </p>
        <select
          value={operacion.tipoOperacion}
          onChange={(e) => onTipoOperacion(e.target.value as TipoOperacion)}
          className="clp-input"
        >
          <option value="IMPO">IMPO</option>
          <option value="EXPO">EXPO</option>
        </select>
      </div>
      <div>
        <p className="clp-label">
          {operacion.tipoOperacion === "IMPO" ? "ETA" : "ETD"}
        </p>
        <input
          type="date"
          value={
            operacion.tipoOperacion === "IMPO" ? operacion.eta : operacion.etd
          }
          onChange={(e) =>
            operacion.tipoOperacion === "IMPO"
              ? onCambioOperacion("eta", e.target.value)
              : onCambioOperacion("etd", e.target.value)
          }
          className="clp-input"
        />
      </div>
    </div>
  );
}
