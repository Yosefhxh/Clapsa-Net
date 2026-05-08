import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar";
import { User } from "lucide-react";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CLAPSA NET - Tablero de Operaciones",
  description: "Gestión eficiente de operaciones aduaneras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-100`}>
        <div className="flex min-h-screen overflow-hidden bg-slate-100">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 bg-background">
            <header className="flex h-16 items-center justify-end border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <User className="h-4 w-4 text-slate-600"/>
                </div>
                <span>Joseph R.</span>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-none">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}