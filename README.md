# Clapsa-Net

Plataforma administrativa interna construida con Next.js para la gestión de clientes, proveedores, usuarios y operaciones aduanales. Incluye extracción automática y robusta de datos fiscales desde PDFs (constancias fiscales) en el cliente.

## Tabla de contenidos

- [Descripción](#descripci%C3%B3n)
- [Características principales](#caracter%C3%ADsticas-principales)
- [Stack tecnológico](#stack-tecnol%C3%B3gico)
- [Instalación y ejecución](#instalaci%C3%B3n-y-ejecuci%C3%B3n)
- [Estructura relevante del proyecto](#estructura-relevante-del-proyecto)
- [Extracción de datos desde PDF (detalle técnico)](#extracci%C3%B3n-de-datos-desde-pdf--detalle-t%C3%A9cnico)
- [Ejemplo de uso en cliente](#ejemplo-de-uso-en-cliente)
- [Consideraciones de despliegue y recomendaciones](#consideraciones-de-despliegue-y-recomendaciones)
- [Pruebas y contribución](#pruebas-y-contribuci%C3%B3n)
- [Contacto y licencia](#contacto-y-licencia)

## Descripción

`Clapsa-Net` es una aplicación web interna dirigida a equipos de operaciones y administración aduanal que centraliza la gestión de clientes, proveedores y operaciones, y automatiza la extracción de información fiscal desde documentos PDF (constancias fiscales) para acelerar la incorporación y validación de proveedores/clientes.

## Características principales

- Interfaz administrativa con gestión de clientes, proveedores y usuarios.
- Paneles y widgets operativos (estadísticas, historial, seguimiento de folios).
- Carga de PDF y extracción automática de datos fiscales (RFC, razón social, domicilio).
- Integración con base de datos PostgreSQL mediante Prisma.
- Carga de archivos con `react-dropzone` y extracción en cliente con `pdfjs-dist`.

## Stack tecnológico

- Framework: Next.js
- UI: React + Tailwind CSS
- Base de datos: PostgreSQL + Prisma
- Extracción PDF: `pdfjs-dist` (PDF.js) en cliente
- Otras dependencias: `react-dropzone`, `pg`, `lucide-react`

Revisa las dependencias y scripts en [package.json](package.json#L1).

## Instalación y ejecución

Requisitos
- Node.js (versión LTS recomendada)
- PostgreSQL
- Variables de entorno (por ejemplo `DATABASE_URL` para Prisma)

Pasos básicos:

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build y ejecución en producción
npm run build
npm start
```

Abre `http://localhost:3000` en tu navegador.

Configuración de base de datos
- Define `DATABASE_URL` en tu entorno o en un archivo `.env` y ejecuta migraciones con Prisma si es necesario.

```bash
npx prisma migrate dev
npx prisma generate
```

## Estructura relevante del proyecto

- Código principal de la app: `app/`
- Utilidades: `app/lib/utils/` (incluye extractor PDF)
- Acciones del negocio: `app/lib/actions/` y `lib/prisma.ts`
- Prisma: `prisma/schema.prisma` y `generated/prisma`
- Worker de PDF: `public/pdf.worker.js`

Los archivos más relevantes para la extracción de datos PDF son:

- `app/lib/utils/extractPdfData.ts` (funciones `extractPdfData` y `parseConstanciaFiscal`)
- `public/pdf.worker.js` (worker necesario para `pdfjs-dist`)

Puedes abrir el extractor en: [app/lib/utils/extractPdfData.ts](app/lib/utils/extractPdfData.ts#L1).

## Extracción de datos desde PDF (detalle técnico)

Este sistema implementa un extractor en cliente que procesa constancias fiscales (PDF) y devuelve un objeto con los campos principales usados por la aplicación.

Función pública

- `extractPdfData(file: File): Promise<ExtractedPdfData>`

Tipo devuelto

- `ExtractedPdfData`:
	- `razonSocial: string`
	- `rfc: string`
	- `domicilio?: string`

Comportamiento y flujo

1. La función se ejecuta únicamente en el navegador; si se invoca en servidor lanza un error para evitar SSR accidental.
2. Importa dinámicamente `pdfjs-dist` y configura `GlobalWorkerOptions.workerSrc = '/pdf.worker.js'` para usar el worker.
3. Lee el `File` como `ArrayBuffer`, abre el documento y recorre todas las páginas con `getPage`.
4. Extrae `textContent.items` de cada página, concatena el texto completo y lo pasa a `parseConstanciaFiscal`.
5. `parseConstanciaFiscal` aplica heurísticas y expresiones regulares para identificar RFC, razón social y domicilio.

Lógica de `parseConstanciaFiscal` (resumen)

- Normaliza el texto (elimina espacios redundantes, normaliza acentos).
- RFC: busca coincidencias con una regex robusta y valida longitud (12–13 caracteres).
- Nombre / Razón social: maneja personas físicas y morales; usa etiquetas comunes (`Nombre(s)`, `Denominación / Razón Social`) y heurísticas de posición en el documento.
- Domicilio: función `getCleanDomicilio(scopeLines)` que:
	- Detecta etiquetas SAT como `Nombre de Vialidad`, `Número Exterior`, `Municipio`, `Entidad Federativa`, `Código Postal`.
	- Normaliza cadenas, maneja `S/N` (sin número), quita pipes `|` y etiquetas redundantes.
	- Detecta y normaliza estados mexicanos mediante una lista interna.
	- Devuelve una dirección formateada `Calle [#Num], Municipio, Estado, CP` cuando es posible.

Robustez y limitaciones

- Diseñado para formularios y constancias con distintos layouts y ruido visual (p. ej. pipes, etiquetas en líneas posteriores).
- No realiza OCR: si el PDF contiene imágenes escaneadas (texto rasterizado) será necesario un paso de OCR (por ejemplo Tesseract) antes de la extracción.
- Devuelve valores por defecto claros (`'No especificado'`) cuando no encuentra datos.

Errores comunes y soluciones

- `PDF extraction only available in browser`: la función fue llamada desde SSR/Node; ejecutar en cliente.
- Worker no cargado / CORS: verificar que `public/pdf.worker.js` se sirva correctamente y que `GlobalWorkerOptions.workerSrc` apunte a la ruta accesible.
- Texto incompleto: si el PDF es imagen, agregar OCR previo.

## Ejemplo de uso en cliente (React / TypeScript)

```tsx
import { extractPdfData } from 'app/lib/utils/extractPdfData'

async function handleFile(file: File) {
	if (file.type !== 'application/pdf') {
		console.warn('Archivo no es PDF')
		return
	}

	try {
		const data = await extractPdfData(file)
		// data: { razonSocial, rfc, domicilio }
		console.log('Datos extraídos:', data)
	} catch (err) {
		console.error('Error extrayendo PDF:', err)
	}
}
```

Recomendaciones de UI

- Usar `react-dropzone` para la carga y validación del archivo.
- Mostrar vista previa de campos extraídos y permitir edición manual antes de guardar.

## Consideraciones de despliegue y recomendaciones

- `extractPdfData` está pensado para ejecución en navegador; si necesitas procesar PDFs en servidor rehacer la integración con `pdfjs-dist` en Node y configurar adecuadamente los workers.
- Añadir logs o métricas (por ejemplo, contadores de PDFs inválidos o casos OCR) para detectar datos problemáticos.
- Validar y normalizar datos antes de persistir en la base de datos (ej.: normalizar mayúsculas, quitar espacios extras, validar RFC con reglas fiscales adicionales si aplica).

## Pruebas y contribución

- Añadir fixtures PDF en `tests/fixtures/` y tests unitarios para `parseConstanciaFiscal` con ejemplos reales y edge-cases.
- Flujo sugerido: crear rama `feature/xxx`, abrir PR, agregar casos de prueba y documentar cambios.

## Contacto y licencia

- Mantenedor: indicar nombre y correo aquí.
- Licencia: añade la licencia que prefieras (p. ej. MIT) o indica si el repositorio es privado.

---

Si quieres, puedo:

- Añadir el archivo `README.md` (hecho).
- Hacer un commit y abrir un PR con el cambio.
- Generar tests básicos para `parseConstanciaFiscal` con fixtures.

Dime si deseas que haga el commit/PR y qué licencia prefieres que agregue.
