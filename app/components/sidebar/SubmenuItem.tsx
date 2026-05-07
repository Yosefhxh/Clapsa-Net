import Link from "next/link";

interface SubmenuItemProps {
  href: string;
  label: string;
}

export function SubmenuItem({ href, label }: SubmenuItemProps) {
  return (
    <li>
      <Link
        href={href}
        className="block py-2 text-[14px] text-white/60 hover:text-white transition-colors"
      >
        {label}
      </Link>
    </li>
  );
}
