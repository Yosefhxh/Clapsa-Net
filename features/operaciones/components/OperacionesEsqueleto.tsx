import { COLUMNAS_TABLERO } from "../domain/proceso";

/** Esqueleto de Operaciones mientras llegan los datos: barra y tablero de 6 columnas. */
export function OperacionesEsqueleto() {
  return (
    <div className="clp-cli clp-ops" aria-busy="true" aria-label="Cargando operaciones">
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Operaciones</h1>
      </div>
      <div className="clp-card clp-dt clp-dt-alt clp-dt-flotante clp-cli-tabla">
        <div className="clp-dt-toolbar"><span className="clp-esq" style={{ width: 380 }}><i style={{ height: 35, borderRadius: 8 }} /></span></div>
        <div className="clp-dt-altcont">
          <div className="clp-kb clp-esq">
            {COLUMNAS_TABLERO.map((c, n) => (
              <section key={c.id} className="clp-kb-col" style={{ "--c": c.color } as React.CSSProperties}>
                <header><i /><b>{c.nombre}</b></header>
                <div className="clp-kb-lista">
                  {Array.from({ length: n % 3 === 0 ? 2 : 1 }, (_, k) => <div key={k} className="clp-kb-esq"><i className="l" /><i className="c" /><i className="pie" /></div>)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
