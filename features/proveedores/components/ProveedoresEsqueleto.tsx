/** Esqueleto de Proveedores mientras llegan los datos: barra y 8 tarjetas. */
export function ProveedoresEsqueleto() {
  return (
    <div className="clp-cli" aria-busy="true" aria-label="Cargando proveedores">
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Proveedores</h1>
      </div>
      <div className="clp-card clp-dt clp-dt-alt clp-dt-flotante clp-cli-tabla">
        <div className="clp-dt-toolbar"><span className="clp-esq" style={{ width: 380 }}><i style={{ height: 35, borderRadius: 8 }} /></span></div>
        <div className="clp-dt-altcont">
          <div className="clp-esq clp-esq-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="clp-esq-card"><div className="clp-esq-top"><i className="av" /><i className="pl" /></div><i className="l" /><i className="c" /><i className="pie" /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
