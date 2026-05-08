export interface WidgetDef {
  id: string;
  title: string;
  icon: string; // lucide icon key
  color?: string;
}

export const DEFAULT_WIDGETS: WidgetDef[] = [
  { id: "por_despachar", title: "Por Despachar", icon: "Package", color: "bg-yellow-50" },
  { id: "ambos", title: "Ambos", icon: "Package", color: "bg-sky-50" },
  { id: "en_vacio", title: "En vacío", icon: "Inbox", color: "bg-rose-50" },
  { id: "trafico_activo", title: "Tráfico Activo", icon: "Truck", color: "bg-emerald-50" },
  { id: "cuentas_abiertas", title: "Cuentas Abiertas", icon: "Inbox", color: "bg-indigo-50" },
  { id: "cuentas_cerradas", title: "Cuentas Cerradas", icon: "Inbox", color: "bg-gray-50" },
  // Additional widgets requested by user (preserve existing ones above)
  { id: "por_revalia", title: "Por revalia", icon: "AlertCircle", color: "bg-red-50" },
  { id: "por_pagar_pedimento", title: "Por pagar pedimento", icon: "FileText", color: "bg-amber-50" },
  { id: "proximo_a_llegar", title: "Proximo a llegar", icon: "Clock", color: "bg-lime-50" },
  { id: "en_transito", title: "En transito", icon: "Truck", color: "bg-emerald-50" },
  { id: "entrega_vacia", title: "Entrega vacia", icon: "Inbox", color: "bg-rose-50" },
  { id: "corte_de_demoras", title: "Corte de demoras", icon: "AlertCircle", color: "bg-red-50" },
  { id: "recuperacion_de_carta", title: "recuperacion de carta", icon: "FileText", color: "bg-amber-50" },
  { id: "garantias_por_recuperar", title: "garantias por recuperar", icon: "Shield", color: "bg-cyan-50" },
  { id: "cuentas_gastos", title: "Cuentas gastos", icon: "DollarSign", color: "bg-emerald-50" },
  { id: "despacho_sin_frenar", title: "Despacho sin frenar", icon: "ArrowRightCircle", color: "bg-fuchsia-50" },
];
