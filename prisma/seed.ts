import prisma from '../shared/lib/prisma'
import {
  EstadoUsuario,
  HitoOperativo,
  MedioTransporte,
  RequisitoDocumento,
  TipoDocumento,
  TipoUsuario,
} from '@prisma/client'
import { hashearPassword } from '../shared/auth/password'

type PasoSeed = {
  clave: HitoOperativo
  nombre: string
  descripcion?: string
  orden: number
  ordenExpo: number | null
  faseImpo: number
  faseExpo: number
  slaHoras: number | null
  esServicio: boolean
  medios: MedioTransporte[]
}

const { MARITIMO, AEREO } = MedioTransporte

/**
 * Catálogo del proceso. `orden` es el orden en importación y `ordenExpo` en exportación.
 * Fase 0 = el paso no aplica a ese tipo de operación.
 */
const pasos: PasoSeed[] = [
  { clave: HitoOperativo.CLASIFICACION, nombre: 'Clasificación arancelaria', descripcion: 'Fracción, NICO, permisos y NOMs', orden: 1, ordenExpo: 1, faseImpo: 2, faseExpo: 2, slaHoras: 24, esServicio: false, medios: [] },
  { clave: HitoOperativo.UVA, nombre: 'UVA', descripcion: 'Solo si la mercancía requiere NOM', orden: 2, ordenExpo: 2, faseImpo: 2, faseExpo: 2, slaHoras: 48, esServicio: true, medios: [] },
  { clave: HitoOperativo.FLETE_MARITIMO, nombre: 'Flete Marítimo', orden: 3, ordenExpo: 13, faseImpo: 3, faseExpo: 7, slaHoras: null, esServicio: true, medios: [MARITIMO] },
  { clave: HitoOperativo.FLETE_AEREO, nombre: 'Flete Aéreo', orden: 4, ordenExpo: 14, faseImpo: 3, faseExpo: 7, slaHoras: null, esServicio: true, medios: [AEREO] },
  { clave: HitoOperativo.FT_INTERMODAL, nombre: 'F.T. Intermodal', orden: 5, ordenExpo: 8, faseImpo: 3, faseExpo: 5, slaHoras: 24, esServicio: true, medios: [] },
  { clave: HitoOperativo.REVALIDACION_BL, nombre: 'Revalidación del BL', descripcion: 'Con la naviera, al arribo del buque', orden: 6, ordenExpo: null, faseImpo: 3, faseExpo: 0, slaHoras: 24, esServicio: false, medios: [MARITIMO] },
  { clave: HitoOperativo.PREVIO_ORIGEN, nombre: 'Previo en Origen', descripcion: 'Revisión de la mercancía contra la factura', orden: 7, ordenExpo: 3, faseImpo: 4, faseExpo: 3, slaHoras: 48, esServicio: false, medios: [] },
  { clave: HitoOperativo.DESPACHO_ADUANERO, nombre: 'Despacho Aduanero', descripcion: 'Captura y validación del pedimento, COVE y e-documents', orden: 8, ordenExpo: 4, faseImpo: 5, faseExpo: 4, slaHoras: 24, esServicio: false, medios: [] },
  { clave: HitoOperativo.PAGO_CONTRIBUCIONES, nombre: 'Pago de contribuciones', descripcion: 'IGI, IVA y DTA · pago electrónico', orden: 9, ordenExpo: 5, faseImpo: 6, faseExpo: 4, slaHoras: 4, esServicio: false, medios: [] },
  { clave: HitoOperativo.MODULACION, nombre: 'Modulación', descripcion: 'Semáforo fiscal en el módulo', orden: 10, ordenExpo: 10, faseImpo: 7, faseExpo: 6, slaHoras: 12, esServicio: false, medios: [] },
  { clave: HitoOperativo.MANIOBRAS_PORTUARIAS, nombre: 'Maniobras Portuarias', orden: 11, ordenExpo: 9, faseImpo: 7, faseExpo: 5, slaHoras: 12, esServicio: true, medios: [MARITIMO] },
  { clave: HitoOperativo.ALMACENAJE, nombre: 'Almacenaje', descripcion: 'Corre desde la descarga', orden: 12, ordenExpo: 11, faseImpo: 7, faseExpo: 6, slaHoras: null, esServicio: true, medios: [] },
  { clave: HitoOperativo.FT_NACIONAL, nombre: 'F.T. Nacional', orden: 13, ordenExpo: 7, faseImpo: 8, faseExpo: 5, slaHoras: 24, esServicio: true, medios: [] },
  { clave: HitoOperativo.MANIOBRAS_ALMACEN, nombre: 'Maniobras en Almacén', orden: 14, ordenExpo: 12, faseImpo: 8, faseExpo: 6, slaHoras: 12, esServicio: true, medios: [] },
  { clave: HitoOperativo.OTRAS, nombre: 'Otras', orden: 15, ordenExpo: 15, faseImpo: 8, faseExpo: 8, slaHoras: null, esServicio: true, medios: [] },
  { clave: HitoOperativo.CUENTA_GASTOS, nombre: 'Cuenta de gastos', descripcion: 'Honorarios, contribuciones y costos de proveedores', orden: 16, ordenExpo: 16, faseImpo: 8, faseExpo: 8, slaHoras: 48, esServicio: false, medios: [] },
]

