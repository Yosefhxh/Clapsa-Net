import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar" 
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
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 bg-background">
            <header className="flex items-center justify-end h-16 px-6 bg-white border-b-2 border-aduanaBlue/30 shadow-sm shadow-blue-900/5">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600"/>
                </div>
                <span>Joseph R.</span>
              </div>
            </header>
            <main className="flex-1 px-6 py-8 overflow-y-auto bg-slate-50">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}