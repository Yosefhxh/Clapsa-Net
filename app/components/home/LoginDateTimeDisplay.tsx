"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { LOGIN_DATE_STORAGE_KEY } from "@/app/components/session/SessionProvider";

export function LoginDateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginDate, setLoginDate] = useState<string | null>(null);

  useEffect(() => {
    setLoginDate(localStorage.getItem(LOGIN_DATE_STORAGE_KEY));

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

  const formattedLoginDate = loginDate
    ? new Date(loginDate).toLocaleString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Sesión no iniciada";

  return (
    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
      <Calendar className="w-4 h-4" />
      <span suppressHydrationWarning>
        {loginDate ? `Ingreso: ${formattedLoginDate}` : `Hora actual: ${formattedDate}`}
      </span>
    </div>
  );
}
