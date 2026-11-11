/**
 * Recorre un despacho de importación completo contra una base de pruebas real.
 * Ejecutar con: npm run test:integracion  (usa DATABASE_URL_TEST)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '@/shared/lib/prisma'
import * as servicio from '@/features/operaciones/servicio/operaciones-servicio'
import { dalObtenerOperacion, dalListarOperaciones } from '@/features/operaciones/dal/operaciones-dal'
import { dalProveedoresPorServicio } from '@/features/proveedores/dal/proveedores-dal'
import type { UsuarioSesion } from '@/shared/auth/session-types'

// Seguro: estas pruebas escriben en la BD; solo se permiten contra una base local.
const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x@sin-base/x').hostname
if (!['localhost', '127.0.0.1'].includes(host)) {
  throw new Error(`Las pruebas de integración solo corren contra una base local (DATABASE_URL apunta a ${host}).`)
}

const sufijo = Date.now().toString().slice(-6)
let admin: UsuarioSesion
let editor: UsuarioSesion
let directoId: number
let forwarderId: number
let navieraId: number
let transportistaId: number
let traficoId: string

const paso = async (clave: string) => {
  const op = await dalObtenerOperacion(traficoId)
  return op!.pasos.find((p) => p.clave === clave)!
}
const avanzar = async (clave: string, ...acciones: Parameters<typeof servicio.cambiarEstadoPaso>[1][]) => {
  for (const a of acciones) await servicio.cambiarEstadoPaso((await paso(clave)).id, a, admin)
}
const pdf = (nombre: string) => new File([new Uint8Array([37, 80, 68, 70])], nombre, { type: 'application/pdf' })

beforeAll(async () => {
  const crearUsuario = async (tipoUsuario: 'ADMIN' | 'EDITOR') => {
    const u = await prisma.usuario.create({ data: { nombre: `Prueba ${tipoUsuario}`, correo: `${tipoUsuario.toLowerCase()}${sufijo}@test.local`, passwordHash: 'x', tipoUsuario } })
    return { id: u.id, nombre: u.nombre, correo: u.correo, tipoUsuario: u.tipoUsuario, inicioSesion: new Date().toISOString() }
  }
  admin = await crearUsuario('ADMIN')
  editor = await crearUsuario('EDITOR')

  const directo = await prisma.cliente.create({ data: { folio: `CLPD-T-${sufijo}`, razonSocial: 'Importadora de Prueba', rfc: `IPR${sufijo}AB1`, tipo: 'DIRECTO', encargoConferido: true, padronImportadores: true } })
  const forwarder = await prisma.cliente.create({ data: { folio: `CLPF-T-${sufijo}`, razonSocial: 'Forwarder de Prueba', rfc: `FPR${sufijo}AB1`, tipo: 'FORWARDER' } })
  directoId = directo.id
  forwarderId = forwarder.id

  const pasoId = async (clave: 'FLETE_MARITIMO' | 'FT_NACIONAL') => (await prisma.paso.findUniqueOrThrow({ where: { clave } })).id
  const naviera = await prisma.proveedores.create({
    data: { tipoProveedor: 'LOGISTICA', razonSocial: 'Naviera de Prueba', rfc: `NPR${sufijo}AB1`, correo: `nav${sufijo}@test.local`, telefono: '3140000000', direccion: 'Manzanillo, Colima', aduanas: ['Manzanillo'],
      servicios: { create: [{ pasoId: await pasoId('FLETE_MARITIMO'), tarifaBase: 42000 }] } },
  })
  const transportista = await prisma.proveedores.create({
    data: { tipoProveedor: 'LOGISTICA', razonSocial: 'Transportes de Prueba', rfc: `TPR${sufijo}AB1`, correo: `tra${sufijo}@test.local`, telefono: '3140000001', direccion: 'Colima, Colima', aduanas: ['Lázaro Cárdenas'],
      servicios: { create: [{ pasoId: await pasoId('FT_NACIONAL'), tarifaBase: 18500 }] } },
  })
  navieraId = naviera.id
  transportistaId = transportista.id
})

afterAll(async () => {
  if (traficoId) await prisma.trafico.delete({ where: { id: traficoId } }).catch(() => undefined)
  await prisma.proveedores.deleteMany({ where: { id: { in: [navieraId, transportistaId] } } })
  await prisma.cliente.deleteMany({ where: { id: { in: [directoId, forwarderId] } } })
  await prisma.usuario.deleteMany({ where: { id: { in: [admin.id, editor.id] } } })
  await prisma.$disconnect()
})

describe('despacho de importación completo', () => {
  it('abre la operación sin cliente: queda en espera y con su estructura', async () => {
    traficoId = await servicio.crearOperacion({ tipo: 'IMPO', medio: 'MARITIMO', aduana: 'Manzanillo', clavePedimento: 'A1', eta: new Date(), folioManual: null, clienteId: null, importadorId: null }, admin)
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.folio).toMatch(/^CLPT-\d{2}-\d{5}$/)
    expect(op.estado).toBe('EN_ESPERA_CLIENTE')
    expect(op.pasos.find((p) => p.clave === 'FLETE_AEREO')?.estado).toBe('NO_APLICA')
    expect(op.documentos.filter((d) => d.requisito === 'OBLIGATORIO').map((d) => d.tipo).sort()).toEqual(['BL', 'FACTURA', 'PL'])
  })

  it('no deja iniciar el pedimento sin cliente, documentos y clasificación', async () => {
    await expect(avanzar('DESPACHO_ADUANERO', 'INICIAR')).rejects.toThrow('Falta asignar cliente e importador')
  })

  it('un forwarder exige importador directo', async () => {
    await expect(servicio.asignarCliente(traficoId, forwarderId, null, admin)).rejects.toThrow(/elige al importador/)
    await servicio.asignarCliente(traficoId, forwarderId, directoId, editor)
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.cliente?.tipo).toBe('FORWARDER')
    expect(op.importador?.id).toBe(directoId)
    expect(op.estado).toBe('EN_PROCESO')
  })

  it('documentos: subir, rechazar con motivo y aprobar', async () => {
    const op = (await dalObtenerOperacion(traficoId))!
    const factura = op.documentos.find((d) => d.tipo === 'FACTURA')!
    await expect(servicio.revisarDocumento(factura.id, true, null, admin)).rejects.toThrow('Solo se revisan documentos que ya se subieron.')
    await servicio.subirDocumento(factura.id, pdf('factura.pdf'), editor)
    await expect(servicio.revisarDocumento(factura.id, false, '', admin)).rejects.toThrow('motivo')
    await servicio.revisarDocumento(factura.id, false, 'Falta el valor por partida', admin)
    await servicio.subirDocumento(factura.id, pdf('factura-v2.pdf'), editor)
    for (const d of op.documentos.filter((x) => x.requisito === 'OBLIGATORIO')) {
      if (d.tipo !== 'FACTURA') await servicio.subirDocumento(d.id, pdf(`${d.tipo}.pdf`), editor)
      await servicio.revisarDocumento(d.id, true, null, admin)
    }
    expect((await dalObtenerOperacion(traficoId))!.documentosObligatoriosAprobados).toBe(true)
  })

  it('asigna proveedores solo si prestan el servicio en la aduana', async () => {
    const flete = await paso('FLETE_MARITIMO')
    const nacional = await paso('FT_NACIONAL')
    await expect(servicio.asignarProveedorPaso(flete.id, transportistaId, null, editor)).rejects.toThrow(/no tiene registrado el servicio/)
    await expect(servicio.asignarProveedorPaso(nacional.id, transportistaId, null, editor)).rejects.toThrow(/no da servicio en Manzanillo/)
    await servicio.asignarProveedorPaso(flete.id, navieraId, null, editor)
    expect((await paso('FLETE_MARITIMO')).costo).toBe(42000)
  })

  it('un proveedor dado de baja no se ofrece ni se puede asignar; el ya asignado se conserva', async () => {
    const flete = await paso('FLETE_MARITIMO')
    await prisma.proveedores.update({ where: { id: navieraId }, data: { estado: 'INACTIVO' } })
    try {
      expect((await dalProveedoresPorServicio()).FLETE_MARITIMO?.some((p) => p.id === navieraId) ?? false).toBe(false)
      // Ya estaba asignado: se puede ajustar su costo.
      await servicio.asignarProveedorPaso(flete.id, navieraId, 40000, editor)
      expect((await paso('FLETE_MARITIMO')).costo).toBe(40000)
      // Si se quita, ya no se puede volver a asignar mientras esté inactivo.
      await servicio.asignarProveedorPaso(flete.id, null, null, editor)
      await expect(servicio.asignarProveedorPaso(flete.id, navieraId, null, editor)).rejects.toThrow(/dado de baja/)
    } finally {
      await prisma.proveedores.update({ where: { id: navieraId }, data: { estado: 'ACTIVO' } })
    }
    await servicio.asignarProveedorPaso(flete.id, navieraId, null, editor)
    expect((await paso('FLETE_MARITIMO')).costo).toBe(42000)
  })

  it('el editor no puede validar el pedimento; el administrador sí, con número válido', async () => {
    await avanzar('CLASIFICACION', 'INICIAR', 'COMPLETAR')
    await avanzar('REVALIDACION_BL', 'INICIAR', 'COMPLETAR')
    await expect(servicio.cambiarEstadoPaso((await paso('DESPACHO_ADUANERO')).id, 'INICIAR', editor)).rejects.toThrow('No tienes permiso')
    await avanzar('DESPACHO_ADUANERO', 'INICIAR')
    await expect(avanzar('DESPACHO_ADUANERO', 'COMPLETAR')).rejects.toThrow('número de pedimento')
    await servicio.cambiarEstadoPaso((await paso('DESPACHO_ADUANERO')).id, 'COMPLETAR', admin, { numeroPedimento: '261637116001850' })
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.numeroPedimento).toBe('26 16 3711 6001850')
    expect(op.situacion).toBe('Por pagar pedimento')
  })

  it('pago → modulación en rojo → reconocimiento → liberación', async () => {
    await expect(avanzar('MODULACION', 'INICIAR')).rejects.toThrow('Primero paga el pedimento')
    await avanzar('PAGO_CONTRIBUCIONES', 'INICIAR', 'COMPLETAR')
    await avanzar('MODULACION', 'INICIAR', 'MODULAR_ROJO')
    expect((await dalObtenerOperacion(traficoId))!.situacion).toBe('En reconocimiento')
    await avanzar('MODULACION', 'LIBERAR')
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.semaforo).toBe('ROJO')
    expect(op.situacion).toBe('Desaduanada')
  })

  it('evita pisar un cambio hecho por otra persona', async () => {
    const id = (await paso('PREVIO_ORIGEN')).id
    await Promise.allSettled([servicio.cambiarEstadoPaso(id, 'INICIAR', admin), servicio.cambiarEstadoPaso(id, 'INICIAR', admin)])
    const eventos = (await dalObtenerOperacion(traficoId))!.eventos.filter((e) => e.descripcion === 'Previo en Origen iniciado')
    expect(eventos).toHaveLength(1)
    await avanzar('PREVIO_ORIGEN', 'COMPLETAR')
  })

  it('cuenta de gastos: cargos, cierre y bloqueo de cambios', async () => {
    await servicio.agregarCargo(traficoId, { tipo: 'CONTRIBUCION', concepto: 'IVA de importación', monto: 138920, moneda: 'MXN' }, admin)
    await servicio.agregarCargo(traficoId, { tipo: 'HONORARIO', concepto: 'Honorarios del agente aduanal', monto: 8500, moneda: 'MXN' }, admin)
    await expect(servicio.agregarCargo(traficoId, { tipo: 'OTRO', concepto: 'Prueba', monto: 10, moneda: 'MXN' }, editor)).rejects.toThrow('No tienes permiso')
    await expect(avanzar('CUENTA_GASTOS', 'INICIAR')).rejects.toThrow('Falta la entrega')
    await avanzar('FT_NACIONAL', 'INICIAR', 'COMPLETAR')
    await avanzar('CUENTA_GASTOS', 'INICIAR', 'COMPLETAR')
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.estado).toBe('CERRADA')
    expect(op.pasos.find((p) => p.clave === 'UVA')?.estado).toBe('NO_APLICA')
    expect(op.avance.porcentaje).toBe(100)
    await expect(servicio.agregarCargo(traficoId, { tipo: 'OTRO', concepto: 'Tarde', monto: 10, moneda: 'MXN' }, admin)).rejects.toThrow('cerrada')
    const enBandeja = (await dalListarOperaciones()).find((o) => o.id === traficoId)
    expect(enBandeja?.situacion).toBe('Cerrada')
  })

  it('la bitácora registra a cada usuario', async () => {
    const op = (await dalObtenerOperacion(traficoId))!
    expect(op.eventos.length).toBeGreaterThan(20)
    expect(op.eventos.some((e) => e.usuario === editor.nombre && e.descripcion.startsWith('Forwarder'))).toBe(true)
  })
})
