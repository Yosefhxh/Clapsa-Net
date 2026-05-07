import { Package, Truck, Inbox } from "lucide-react";
import { StatWidget } from "./StatWidget";

export function StatisticsGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <StatWidget title="Por Despachar" icon={Package} />
      <StatWidget title="Ambos" icon={Package} />
      <StatWidget title="En vacío" icon={Inbox} />
      <StatWidget title="Tráfico Activo" icon={Truck} />
      <StatWidget title="Cuentas Abiertas" icon={Inbox} />
      <StatWidget title="Cuentas Cerradas" icon={Inbox} />
    </div>
  );
}
