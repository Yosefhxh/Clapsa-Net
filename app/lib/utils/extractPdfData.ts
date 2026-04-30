export interface ExtractedPdfData {
  razonSocial: string
  rfc: string
  regimen?: string
}

export async function extractPdfData(file: File): Promise<ExtractedPdfData> {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction only available in browser')
  }

  const pdfjsModule = await import('pdfjs-dist')
  const pdfjsLib = pdfjsModule as typeof import('pdfjs-dist')

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = (textContent.items as any[])
    .filter((item) => 'str' in item)
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
    regimen: ''
  }

  // Mantenemos tus utilidades de limpieza
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const lineas = text
    .split(/\n+/)
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const normalizeName = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/^[:\-–\s|]+|[:\-–\s|]+$/g, '') // Agregué el pipe | a la limpieza
      .trim()

  const cleanupValue = (value: string) =>
    normalizeName(
      value.replace(/\b(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|C[ÓO]DIGO|DATOS|IDENTIFICACI[ÓO]N|SITUACI[ÓO]N|OBLIGACIONES|R[ÉE]GIMEN|REGIMEN|NOMBRE COMERCIAL)\b.*$/i, '')
    )

  // Ajuste en getFieldValue para manejar mejor los separadores del SAT (|)
  const getFieldValue = (scopeLines: string[], labelPatterns: RegExp[]) => {
    for (let index = 0; index < scopeLines.length; index++) {
      const line = scopeLines[index]

      for (const labelPattern of labelPatterns) {
        const match = line.match(labelPattern)
        if (!match) continue

        // Si el valor está en la misma línea después de la etiqueta o el pipe
        const inlineValue = cleanupValue(match[1] ?? '')
        if (inlineValue && inlineValue !== '|') {
          return inlineValue
        }

        // Si el valor está en la siguiente línea
        const nextLine = scopeLines[index + 1]
        if (nextLine && !/^(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|PRIMER APELLIDO|SEGUNDO APELLIDO|APELLIDO PATERNO|APELLIDO MATERNO|NOMBRE COMERCIAL|REGISTRO FEDERAL)/i.test(nextLine)) {
          return cleanupValue(nextLine)
        }
      }
    }
    return ''
  }

  // Mejora en los patterns para capturar después de los pipes "|" comunes en el PDF del SAT
  const getPersonaFisicaName = (scopeLines: string[]) => {
    const nombre = getFieldValue(scopeLines, [
      /Nombre\s*\(s\)\s*[:|]\s*(.*)/i,
      /Nombres?\s*[:|]\s*(.*)/i
    ])

    const apellidoPaterno = getFieldValue(scopeLines, [
      /Primer\s+Apellido\s*[:|]\s*(.*)/i,
      /Apellido\s+Paterno\s*[:|]\s*(.*)/i
    ])

    const apellidoMaterno = getFieldValue(scopeLines, [
      /Segundo\s+Apellido\s*[:|]\s*(.*)/i,
      /Apellido\s+Materno\s*[:|]\s*(.*)/i
    ])

    // Filtramos valores que solo sean el pipe "|" o vacíos
    const fullName = [nombre, apellidoPaterno, apellidoMaterno]
      .map(v => v.replace(/^\|/, '').trim())
      .filter(v => v && v.length > 1)
      .join(' ')

    return fullName
  }

  const getTopNameCandidate = (scopeLines: string[]) => {
    for (let index = 0; index < scopeLines.length; index++) {
      const line = scopeLines[index]

      if (!/NOMBRE,?\s+DENOMINACI[ÓO]N\s+O\s+RAZ[ÓO]N SOCIAL/i.test(line)) {
        continue
      }

      const candidateLines: string[] = []

      for (let previous = index - 1; previous >= 0 && candidateLines.length < 3; previous--) {
        const previousLine = scopeLines[previous]
        const isNameLine = /^[A-ZÁÉÍÓÚÑ0-9'\s.]+$/.test(previousLine) &&
          !/^(RFC|CURP|DATOS|VALIDA|NOMBRE,?\s+DENOMINACI[ÓO]N\s+O\s+RAZ[ÓO]N SOCIAL|REGISTRO FEDERAL)/i.test(previousLine) &&
          previousLine.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length >= 4

        if (isNameLine) {
          candidateLines.unshift(cleanupValue(previousLine))
          continue
        }

        if (candidateLines.length > 0) {
          break
        }
      }

      const combinedCandidate = candidateLines.filter(Boolean).join(' ').trim()
      if (combinedCandidate) {
        return combinedCandidate
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

  // Priorizamos la detección de Persona Física si el RFC tiene 13 caracteres
  const isFisica = data.rfc.length === 13
  const personaFisicaName = getPersonaFisicaName(lineas)

  if (isFisica && personaFisicaName) {
    data.razonSocial = personaFisicaName
  } else {
    // Si no es física o no se encontró el nombre desglosado, buscamos denominación (Moral)
    const denominationMatch = cleanText.match(/Denominaci[óo]n\s*\/?\s*Raz[óo]n\s+Social\s*[:|]\s*(.*?)(?=R[ée]gimen Capital|RFC|CURP|$)/i)
    if (denominationMatch?.[1]) {
      data.razonSocial = cleanupValue(denominationMatch[1])
    } else if (personaFisicaName) {
      data.razonSocial = personaFisicaName
    } else {
      data.razonSocial = getTopNameCandidate(lineas) || 'No especificada'
    }
  }

  if (!data.razonSocial) {
    data.razonSocial = 'No especificada'
  }

  const regimenesPatterns = [
    /General\s+de\s+Ley\s+Personas\s+Morales/i,
    /Personas\s+Morales\s+con\s+Actividad\s+Empresarial/i,
    /Personas\s+Morales\s+sin\s+Actividad\s+Empresarial/i,
    /Personas\s+Físicas\s+con\s+Actividad\s+Empresarial/i,
    /Personas\s+Físicas\s+sin\s+Actividad\s+Empresarial/i,
    /Régimen\s+de\s+Incorporación\s+Fiscal/i,
    /Pequeño\s+Contribuyente/i,
    /Régimen\s+Tributario\s+Simplificado/i,
    /Régimen\s+General/i,
    /General\s+de\s+Ley/i
  ]

  for (const pattern of regimenesPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      data.regimen = match[0]
      break
    }
  }

  if (!data.regimen) {
    if (cleanText.includes('General')) {
      data.regimen = 'General de Ley'
    } else if (cleanText.includes('Empresarial')) {
      data.regimen = 'Con Actividad Empresarial'
    } else if (cleanText.includes('Simplificado')) {
      data.regimen = 'Régimen Simplificado'
    }
  }

  console.log('Extracción PDF Debug:', { rfc: data.rfc, razonSocial: data.razonSocial, regimen: data.regimen })

  return data
}
