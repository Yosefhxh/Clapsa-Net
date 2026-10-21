import prisma from '../shared/lib/prisma'
import { HitoOperativo, Prisma } from '@prisma/client'

const pasosIniciales = [
  { clave: HitoOperativo.PREVIO_ORIGEN, nombre: 'Previo en origen', orden: 1 },
  { clave: HitoOperativo.FLETE_MARITIMO, nombre: 'Flete marítimo', orden: 2 },
  { clave: HitoOperativo.FLETE_AEREO, nombre: 'Flete aéreo', orden: 3 },
  { clave: HitoOperativo.FT_INTERMODAL, nombre: 'F.T. Intermodal', orden: 4 },
  { clave: HitoOperativo.DESPACHO_ADUANERO, nombre: 'Despacho Aduanero', orden: 5 },
  { clave: HitoOperativo.FT_NACIONAL, nombre: 'F.T. Nacional', orden: 6 },
  { clave: HitoOperativo.UVA, nombre: 'UVA', orden: 7 },
  { clave: HitoOperativo.ALMACENAJE, nombre: 'Almacenaje', orden: 8 },
  { clave: HitoOperativo.MANIOBRAS_ALMACEN, nombre: 'Maniobras en almacén', orden: 9 },
  { clave: HitoOperativo.MANIOBRAS_PORTUARIAS, nombre: 'Maniobras portuarias', orden: 10 },
  { clave: HitoOperativo.OTRAS, nombre: 'Otras', orden: 11 },
] as const satisfies ReadonlyArray<{
  clave: HitoOperativo
  nombre: string
  orden: number
}>

async function main() {
  for (const paso of pasosIniciales) {
    await prisma.paso.upsert({
      where: { clave: paso.clave },
      update: {
        nombre: paso.nombre,
        orden: paso.orden,
        activo: true,
      },
      create: {
        clave: paso.clave,
        nombre: paso.nombre,
        orden: paso.orden,
        activo: true,
      },
    })
  }

  console.log(`Seed completado: ${pasosIniciales.length} pasos operativos registrados.`)
}

main()
  .catch((error: unknown) => {
    console.error('Error ejecutando seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
