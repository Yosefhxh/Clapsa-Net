import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_SESION = 'clapsa_sesion'
const RUTAS_PUBLICAS = ['/login']

/**
 * Revisión optimista: solo mira si existe la cookie de sesión para redirigir rápido.
 * La validación real (sesión vigente, usuario activo, permisos) se hace en el servidor.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tieneSesion = request.cookies.has(COOKIE_SESION)
  const esPublica = RUTAS_PUBLICAS.includes(pathname)

  if (!tieneSesion && !esPublica) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (tieneSesion && esPublica) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|pdf.worker.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
