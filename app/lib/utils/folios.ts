// app/lib/utils/folios.ts
import prisma from '@/app/lib/prisma';

export async function generarSiguienteFolio(tipo: 'DIRECTO' | 'FORWARDER') {
  const prefijo = tipo === 'DIRECTO' ? 'CLPD' : 'CLPF';
  const anio = '26'; // Puedes dinamizarlo con new Date()

  // Buscamos el último registro de ese tipo para obtener el número
  const ultimoCliente = await prisma.cliente.findFirst({
    where: { tipo },
    orderBy: { id: 'desc' }
  });

  let numero = 1;

  if (ultimoCliente) {
    // Extraemos el número final del folio anterior y sumamos 1
    const partes = ultimoCliente.folio.split('-');
    const ultimoNumero = parseInt(partes[partes.length - 1]);
    numero = ultimoNumero + 1;
  }

  // Formateamos a 5 dígitos (00001)
  const numeroFormateado = numero.toString().padStart(5, '0');
  
  return `${prefijo}-${anio}-${numeroFormateado}`;
}