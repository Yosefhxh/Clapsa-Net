/** Esqueleto del detalle de operación: barra, pestañas, fases y tabla. */
export function OperacionEsqueleto() {
  return (
    <div className="clp-op-detalle clp-esq" aria-busy="true" aria-label="Cargando operación">
      <div className="clp-card clp-op-barra"><i style={{ width: "100%", height: 38, borderRadius: 8 }} /></div>
      <div className="clp-op-tabs"><i style={{ width: 560, maxWidth: "100%", height: 36, borderRadius: 8 }} /></div>
      <div className="clp-proceso">
        <div className="clp-card clp-fases-nav">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ height: 36, margin: "6px 4px", borderRadius: 8 }} />)}</div>
        <div className="clp-proceso-cont"><div className="clp-card" style={{ padding: 16 }}>{Array.from({ length: 4 }, (_, i) => <i key={i} style={{ height: 32, margin: "10px 0", borderRadius: 6 }} />)}</div></div>
      </div>
    </div>
  );
}
