interface ClientesPageHeaderProps {
  title: string;
  description: string;
}

export function ClientesPageHeader({ title, description }: ClientesPageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  );
}
