import { LucideIcon } from "lucide-react";

interface StatWidgetProps {
  title: string;
  icon: LucideIcon;
}

export function StatWidget({ title, icon: Icon }: StatWidgetProps) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="p-2.5 rounded-full bg-blue-50">
          <Icon className="w-5 h-5 text-aduanaBlue" />
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-900">0</p>
      <p className="text-xs text-gray-500 mt-1">Operaciones hoy</p>
    </div>
  );
}
