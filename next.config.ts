import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Los PDF (constancias y documentos) se suben por acciones del servidor y pueden pesar
    // hasta 5 MB; el límite por omisión es 1 MB. Se deja margen para el resto del formulario.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async redirects() {
    return [
      // Proveedores ahora es una sola página.
      { source: "/proveedores/alta", destination: "/proveedores", permanent: true },
      { source: "/proveedores/busqueda", destination: "/proveedores", permanent: true },
      { source: "/operaciones/despacho-aduanal", destination: "/operaciones", permanent: false },
    ];
  },
};

export default nextConfig;
