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

  const cleanText = text.replace(/\s+/g, ' ').trim()
  const lineas = text
    .split(/\n+/)
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const normalizeName = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/^[:\-–\s]+|[:\-–\s]+$/g, '')
      .trim()

  const cleanupValue = (value: string) =>
    normalizeName(
      value.replace(/\b(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|C[ÓO]DIGO|DATOS|IDENTIFICACI[ÓO]N|SITUACI[ÓO]N|OBLIGACIONES|R[ÉE]GIMEN|REGIMEN|NOMBRE COMERCIAL)\b.*$/i, '')
    )

  const getFieldValue = (scopeLines: string[], labelPatterns: RegExp[]) => {
    for (let index = 0; index < scopeLines.length; index++) {
      const line = scopeLines[index]

      for (const labelPattern of labelPatterns) {
        const match = line.match(labelPattern)
        if (!match) {
          continue
        }

        const inlineValue = cleanupValue(match[1] ?? '')
        if (inlineValue) {
          return inlineValue
        }

        const nextLine = scopeLines[index + 1]
        if (nextLine && !/^(RFC|CURP|DOMICILIO|ESTATUS|FECHA|FOLIO|PRIMER APELLIDO|SEGUNDO APELLIDO|APELLIDO PATERNO|APELLIDO MATERNO|NOMBRE COMERCIAL|REGISTRO FEDERAL)/i.test(nextLine)) {
          return cleanupValue(nextLine)
        }
      }
    }

    return ''
  }

  const getPersonaFisicaName = (scopeLines: string[]) => {
    const nombre = getFieldValue(scopeLines, [
      /^NOMBRE\s*\(\s*S\s*\)\s*:?\s*(.*)$/i,
      /^NOMBRES?\s*:?\s*(.*)$/i,
      /^NOMBRE\s*:?\s*(.*)$/i,
    ])

    const apellidoPaterno = getFieldValue(scopeLines, [
      /^PRIMER\s+APELLIDO\s*:?\s*(.*)$/i,
      /^APELLIDO\s+PATERNO\s*:?\s*(.*)$/i,
    ])

    const apellidoMaterno = getFieldValue(scopeLines, [
      /^SEGUNDO\s+APELLIDO\s*:?\s*(.*)$/i,
      /^APELLIDO\s+MATERNO\s*:?\s*(.*)$/i,
    ])

    const fullName = [nombre, apellidoPaterno, apellidoMaterno]
      .map(cleanupValue)
      .filter(Boolean)
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

  const denominationMatch = cleanText.match(/DENOMINACI[ÓO]N\/?RAZ[ÓO]N SOCIAL\s*:?\s*([^\n]+)/i)
  if (denominationMatch?.[1]) {
    data.razonSocial = cleanupValue(denominationMatch[1])
  } else {
    const personaFisicaName = getPersonaFisicaName(lineas)
    if (personaFisicaName) {
      data.razonSocial = personaFisicaName
    } else {
      const topName = getTopNameCandidate(lineas)
      if (topName) {
        data.razonSocial = topName
      }
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
