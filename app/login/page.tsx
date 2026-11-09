"use client";

import { Loader2 } from "lucide-react";
import { useLogin } from "@/features/session";
import { BrandMark } from "@/shared/components/layout/BrandMark";

export default function LoginPage() {
  const { form, errors, isSubmitting, updateField, submitLogin } = useLogin();

  return (
    <div className="clp-marino flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-10 lg:gap-24">
        <section className="flex max-w-[30rem] flex-col text-white">
          <BrandMark size="login" />
          <h1 className="mt-8 hidden text-3xl font-bold leading-tight md:block lg:text-5xl">
            Control de Tráficos
          </h1>
          <p className="mt-3 hidden text-base leading-7 text-white/80 md:block lg:text-lg">
            Estatus y tiempos de cada importación y exportación
          </p>
        </section>

        <section className="clp-card p-8 sm:p-10">
          <h2 className="clp-page-title">Acceder al sistema</h2>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              submitLogin();
            }}
          >
            {errors.general ? (
              <div className="clp-alert text-sm font-medium text-red-700">
                {errors.general}
              </div>
            ) : null}

            <div>
              <label htmlFor="correo" className="clp-label">
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={form.correo}
                onChange={(event) => updateField("correo", event.target.value)}
                placeholder="usuario@empresa.com"
                className="clp-input"
              />
              {errors.correo ? <p className="text-sm text-red-600">{errors.correo}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="clp-label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="••••••••"
                className="clp-input"
              />
              {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="clp-btn clp-btn-primary w-full"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Entrar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}