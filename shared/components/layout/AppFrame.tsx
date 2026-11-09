"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/shared/components/sidebar/Sidebar";
import { useSession } from "@/features/session";
import { Header } from "./Header";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (pathname !== "/login" && !user) {
      router.replace("/login");
      return;
    }

    if (pathname === "/login" && user) {
      router.replace("/");
    }
  }, [isReady, pathname, router, user]);

  if (!isReady) {
    return null;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="clp-marino flex h-screen flex-col overflow-hidden">
      <Header />
      {/* Desde tablet la pantalla clara contiene también el menú; en celular solo el contenido. */}
      <div className="flex min-h-0 flex-1 flex-col md:clp-pantalla md:mx-[50px] md:mb-[30px] md:flex-row md:overflow-hidden md:bg-lienzo lg:mb-16">
        <Sidebar />
        <main className="max-md:clp-pantalla min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 max-md:m-2 max-md:bg-lienzo sm:px-6 md:pl-5 lg:pl-11 lg:pr-12 lg:pt-12 lg:pb-12">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}