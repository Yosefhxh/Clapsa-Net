import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

export function LoginDateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Guardar fecha de ingreso en localStorage (solo primera vez)
    const STORAGE_KEY = "clapsa-login-date";
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }

    // Actualizar la hora cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
      <Calendar className="w-4 h-4" />
      <span suppressHydrationWarning>Ingreso: {formattedDate}</span>
    </div>
  );
}
