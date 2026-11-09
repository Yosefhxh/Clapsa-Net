import { NextResponse } from 'next/server'
import { cerrarSesion } from '@/shared/auth/session'

/** Limpia una cookie de sesión vencida o inválida y manda al login. */
export async function GET(request: Request) {
  await cerrarSesion()
  return NextResponse.redirect(new URL('/login', request.url))
}
