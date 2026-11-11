import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/features/session";
import { AppFrame } from "@/shared/components/layout/AppFrame";
import { obtenerUsuarioActual } from "@/shared/auth/session";
import { obtenerAvisosMenu } from "@/shared/lib/avisos-menu";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Plus Jakarta Sans solo en el inicio de sesión (igual que en producción).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "CLAPSA NET - Control de Tráficos",
  description: "Estatus y tiempos de cada importación y exportación",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await obtenerUsuarioActual();
  const avisos = usuario ? await obtenerAvisosMenu() : null;

  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="bg-lienzo font-sans">
        <SessionProvider usuario={usuario} avisos={avisos}>
          <AppFrame>{children}</AppFrame>
        </SessionProvider>
      </body>
    </html>
  );
}
