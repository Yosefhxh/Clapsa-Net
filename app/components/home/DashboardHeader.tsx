import { LoginDateTimeDisplay } from "./LoginDateTimeDisplay";

export function DashboardHeader() {
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold text-gray-950">Tablero de Operaciones</h1>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-gray-600">
          Bienvenido a <span className="font-semibold text-aduanaBlue">Clapsa Net</span>
        </p>
        <span className="text-gray-300">|</span>
        <LoginDateTimeDisplay />
      </div>
    </div>
  );
}
