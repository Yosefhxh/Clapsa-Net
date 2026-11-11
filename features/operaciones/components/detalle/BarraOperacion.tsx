import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatoFecha } from "@/shared/utils/formato";
import type { OperacionDetalle } from "../../types/vistas";
import { PillSituacion, TipoClienteBadge, TipoOperacionTag } from "../etiquetas";

const SEMAFORO: Record<string, [string, string]> = { VERDE: ["#2E9E7A", "Verde"], ROJO: ["#E0614F", "Rojo"] };

/** Encabezado compacto de la operación: lo esencial en una línea y el próximo paso como botón. */
export function BarraOperacion({ op, alProximo }: { op: OperacionDetalle; alProximo: () => void }) {
  const [color, texto] = op.semaforo ? SEMAFORO[op.semaforo] : ["#C9D1E0", "Sin modular"];
  return (
    <section className="clp-card clp-op-barra">
      <Link href="/operaciones" className="clp-rc-volver" title="Volver a Operaciones" aria-label="Volver a Operaciones"><ChevronLeft aria-hidden /></Link>
      <div className="clp-ob-folio"><small>Operación</small><h1 className="clp-mono">{op.folio}</h1></div>
      <div className="clp-ob-cli">
        <small>Cliente</small>
        <div>{op.cliente ? <>{op.cliente.razonSocial} <TipoClienteBadge tipo={op.cliente.tipo} /></> : <span className="clp-ob-tenue">Sin cliente asignado</span>}</div>
        {op.cliente?.tipo === "FORWARDER" && op.importador ? <div className="clp-ob-tenue">Importador: {op.importador.razonSocial}</div> : null}
      </div>
      <div className="clp-ob-dato"><small>Tipo · Aduana</small><span><TipoOperacionTag tipo={op.tipo} /> {op.aduana}</span></div>
      <div className="clp-ob-dato"><small>ETA</small><b>{op.eta ? formatoFecha(op.eta) : "—"}</b></div>
      <div className="clp-ob-dato"><small>Pedimento</small><b className={op.numeroPedimento ? "clp-mono" : ""}>{op.numeroPedimento ?? "—"}</b></div>
      <div className="clp-ob-dato"><small>Semáforo</small><span className="clp-ob-sem"><i style={{ background: color }} />{texto}</span></div>
      <div className="clp-ob-dato"><small>Fase</small><b>{op.fase} de 8 · {op.fases[op.fase - 1]}</b><span className="clp-ob-tenue">{op.avance.completados}/{op.avance.total} pasos · {op.avance.porcentaje}%</span></div>
      <PillSituacion situacion={op.situacion} />
      <button type="button" className="clp-btn clp-btn-primary clp-ob-sig" onClick={alProximo}>
        <span>Próximo paso</span><b>{op.proximoPaso}</b><ChevronRight aria-hidden />
      </button>
    </section>
  );
}
