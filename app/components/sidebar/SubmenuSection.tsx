import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { SubmenuItem } from "./SubmenuItem";

interface SubmenuLink {
  href: string;
  label: string;
}

interface SubmenuSectionProps {
  label: string;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  submenuItems: SubmenuLink[];
}

export function SubmenuSection({
  label,
  icon: Icon,
  isOpen,
  onToggle,
  isActive,
  submenuItems,
}: SubmenuSectionProps) {
  return (
    <li className="w-full">
      <button
        onClick={onToggle}
        className={`flex items-center justify-between py-3 pl-3 pr-4 w-full rounded-xl transition-all ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/10"
        }`}
      >
        <div className="flex items-center space-x-4">
          <Icon className="w-5 h-5" />
          <span className="font-medium text-[15px]">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 opacity-50" />
        ) : (
          <ChevronRight className="w-4 h-4 opacity-50" />
        )}
      </button>

      {isOpen && (
        <ul className="mt-1 ml-9 space-y-1 border-l border-white/20 pl-2">
          {submenuItems.map((item) => (
            <SubmenuItem key={item.href} href={item.href} label={item.label} />
          ))}
        </ul>
      )}
    </li>
  );
}
