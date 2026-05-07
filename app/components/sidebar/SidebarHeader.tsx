import Image from "next/image";
import Link from "next/link";

export function SidebarHeader() {
  return (
    <div className="flex flex-col items-center pt-6 pb-4 px-6">
      <div className="relative w-full h-20 flex items-center justify-center">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo Clapsa"
            width={180}
            height={70}
            priority
            className="object-contain"
          />
        </Link>
      </div>
      <div className="w-full h-[1px] bg-white/20 mt-4"></div>
    </div>
  );
}
