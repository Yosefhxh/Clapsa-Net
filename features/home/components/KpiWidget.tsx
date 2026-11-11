import { Clock, Eye, FileText, Package, TriangleAlert, Truck, type LucideIcon } from "lucide-react";
import { TONOS, type DefinicionWidget } from "../widgets";

/** Ícono de cada widget del Home, como en el diseño aprobado. */
const ICONOS: Record<string, LucideIcon> = {
  por_despachar: Package,
  reconocimiento: TriangleAlert,
  por_pagar: FileText,
  trafico_activo: Truck,
  proximo_llegar: Clock,
  desaduanadas: Eye,
};

interface Props extends Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> {
  definicion: DefinicionWidget;
  valor: number;
  nota: string;
  activo: boolean;
  onClick: () => void;
}

/** Widget del Home: título con ícono, número y nota. Al picarlo filtra "Requieren atención". */
export function KpiWidget({ definicion, valor, nota, activo, onClick, ...resto }: Props) {
  const Icono = ICONOS[definicion.id] ?? Package;
  return (
    <button
      {...resto}
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={`${definicion.descripcion} Pica para filtrar Requieren atención.`}
      className="clp-kpi"
      style={{ "--c": TONOS[definicion.tono].color } as React.CSSProperties}
    >
      <span className="clp-kpi-top">
        {definicion.titulo}
        <Icono aria-hidden />
      </span>
      <b className="clp-kpi-valor">{valor}</b>
      <small className="clp-kpi-nota">{nota}</small>
    </button>
  );
}