const { OBLIGATORIO, SI_APLICA, NO_APLICA } = RequisitoDocumento
const documentos: Array<{ tipo: TipoDocumento; nombre: string; descripcion: string | null; requisitoImpo: RequisitoDocumento; requisitoExpo: RequisitoDocumento }> = [
  { tipo: TipoDocumento.FACTURA, nombre: 'Factura', descripcion: 'Factura comercial', requisitoImpo: OBLIGATORIO, requisitoExpo: OBLIGATORIO },
  { tipo: TipoDocumento.BL, nombre: 'BL', descripcion: 'Conocimiento de embarque (Bill of Lading)', requisitoImpo: OBLIGATORIO, requisitoExpo: NO_APLICA },
  { tipo: TipoDocumento.PL, nombre: 'PL', descripcion: 'Lista de empaque (Packing List)', requisitoImpo: OBLIGATORIO, requisitoExpo: OBLIGATORIO },
  { tipo: TipoDocumento.CO, nombre: 'CO', descripcion: 'Certificado de origen', requisitoImpo: SI_APLICA, requisitoExpo: NO_APLICA },
  { tipo: TipoDocumento.PERMISOS, nombre: 'Permisos', descripcion: 'Permisos y NOMs según la fracción', requisitoImpo: SI_APLICA, requisitoExpo: NO_APLICA },
  { tipo: TipoDocumento.CM, nombre: 'CM', descripcion: null, requisitoImpo: SI_APLICA, requisitoExpo: NO_APLICA },
  { tipo: TipoDocumento.HT, nombre: 'HT', descripcion: 'Hoja técnica de la mercancía', requisitoImpo: SI_APLICA, requisitoExpo: NO_APLICA },
  { tipo: TipoDocumento.HS, nombre: 'HS', descripcion: 'Hoja de seguridad', requisitoImpo: NO_APLICA, requisitoExpo: SI_APLICA },
  { tipo: TipoDocumento.FOTOS, nombre: 'Fotos', descripcion: 'Fotos de la mercancía', requisitoImpo: NO_APLICA, requisitoExpo: SI_APLICA },
  { tipo: TipoDocumento.OTROS, nombre: 'Otros', descripcion: 'Otros documentos', requisitoImpo: NO_APLICA, requisitoExpo: SI_APLICA },
]

const aduanas = [
  { clave: '160', nombre: 'Manzanillo' },
  { clave: '510', nombre: 'Lázaro Cárdenas' },
  { clave: '430', nombre: 'Veracruz' },
  { clave: '810', nombre: 'Altamira' },
  { clave: '240', nombre: 'Nuevo Laredo' },
  { clave: '470', nombre: 'CDMX AICM' },
]

const clavesPedimento = [
  { clave: 'A1', descripcion: 'Importación o exportación definitiva', aplicaImpo: true, aplicaExpo: true, activa: true },
  { clave: 'IN', descripcion: 'Importación temporal (IMMEX)', aplicaImpo: true, aplicaExpo: false, activa: false },
  { clave: 'RT', descripcion: 'Retorno de mercancía', aplicaImpo: false, aplicaExpo: true, activa: false },
]

const alertas = [
  { clave: 'sin_cliente', nombre: 'Operación sin cliente', descripcion: 'Operaciones abiertas que aún no tienen cliente e importador.' },
  { clave: 'proximo_arribo', nombre: 'ETA próxima', descripcion: 'Operaciones con arribo en las próximas 48 horas.' },
  { clave: 'pedimento_por_pagar', nombre: 'Pedimento por pagar', descripcion: 'Pedimentos validados que no se han pagado.' },
  { clave: 'semaforo_rojo', nombre: 'Semáforo rojo', descripcion: 'Mercancía en reconocimiento aduanero.' },
  { clave: 'documento_rechazado', nombre: 'Documento rechazado', descripcion: 'Documentos rechazados que esperan una nueva versión.' },
  { clave: 'encargo_por_vencer', nombre: 'Encargo conferido por vencer', descripcion: 'Clientes cuyo encargo vence en 30 días o menos.' },
]

async function sembrarPasos() {
  // `orden` es único: primero se mueve todo fuera de rango para poder reordenar sin choques.
  await prisma.$executeRaw`UPDATE "Paso" SET "orden" = "orden" + 1000`
  for (const paso of pasos) {
    const data = { ...paso, activo: true }
    await prisma.paso.upsert({ where: { clave: paso.clave }, update: data, create: data })
  }
}

async function sembrarAdministrador() {
  const correo = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!correo || !password) {
    console.log('Sin SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD: no se crea administrador.')
    return
  }
  const existente = await prisma.usuario.findUnique({ where: { correo } })
  if (existente) return
  await prisma.usuario.create({
    data: {
      nombre: process.env.SEED_ADMIN_NAME?.trim() || 'Administrador',
      correo,
      passwordHash: await hashearPassword(password),
      tipoUsuario: TipoUsuario.ADMIN,
      estado: EstadoUsuario.ACTIVO,
    },
  })
  console.log(`Administrador creado: ${correo}`)
}

async function main() {
  await sembrarPasos()
  for (const doc of documentos) {
    await prisma.documentoConfig.upsert({ where: { tipo: doc.tipo }, update: {}, create: doc })
  }
  for (const aduana of aduanas) {
    await prisma.aduana.upsert({ where: { clave: aduana.clave }, update: {}, create: aduana })
  }
  for (const clave of clavesPedimento) {
    await prisma.clavePedimento.upsert({ where: { clave: clave.clave }, update: {}, create: clave })
  }
  for (const alerta of alertas) {
    await prisma.alertaConfig.upsert({ where: { clave: alerta.clave }, update: {}, create: alerta })
  }
  await prisma.configuracionAgencia.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
  await sembrarAdministrador()
  console.log(`Seed completado: ${pasos.length} pasos, ${documentos.length} documentos, ${aduanas.length} aduanas.`)
}

main()
  .catch((error: unknown) => {
    console.error('Error ejecutando seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
