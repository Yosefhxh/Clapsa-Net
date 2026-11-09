import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface SubmenuItemProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  isCurrent?: boolean;
  onSelect?: () => void;
}

export function SubmenuItem({ href, label, icon: Icon, isCurrent, onSelect }: SubmenuItemProps) {
  return (
    <li>
      <Link
        href={href}
        aria-current={isCurrent ? "page" : undefined}
        onClick={onSelect}
        className="block py-1.5 text-[13px] text-white/75 hover:text-white transition-colors"
      >
        {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
        {label}
      </Link>
    </li>
  );
}
