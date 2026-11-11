import type { TipoDocumento, TipoOperacion } from '@prisma/client'

/** Qué se hace en cada fase, qué documentos se piden y qué habilita al completarla. */
export interface InfoFase {
  hace: string
  docs: TipoDocumento[]
  habilita: string
}

export const INFO_FASES: Record<TipoOperacion, InfoFase[]> = {
  IMPO: [
    { hace: 'Asignar cliente e importador, abrir el expediente y recibir los documentos del embarque.', docs: ['FACTURA', 'BL', 'PL'], habilita: 'Con cliente y documentos obligatorios aprobados se puede preparar el pedimento.' },
    { hace: 'Definir fracción arancelaria y NICO; identificar permisos, NOMs y origen para preferencia arancelaria.', docs: ['HT', 'CO', 'PERMISOS'], habilita: 'La clasificación es requisito del pedimento.' },
    { hace: 'Seguir el buque hasta su arribo y revalidar el BL con la naviera.', docs: ['BL'], habilita: 'El BL revalidado es requisito del pedimento.' },
    { hace: 'Revisar la mercancía contra la factura y documentar diferencias.', docs: [], habilita: 'Un pedimento sin diferencias reduce el riesgo en la modulación.' },
    { hace: 'Capturar y validar el pedimento, COVE y e-documents.', docs: ['FACTURA', 'CM'], habilita: 'El pedimento validado habilita el pago de contribuciones.' },
    { hace: 'Pagar IGI, IVA y DTA por vía electrónica.', docs: [], habilita: 'Con el pago se puede presentar la mercancía en el módulo.' },
    { hace: 'Presentar en el módulo: con verde sale libre; con rojo pasa a reconocimiento y luego se libera.', docs: [], habilita: 'La mercancía liberada habilita la entrega.' },
    { hace: 'Flete nacional, entrega con acuse del cliente y emisión de la cuenta de gastos.', docs: [], habilita: 'Al emitir la cuenta de gastos la operación queda cerrada.' },
  ],
  EXPO: [
    { hace: 'Asignar cliente y exportador, abrir el expediente y recibir los documentos de la venta.', docs: ['FACTURA', 'PL'], habilita: 'Con cliente y documentos obligatorios aprobados se puede preparar el pedimento.' },
    { hace: 'Definir fracción arancelaria y NICO; identificar permisos, NOMs y certificado de origen.', docs: ['HT', 'CO', 'PERMISOS'], habilita: 'La clasificación es requisito del pedimento de exportación.' },
    { hace: 'Revisar la mercancía en origen y cargar el contenedor o la unidad.', docs: ['PL'], habilita: 'La carga revisada permite preparar el pedimento.' },
    { hace: 'Capturar y validar el pedimento de exportación, COVE y e-documents.', docs: ['FACTURA', 'CM'], habilita: 'El pedimento validado habilita el traslado al recinto.' },
    { hace: 'Trasladar la mercancía e ingresarla al recinto fiscalizado.', docs: [], habilita: 'Con la mercancía en el recinto se presenta en el módulo.' },
    { hace: 'Presentar en el módulo: con verde sale libre; con rojo pasa a reconocimiento y luego se libera.', docs: [], habilita: 'La mercancía liberada puede embarcarse.' },
    { hace: 'Embarcar la mercancía y confirmar el zarpe o la salida.', docs: ['BL'], habilita: 'Con el embarque confirmado se prepara el cierre.' },
    { hace: 'Emitir la cuenta de gastos y cerrar el expediente.', docs: [], habilita: 'Al emitir la cuenta de gastos la operación queda cerrada.' },
  ],
}
