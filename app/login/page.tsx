"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useLogin } from "@/app/hooks/useLogin";

export default function LoginPage() {
  const { form, errors, isSubmitting, updateField, submitLogin } = useLogin();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(36,43,131,0.14),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden flex-col justify-between bg-[#242B83] p-10 text-white md:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_45%)]" />
            <div className="relative z-10 flex items-center justify-between">
              <Image src="/logo.png" alt="Logo Clapsa" width={180} height={72} className="h-14 w-auto object-contain" priority />
            </div>

            <div className="relative z-10 max-w-md space-y-5">
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight">
                  Inicia sesión con la información registrada en tu sistema.
                </h1>
              </div>
            </div>

            <div className="relative z-10 text-sm text-white/65">
              CLAPSA NET
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Image src="/logo.png" alt="Logo Clapsa" width={160} height={64} className="h-12 w-auto object-contain md:hidden" priority />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-aduanaBlue">Login</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Acceder al sistema</h2>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                Usa el correo registrado y su contraseña para autenticarte. Si existe un problema, el mensaje será específico y directo.
              </p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                submitLogin();
              }}
            >
              {errors.general ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errors.general}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="correo" className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  value={form.correo}
                  onChange={(event) => updateField("correo", event.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-aduanaBlue/30 focus:ring-4 focus:ring-aduanaBlue/10"
                />
                {errors.correo ? <p className="text-sm text-red-600">{errors.correo}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-aduanaBlue/30 focus:ring-4 focus:ring-aduanaBlue/10"
                />
                {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-aduanaBlue px-4 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(36,43,131,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#1e246f] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Entrar
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}