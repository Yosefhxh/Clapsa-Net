export interface ExtractedPdfData {
  razonSocial: string
  rfc: string
  domicilio?: string
}

type PdfTextItem = {
  str?: string
  hasEOL?: boolean
}

export async function extractPdfData(file: File): Promise<ExtractedPdfData> {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction only available in browser')
  }

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const textItems = textContent.items as PdfTextItem[]
    const text = textItems
      .filter((item) => typeof item.str === 'string')
      .map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ' '}`)
      .join('')

    fullText += text + '\n'
  }

  return parseConstanciaFiscal(fullText)
}

function parseConstanciaFiscal(text: string): ExtractedPdfData {
  const data: ExtractedPdfData = {
    razonSocial: '',
    rfc: '',
    domicilio: ''
  }

  const cleanText = text.replace(/\s+/g, ' ').trim()
  const lineas = text
    .split(/\n+/)
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const normalizeName = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/^[:\-–\s|]+|[:\-–\s|]+$/g, '')
      .trim()

  const cleanupValue = (value: string) =>
    normalizeName(
      value.replace(/\b(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|C[ÓO]DIGO|DATOS|IDENTIFICACI[ÓO]N|SITUACI[ÓO]N|OBLIGACIONES|NOMBRE COMERCIAL)\b.*$/i, '')
    )

  // --- FUNCIÓN DE EXTRACCIÓN ULTRA LIMPIA ---
  const getCleanDomicilio = (scopeLines: string[]) => {
    let calle = '';
    let numExt = '';
    let municipio = '';
    let estado = '';
    let cp = '';

    const cleanSATLabels = (val: string) => {
      if (!val) return '';
      return val
        .replace(/Nombre de la Colonia[:\s]*/i, '')
        .replace(/Nombre de la Localidad[:\s]*/i, '')
        .replace(/Entre Calle[:\s]*/i, '')
        .replace(/Y Calle[:\s]*/i, '')
        .replace(/Nombre del Municipio o Demarcaci[oó]n Territorial[:\s]*/i, '')
        .replace(/Nombre de la Entidad Federativa[:\s]*/i, '')
        .replace(/N[úu]mero Exterior[:\s]*/i, '')
        .replace(/N[úu]mero Interior[:\s]*/i, '')
        .replace(/Nombre de Vialidad[:\s]*/i, '')
        .replace(/[|]/g, '')
        .trim();
    };

    const isNoNumber = (val: string) => {
      const v = val.toUpperCase();
      return v === 'SIN NUMERO' || v === 'S/N' || v === 'SN' || v === 'NA' || v === 'N/A' || v === 'NO APLICA';
    };

    const findValueAfterLabel = (index: number, labelRegex: RegExp) => {
      const currentLine = scopeLines[index];
      // Intentamos quitar la etiqueta de la misma línea
      let extracted = currentLine.replace(labelRegex, '').trim();
      
      // Si después de quitar la etiqueta solo queda un pipe o nada, buscamos en la siguiente
      if (!extracted || extracted === '|' || extracted.startsWith(':')) {
        extracted = scopeLines[index + 1] ? scopeLines[index + 1].trim() : '';
      }
      return cleanSATLabels(extracted);
    };

    for (let i = 0; i < scopeLines.length; i++) {
      const line = scopeLines[i];

      if (/Nombre de Vialidad/i.test(line)) {
        calle = findValueAfterLabel(i, /Nombre de Vialidad[:\s|]*/i);
      } else if (/N[úu]mero Exterior/i.test(line)) {
        numExt = findValueAfterLabel(i, /N[úu]mero Exterior[:\s|]*/i);
      } else if (/Municipio o Demarcaci[oó]n Territorial/i.test(line)) {
        municipio = findValueAfterLabel(i, /Municipio o Demarcaci[oó]n Territorial[:\s|]*/i);
      } else if (/Entidad Federativa/i.test(line)) {
        estado = findValueAfterLabel(i, /Entidad Federativa[:\s|]*/i);
      } else if (/C[oó]digo Postal/i.test(line)) {
        const cpMatch = line.match(/\d{5}/);
        cp = cpMatch ? cpMatch[0] : '';
      }
    }

    // Formateo final siguiendo el patrón: Calle, Municipio, Estado, CP
    let calleConNum = isNoNumber(numExt) || !numExt ? calle : `${calle} #${numExt}`;

    // Lista de estados (sin tildes, en mayúsculas) para detectar y extraer
    const estados = [
      'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE','COAHUILA','COLIMA','CHIAPAS','CHIHUAHUA','CDMX','CIUDAD DE MEXICO','DURANGO','GUANAJUATO','GUERRERO','HIDALGO','JALISCO','MEXICO','MICHOACAN','MORELOS','NAYARIT','NUEVO LEON','OAXACA','PUEBLA','QUERETARO','QUINTANA ROO','SAN LUIS POTOSI','SINALOA','SONORA','TABASCO','TAMAULIPAS','TLAXCALA','VERACRUZ','YUCATAN','ZACATECAS'
    ];

    const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const upper = (s = '') => stripAccents(s).toUpperCase()

    let municipioClean = municipio || ''
    let estadoClean = estado || ''
    let cpClean = cp || ''

    // Eliminar prefijos molestos
    municipioClean = municipioClean.replace(/Nombre del\s*/i, '').replace(/Nombre de la\s*/i, '').replace(/Nombre de\s*/i, '').replace(/\bNombre\b/gi, '').trim()

    // Detectar estado dentro de municipio o estado y extraerlo
    if (!estadoClean) {
      const textoParaBuscar = `${municipioClean} ${calleConNum}`
      for (const e of estados) {
        if (upper(textoParaBuscar).includes(e)) {
          estadoClean = e
          // quitar el estado del municipio si estaba pegado
          const re = new RegExp(e, 'i')
          municipioClean = municipioClean.replace(re, '').replace(/\s{2,}/g, ' ').trim()
          break
        }
      }
    } else {
      // normalizar estado si viene con texto
      for (const e of estados) {
        if (upper(estadoClean).includes(e)) {
          estadoClean = e
          break
        }
      }
    }

    // Mover fragmentos que parecen pertenecer a la calle (ej. '1 SUR PONIENTE') desde municipio al calle
    const streetContinuationRegex = /\b\d+\s+(SUR|NORTE|PONIENTE|ORIENTE|SUR PONIENTE|NORTE PONIENTE)\b/i
    if (streetContinuationRegex.test(municipioClean)) {
      const match = municipioClean.match(streetContinuationRegex)
      if (match) {
        const fragment = match[0]
        municipioClean = municipioClean.replace(fragment, '').replace(/\s{2,}/g, ' ').trim()
        calleConNum = (calleConNum ? calleConNum + ' ' : '') + fragment
      }
    }

    // Quitar repeticiones extrañas como 'COMITAN DE DOMINGUEZ Nombre del COMITAN DE'
    municipioClean = municipioClean.replace(/Nombre\s+del\s+[^,]+/i, '').replace(/Nombre\s+de\s+la\s+[^,]+/i, '').replace(/\b(\w+)\b(?:.*\b\1\b)/i, (m, p1) => p1).trim()

    // Si municipio contiene coma con estado, intentar dividir
    if (!estadoClean && /,/.test(municipioClean)) {
      const parts = municipioClean.split(',').map(s=>s.trim()).filter(Boolean)
      const last = parts[parts.length-1]
      if (last && estados.some(e=>upper(last).includes(e))) {
        estadoClean = parts.pop() || ''
        municipioClean = parts.join(' ')
      }
    }

    // Normalizar nombres vacíos
    municipioClean = municipioClean.replace(/^[,\s-]+|[,\s-]+$/g, '').trim()

    // Asegurar formato: Calle, Municipio, Estado, CP
    const resultParts: string[] = []
    if (calleConNum) resultParts.push(calleConNum.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim())
    if (municipioClean) resultParts.push(municipioClean)
    if (estadoClean) resultParts.push(estadoClean)
    if (cpClean) resultParts.push(cpClean)

    return resultParts.join(', ')
  };

  // --- LÓGICA DE RFC Y NOMBRE (SIN CAMBIOS) ---
  const getFieldValue = (scopeLines: string[], labelPatterns: RegExp[]) => {
    for (let index = 0; index < scopeLines.length; index++) {
      const line = scopeLines[index]
      for (const labelPattern of labelPatterns) {
        const match = line.match(labelPattern)
        if (!match) continue
        const inlineValue = cleanupValue(match[1] ?? '')
        if (inlineValue && inlineValue !== '|') return inlineValue
        const nextLine = scopeLines[index + 1]
        if (nextLine && !/^(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|PRIMER APELLIDO|SEGUNDO APELLIDO|APELLIDO PATERNO|APELLIDO MATERNO|NOMBRE COMERCIAL|REGISTRO FEDERAL)/i.test(nextLine)) {
          return cleanupValue(nextLine)
        }
      }
    }
    return ''
  }

  const getPersonaFisicaName = (scopeLines: string[]) => {
    const nombre = getFieldValue(scopeLines, [/Nombre\s*\(s\)\s*[:|]\s*(.*)/i, /Nombres?\s*[:|]\s*(.*)/i])
    const apellidoPaterno = getFieldValue(scopeLines, [/Primer\s+Apellido\s*[:|]\s*(.*)/i, /Apellido\s+Paterno\s*[:|]\s*(.*)/i])
    const apellidoMaterno = getFieldValue(scopeLines, [/Segundo\s+Apellido\s*[:|]\s*(.*)/i, /Apellido\s+Materno\s*[:|]\s*(.*)/i])
    return [nombre, apellidoPaterno, apellidoMaterno].map(v => v.replace(/^\|/, '').trim()).filter(v => v.length > 1).join(' ')
  }

  const getTopNameCandidate = (scopeLines: string[]) => {
    for (let index = 0; index < scopeLines.length; index++) {
      if (/NOMBRE,?\s+DENOMINACI[ÓO]N\s+O\s+RAZ[ÓO]N SOCIAL/i.test(scopeLines[index])) {
        const candidateLines: string[] = []
        for (let previous = index - 1; previous >= 0 && candidateLines.length < 3; previous--) {
          const previousLine = scopeLines[previous]
          if (/^[A-ZÁÉÍÓÚÑ0-9'\s.]+$/.test(previousLine) && !/^(RFC|CURP|DATOS|VALIDA|NOMBRE|REGISTRO)/i.test(previousLine) && previousLine.length >= 4) {
            candidateLines.unshift(cleanupValue(previousLine))
            continue
          }
          if (candidateLines.length > 0) break
        }
        return candidateLines.join(' ').trim()
      }
    }
    return ''
  }

  const rfcRegex = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{0,3})\b/g
  const rfcMatches = cleanText.match(rfcRegex)
  if (rfcMatches) {
    for (const rfc of rfcMatches) {
      if (rfc.length >= 12 && rfc.length <= 13) {
        data.rfc = rfc
        break
      }
    }
  }

  const isFisica = data.rfc.length === 13
  const personaFisicaName = getPersonaFisicaName(lineas)

  if (isFisica && personaFisicaName) {
    data.razonSocial = personaFisicaName
  } else {
    const denominationMatch = cleanText.match(/Denominaci[óo]n\s*\/?\s*Raz[óo]n\s+Social\s*[:|]\s*(.*?)(?=R[ée]gimen Capital|RFC|CURP|$)/i)
    data.razonSocial = denominationMatch?.[1] ? cleanupValue(denominationMatch[1]) : (personaFisicaName || getTopNameCandidate(lineas) || 'No especificada')
  }

  data.domicilio = getCleanDomicilio(lineas) || 'No especificado'

  return data
}