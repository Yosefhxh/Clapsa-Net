import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface MenuItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}

export function MenuItem({ href, label, icon: Icon, isActive }: MenuItemProps) {
  return (
    <li className="w-full">
      <Link
        href={href}
        className={`flex items-center justify-start py-3 pl-3 space-x-4 w-full rounded-xl transition-all ${
          isActive
            ? "bg-white/20 text-white"
            : "text-white/70 hover:bg-white/10"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium text-[15px]">{label}</span>
      </Link>
    </li>
  );
}
