<div align="center">

<img src="public/clapsa-logo.png" alt="CLAPSA — Conexión Logística y Aduanera del Pacífico" width="440" />

# CLAPSA NET

**Gestión integral y control operativo para el despacho aduanero**

Sistema web interno de Conexión Logística y Aduanera del Pacífico S.A. de C.V. (CLAPSA).
Reúne en una sola plataforma los tráficos de importación y exportación, los expedientes
documentales, los catálogos de clientes y proveedores, y el control de acceso del personal.

<br />

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.8.0-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=white)

[Acerca del proyecto](#-acerca-del-proyecto) ·
[Funcionalidades](#-funcionalidades) ·
[Arquitectura](#-arquitectura) ·
[Instalación](#-instalación-y-configuración) ·
[Seguridad](#-seguridad-y-control-de-acceso)

</div>

---

## 📌 Acerca del proyecto

El despacho aduanero es el conjunto de actos y formalidades que se realizan ante la aduana para
que una mercancía entre o salga del territorio nacional. Una agencia aduanal lo promueve por
cuenta de importadores y exportadores, así que **la exactitud de los datos y la trazabilidad de
cada operación** son parte central del servicio.

En CLAPSA, el alta de clientes y proveedores, la integración de expedientes y el seguimiento de
cada tráfico dependían de procesos dispersos. **CLAPSA NET** los centraliza:

- Cada operación (tráfico) recorre un **proceso de 8 fases** con pasos, dependencias y tiempos medidos.
- Los documentos del embarque se **suben, revisan y aprueban o rechazan** dentro del expediente.
- Clientes y proveedores se dan de alta **leyendo automáticamente la Constancia de Situación Fiscal** en PDF.
- Cada cambio relevante de una operación queda en su **bitácora**, con usuario, fecha y valores anterior y nuevo.
- Lo que cada persona puede hacer depende de su **rol y de una matriz de permisos** que se valida en el servidor.

<!--
  Vista previa del sistema: pendiente de capturas con datos ficticios.
  Ubicación sugerida: docs/screenshots/ (inicio.png, operaciones-tablero.png,
  operacion-proceso.png, operacion-documentos.png, clientes.png, registro-cliente.png,
  proveedores.png, usuarios.png, configuracion-permisos.png).
-->

---

## ✨ Funcionalidades

### 🚢 Operaciones (tráficos de importación y exportación)

| | |
|---|---|
| **Bandeja y tablero** | Listado con búsqueda y filtros, y una vista de tablero con 6 columnas: *En espera de cliente*, *Previo en origen*, *En tránsito*, *Por pagar pedimento*, *En reconocimiento* y *Desaduanado*. |
| **Alta de operación** | Tipo (IMPO / EXPO), medio de transporte, aduana y clave de pedimento del catálogo, ETA, folio manual y cliente. Cada operación recibe un folio consecutivo `CLPT-AA-#####`. |
| **Proceso en 8 fases** | 16 pasos configurables (clasificación, revalidación del BL, despacho, pago de contribuciones, modulación, fletes, maniobras, cuenta de gastos…). Los pasos que no aplican por tipo de operación o medio se marcan solos como *No aplica*. |
| **Candados entre pasos** | Un paso no puede iniciarse hasta cumplir sus requisitos. Por ejemplo, el despacho aduanero exige cliente e importador asignados, documentos obligatorios aprobados, clasificación y (en importación) BL revalidado. |
| **Modulación** | Semáforo verde (liberación) o rojo (reconocimiento → liberación). |
| **Tiempos y SLA** | Se registran inicio, fin y tiempo invertido de cada paso, y se compara contra el SLA en horas configurado para ese paso. |
| **Datos del despacho** | Pedimento (15 dígitos validados), BL/guía, naviera, puerto de origen, incoterm, valor y moneda de factura, fracciones. Contenedores validados con el dígito verificador **ISO 6346**. |
| **Proveedores por paso** | En los pasos que son servicios externos se asigna proveedor y costo. |
| **Cuenta de gastos** | Servicios de proveedores, contribuciones, honorarios (con IVA configurable) y otros cargos. Al emitirla, la operación se cierra y los pasos sin usar pasan a *No aplica*. |
| **Bitácora** | Historial por operación: creación, asignaciones, cambios de paso, documentos, costos y datos editados. |
| **Concurrencia** | Si dos personas cambian el mismo paso a la vez, la segunda recibe un aviso en lugar de sobrescribir. |

### 📂 Expediente documental

- Tipos de documento: factura, BL, packing list, certificado de origen, permisos, CM, hoja técnica, hoja de seguridad, fotos y otros.
- Requisito configurable por tipo de operación: **Obligatorio**, **Si aplica** o **No se pide**.
- Flujo de revisión: `Pendiente → Por revisar → Aprobado | Rechazado (con motivo)`, con registro de quién subió y quién revisó cada documento.
- Solo se aceptan PDF de hasta **5 MB**.

### 🧾 Clientes

- Dos catálogos: **clientes directos** (`CLPD-AA-#####`) y **forwarders** (`CLPF-AA-#####`).
- Un cliente directo puede depender de un forwarder; al crear una operación con un forwarder se elige el importador que aparece en el pedimento.
- **Lectura de la Constancia de Situación Fiscal**: al soltar el PDF se extraen razón social, RFC y domicilio, y se muestra una miniatura del documento. Los datos se pueden corregir antes de guardar y la constancia queda archivada.
- Validación de RFC (persona física o moral), padrón de importadores y **encargo conferido** con fecha de vigencia y PDF.
- Bajas lógicas (activo / inactivo) que conservan el historial, y exportación del listado a CSV.

### 🤝 Proveedores

- Tipos: logística, aduanal y generales.
- Servicios que presta cada proveedor (pasos del proceso) con **tarifa base**, y aduanas donde opera.
- Alta manual o a partir de la Constancia de Situación Fiscal.

### 🏠 Inicio

- Indicadores calculados con las operaciones reales: *Por despachar*, *En reconocimiento*, *Por pagar pedimento*, *Tráfico activo*, *Próximo a llegar* y *Desaduanadas*.
- Avisos de arribos próximos, pendientes y encargos conferidos por vencer (30 días o menos).
- Cada usuario puede **reordenar** indicadores y secciones; el acomodo se guarda por usuario.
- El menú lateral muestra contadores de encargos por vencer, operaciones en reconocimiento y pedimentos por pagar.

### 👥 Usuarios

- Alta, edición, activación / desactivación y eliminación de usuarios.
- Generador de contraseñas seguras y restablecimiento de contraseña.
- Al desactivar a un usuario o cambiar su contraseña se cierran todas sus sesiones.
- Exportación del listado a CSV.

### ⚙️ Configuración

| Sección | Qué se administra |
|---|---|
| Agencia aduanal | Razón social, RFC, agente aduanal, patente y aduanas activas |
| Proceso y etapas | Nombre, SLA y activación de cada paso |
| Documentos | Requisito de cada documento en importación y exportación |
| Catálogos aduaneros | Claves de pedimento por tipo de operación |
| Alertas y avisos | Qué avisos se muestran en Inicio |
| Cuenta de gastos | Honorarios base e IVA de honorarios |
| Roles y permisos | Matriz de permisos editable por rol |

---

## 🔐 Roles y permisos

El sistema define **tres roles**. Los permisos de *Editor* y *Consulta* se pueden ajustar desde
**Configuración → Roles y permisos**; el Administrador siempre conserva todos.

| Permiso | Administrador | Editor | Consulta |
|---|:---:|:---:|:---:|
| Ver operaciones, clientes y proveedores | ✅ | ✅ | ✅ |
| Crear operaciones, asignar cliente y avanzar pasos | ✅ | ✅ | — |
| Subir, aprobar o rechazar documentos | ✅ | ✅ | — |
| Registrar y editar clientes y proveedores | ✅ | ✅ | — |
| Reabrir pasos completados | ✅ | — | — |
| Validar y pagar pedimento, modular | ✅ | — | — |
| Capturar cargos y emitir la cuenta de gastos | ✅ | — | — |
| Dar de baja clientes y proveedores | ✅ | — | — |
| Administrar usuarios | ✅ | — | — |
| Cambiar la configuración | ✅ | — | — |

<sub>Valores por omisión definidos en <code>shared/auth/permisos.ts</code>. El permiso “Ver operaciones” no se puede retirar.</sub>

---

## 🛠️ Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Server Components y Server Actions) | 16.2.4 |
| UI | React · Tailwind CSS · lucide-react | 19.2.4 · 4.2.2 · 1.8 |
| Lenguaje | TypeScript | 5.9.3 |
| Base de datos | PostgreSQL con Prisma ORM y el adaptador `@prisma/adapter-pg` (`pg`) | Prisma 7.8.0 |
| Validación | Zod · React Hook Form | 4.6.7 · 7.x |
| PDF | PDF.js (`pdfjs-dist`) con su **Web Worker** servido desde `public/pdf.worker.js` | 5.6.205 |
| Carga de archivos | react-dropzone · Vercel Blob (`@vercel/blob`) | 15.x · 2.8.2 |
| Pruebas | Vitest | 3.2.4 |

---

## 🧭 Arquitectura

```mermaid
flowchart LR
    subgraph nav["Navegador"]
        UI["Componentes React<br/>(cliente)"]
        PDF["PDF.js + Web Worker<br/>lectura de constancias"]
    end

    subgraph srv["Servidor Next.js"]
        PX["proxy.ts<br/>revisa cookie de sesión"]
        PG["Páginas (App Router)<br/>usuarioConPermiso()"]
        SA["Server Actions<br/>requerirUsuario() + Zod"]
        SV["Servicios y reglas<br/>de dominio"]
        DAL["DAL"]
        API["/api/cron/check-encargos<br/>/api/sesion/salir"]
    end

    DB[("PostgreSQL")]
    BL[("Vercel Blob<br/>o public/uploads")]

    UI --> PX --> PG
    UI -- acciones --> SA
    PDF -. datos extraídos .-> UI
    PG --> DAL
    SA --> SV --> DAL
    SA --> BL
    DAL -- Prisma --> DB
    API --> DB
```

La constancia fiscal se lee **en el navegador** (PDF.js en un Web Worker), así que el texto del
PDF no se procesa en el servidor; al guardar, el archivo se sube por una Server Action. Toda
escritura pasa por una Server Action que verifica la sesión y el permiso antes de tocar la base
de datos.

### Estructura del proyecto

```text
clapsa-net/
├── app/                      # Rutas (App Router)
│   ├── api/                  # cron/check-encargos · sesion/salir
│   ├── clientes/             # directo · forwarder
│   ├── operaciones/          # bandeja y [id] (detalle)
│   ├── proveedores/  usuarios/  configuracion/  login/
│   └── page.tsx              # Inicio
├── features/                 # Un módulo por área de negocio
│   └── operaciones/
│       ├── actions/          # Server Actions
│       ├── components/       # Vistas y pestañas del detalle
│       ├── dal/              # Consultas a la base de datos
│       ├── domain/           # Fases, dependencias y transiciones (puro, con pruebas)
│       └── servicio/         # Reglas de negocio transaccionales
├── shared/
│   ├── auth/                 # Sesión, contraseñas, permisos
│   ├── components/           # Layout, menú lateral, UI reutilizable
│   ├── lib/                  # Prisma, almacenamiento de archivos, resultados
│   └── utils/                # Extracción de PDF, folios, validaciones
├── prisma/                   # schema.prisma · migrations/ · seed.ts
├── tests/integracion/        # Prueba de un despacho completo
├── public/                   # Logos y pdf.worker.js
└── proxy.ts                  # Redirección según cookie de sesión
```

---

## 📋 Requisitos previos

- **Node.js** 20.19+, 22.12+ o 24+ (requisito de Prisma 7; Next.js 16 pide 20.9+).
- **npm** (el repositorio incluye `package-lock.json`).
- **PostgreSQL** accesible mediante una cadena de conexión.
- Opcional: un *store* de **Vercel Blob** para guardar documentos fuera del entorno local.

---

## 🚀 Instalación y configuración

**1. Clonar e instalar**

```bash
git clone <url-del-repositorio> clapsa-net
cd clapsa-net
npm install          # el postinstall ejecuta `prisma generate`
```

**2. Configurar variables de entorno**

Crea `.env.development.local` (lo usa `npm run dev`) y define al menos `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/clapsa_dev"
SEED_ADMIN_EMAIL="admin@ejemplo.com"
SEED_ADMIN_PASSWORD="CambiaEsta123"
```

> [!IMPORTANT]
> La CLI de Prisma carga variables con `dotenv` desde **`.env`**, no desde `.env.development.local`.
> Antes de migrar o sembrar, confirma a qué base apunta, o pasa la variable explícitamente:
> `DATABASE_URL="postgresql://…/clapsa_dev" npm run db:migrate`

**3. Crear el esquema y los catálogos**

```bash
npm run db:migrate   # prisma migrate dev
npm run db:seed      # pasos del proceso, documentos, aduanas, claves y alertas
```

El seed es idempotente. Si `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` están definidos, crea un
administrador cuando todavía no existe.

**4. Ejecutar**

```bash
npm run dev
```

Abre <http://localhost:3000> e inicia sesión con el administrador creado por el seed.

---

## 🔑 Variables de entorno

| Variable | Propósito | ¿Obligatoria? |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. | Sí |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para guardar PDF. Sin él, en desarrollo se guardan en `public/uploads/`. | Sí en producción |
| `CRON_SECRET` | Secreto que se envía como `Authorization: Bearer …` a `/api/cron/check-encargos`. | Solo para el cron |
| `SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` | Datos del administrador inicial que crea el seed. | Opcional |
| `SEED_ADMIN_NAME` | Nombre de ese administrador (por omisión, “Administrador”). | Opcional |
| `DATABASE_URL_TEST` | Base de datos para las pruebas de integración. | Solo para pruebas |

Los archivos `.env*` están excluidos de Git. No publiques valores reales.

---

## 📜 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo de Next.js. |
| `npm run build` | `prisma generate` y compilación de producción. |
| `npm start` | Sirve la compilación de producción. |
| `npm run lint` | ESLint con la configuración de Next.js. |
| `npm run typecheck` | Revisión de tipos con `tsc --noEmit`. |
| `npm test` | Pruebas unitarias (proceso, permisos, contraseñas, validaciones, formato). |
| `npm run test:integracion` | Recorre un despacho completo contra la base de `DATABASE_URL_TEST`. |
| `npm run db:migrate` | `prisma migrate dev`. |
| `npm run db:seed` | Carga los catálogos iniciales. |

```bash
DATABASE_URL_TEST="postgresql://usuario@localhost:5432/clapsa_test" npm run test:integracion
```

---

## 🛡️ Seguridad y control de acceso

- **Sesiones en el servidor.** Al iniciar sesión se genera un token aleatorio de 32 bytes que viaja en la cookie `httpOnly` `clapsa_sesion` (`SameSite=Lax`, `Secure` en producción). En la base de datos solo se guarda su hash SHA-256. Duración: 12 horas.
- **Validación en cada petición.** La sesión se descarta si expiró o si el usuario está inactivo.
- **Contraseñas con scrypt** y sal aleatoria; comparación en tiempo constante. Las contraseñas en formatos anteriores se convierten a scrypt la próxima vez que el usuario inicia sesión. Política mínima: 10 caracteres con mayúscula, minúscula y número.
- **Mensaje genérico** en el inicio de sesión, para no revelar qué correos existen.
- **Autorización en dos niveles.** `proxy.ts` solo redirige según exista o no la cookie; la verificación real ocurre en el servidor: las páginas usan `usuarioConPermiso()` y cada Server Action llama a `requerirUsuario(permiso)`. Los cambios de paso validan además el permiso que corresponde a ese paso (pedimento, cuenta de gastos, reapertura).
- **Validación de entrada** con Zod en las acciones y validación de PDF (tipo y 5 MB) antes de guardar.
- **Endpoint de cron** protegido con `CRON_SECRET` y comparación en tiempo constante.

---

<div align="center">
<sub>Desarrollado para <b>Conexión Logística y Aduanera del Pacífico S.A. de C.V.</b> · Uso interno</sub>
</div>
