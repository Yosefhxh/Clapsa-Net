import { CLIENTES_TABS, SectionTabs } from "@/shared/components/layout/SectionTabs";

interface ClientesPageHeaderProps {
  title: string;
  description: string;
}

export function ClientesPageHeader({ title, description }: ClientesPageHeaderProps) {
  return (
    <div className="clp-page-head">
      <h1 className="clp-page-title">{title}</h1>
      <p className="clp-page-sub mt-0.5 text-sm">{description}</p>
      <SectionTabs label="Clientes" tabs={CLIENTES_TABS} />
    </div>
  );
}
