import { OperacionesPagina } from "@/features/operaciones/components/OperacionesPagina";

export default function OperacionesPage({ searchParams }: { searchParams: Promise<{ nueva?: string; cliente?: string }> }) {
  return <OperacionesPagina params={searchParams} />;
}
