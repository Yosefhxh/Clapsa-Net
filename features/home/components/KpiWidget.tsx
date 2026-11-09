import { AlertTriangle, Banknote, CheckCircle2, Clock, FileText, Package, Ship, Truck, UserRound, type LucideIcon } from "lucide-react";
import { TONOS, type DefinicionWidget, type IconoWidget, type WidgetElegido } from "../widgets";

const ICONOS: Record<IconoWidget, LucideIcon> = {
  caja: Package,
  alerta: AlertTriangle,
  documento: FileText,
  camion: Truck,
  reloj: Clock,
  check: CheckCircle2,
  usuario: UserRound,
  barco: Ship,
  dinero: Banknote,
};

interface Props {
  definicion: DefinicionWidget;
  eleccion: WidgetElegido;
  valor: number;
  activo?: boolean;
  onClick?: () => void;
  compacto?: boolean;
}

/** Indicador del Home: color por significado, número y aviso si pasa del límite. */
export function KpiWidget({ definicion, eleccion, valor, activo, onClick, compacto }: Props) {
  const Icono = ICONOS[definicion.icono];
  const alto = eleccion.umbral != null && valor > eleccion.umbral;
  const Etiqueta = onClick ? "button" : "div";

  return (
    <Etiqueta
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? activo : undefined}
      title={onClick ? `${definicion.descripcion} Pica para filtrar la tabla.` : definicion.descripcion}
      className={`clp-kpi ${alto ? "clp-kpi-alto" : ""} ${compacto ? "clp-kpi-compacto" : ""}`}
      style={{ "--c": TONOS[eleccion.tono].color } as React.CSSProperties}
    >
      <span className="clp-kpi-top">
        <span className="truncate">{definicion.titulo}</span>
        <Icono className="h-4 w-4 shrink-0" style={{ color: TONOS[eleccion.tono].color }} aria-hidden />
      </span>
      <b className="clp-kpi-valor">
        {valor}
        {alto ? <em>Revisar</em> : null}
      </b>
      <small className="clp-kpi-desc">{definicion.descripcion}</small>
    </Etiqueta>
  );
}
