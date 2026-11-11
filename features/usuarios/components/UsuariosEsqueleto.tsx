/** Esqueleto de Usuarios mientras llegan los datos: barra y tarjetas. */
export function UsuariosEsqueleto() {
  return (
    <div className="clp-cli" aria-busy="true" aria-label="Cargando usuarios">
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Gestión de Usuarios</h1>
      </div>
      <div className="clp-card clp-dt clp-dt-alt clp-dt-flotante clp-cli-tabla">
        <div className="clp-dt-toolbar"><span className="clp-esq" style={{ width: 380 }}><i style={{ height: 35, borderRadius: 8 }} /></span></div>
        <div className="clp-dt-altcont">
          <div className="clp-esq clp-esq-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="clp-esq-card clp-esq-usr"><i className="av" /><i className="l" /><i className="c" /><i className="pie" /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
