/** Esqueleto del Home mientras llegan las operaciones: misma forma que la pantalla final. */
export function HomeEsqueleto() {
  return (
    <div className="clp-home" aria-busy="true" aria-label="Cargando el tablero">
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Control de Tráficos</h1>
      </div>
      <div className="clp-kpis">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="clp-kpi clp-esq-bloque">
            <span className="clp-kpi-top">&nbsp;<svg width="34" height="34" /></span>
            <b className="clp-kpi-valor">0</b>
            <small className="clp-kpi-nota">&nbsp;</small>
          </div>
        ))}
      </div>
      <div className="clp-home-grid">
        <div className="clp-card clp-dt">
          <div className="clp-dt-toolbar"><span className="clp-esq" style={{ width: 380 }}><i style={{ height: 35, borderRadius: 8 }} /></span></div>
          <div className="clp-esq clp-esq-tabla">
            <div className="clp-esq-fila h">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="clp-esq-fila"><i /><i className="l" /><i className="p" /><i className="p" /><i className="c" /></div>
            ))}
          </div>
        </div>
        <div className="clp-home-avisos">
          <div className="clp-card clp-lado clp-esq-bloque" style={{ minHeight: 208 }} />
          <div className="clp-card clp-lado clp-esq-bloque" style={{ minHeight: 208 }} />
        </div>
      </div>
    </div>
  );
}
