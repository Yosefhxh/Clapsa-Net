import { obtenerEstadoDesdeDireccion } from "@/app/lib/utils/estadosMexico";

export function construirDomicilio(calle: string, estado: string, codigoPostal: string) {
  const partes = [calle.trim(), estado.trim(), codigoPostal.trim()].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : 'No especificado'
}

export function descomponerDomicilio(domicilio: string) {
  const texto = domicilio.trim()

  if (!texto || texto === 'No especificado') {
    return {
      calle: '',
      estado: '',
      codigoPostal: '',
    }
  }

  const partes = texto.split(',').map((parte) => parte.trim()).filter(Boolean)

  if (partes.length >= 3) {
    return {
      calle: partes.slice(0, partes.length - 2).join(', '),
      estado: partes[partes.length - 2] ?? '',
      codigoPostal: partes[partes.length - 1] ?? '',
    }
  }

  const postalMatch = texto.match(/\b\d{5}\b/)
  return {
    calle: texto.replace(/\b\d{5}\b/g, '').replace(/\s*,\s*$/, '').trim(),
    estado: '',
    codigoPostal: postalMatch?.[0] ?? '',
  }
}

export function obtenerEstadoDomicilio(domicilio: string) {
  const partes = descomponerDomicilio(domicilio)
  return partes.estado || obtenerEstadoDesdeDireccion(domicilio)
}
