import { LucideIcon } from "lucide-react";

interface StatWidgetProps {
  title: string;
  icon?: LucideIcon;
  color?: string; // tailwind bg-* class for icon background
}

export function StatWidget({ title, icon: Icon, color = "bg-blue-50" }: StatWidgetProps) {
  return (
    <div className="clp-stat flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="clp-stat-valor">0</p>
        <h3 className="mt-2 text-sm font-medium text-slate-600">{title}</h3>
      </div>
      <div className={`clp-stat-icono ${color}`}>
        {Icon ? <Icon className="w-5 h-5 text-aduanaBlue" /> : null}
      </div>
    </div>
  );
}
