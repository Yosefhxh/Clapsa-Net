import { AlertCircle } from "lucide-react";

interface ClientesErrorAlertProps {
  error: string;
}

export function ClientesErrorAlert({ error }: ClientesErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="clp-alert">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-red-900 font-medium">Error</h3>
        <p className="text-red-800 text-sm mt-1">{error}</p>
      </div>
    </div>
  );
}
