import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
