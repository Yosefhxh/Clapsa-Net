import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/app/components/session/SessionProvider";
import { AppFrame } from "@/app/components/layout/AppFrame";
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
        <SessionProvider>
          <AppFrame>{children}</AppFrame>
        </SessionProvider>
      </body>
    </html>
  );
}