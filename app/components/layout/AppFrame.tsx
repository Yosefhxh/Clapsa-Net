"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { UserSessionBadge } from "@/app/components/session/UserSessionBadge";
import { useSession } from "@/app/components/session/SessionProvider";

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
    <div className="flex min-h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-16 items-center justify-end border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
          <UserSessionBadge />
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}