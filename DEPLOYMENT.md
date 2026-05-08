# Guía de Despliegue de Clapsa-Net

## 📋 Pre-requisitos

- Node.js 18+ instalado
- npm o yarn instalado
- Acceso a la base de datos Prisma.io configurada
- Variables de entorno correctamente configuradas

---

## 🚀 Pasos para Desplegar

### 1️⃣ **Preparación del Servidor**

```bash
# Clonar el repositorio
git clone https://github.com/Yosefhxh/Clapsa-Net.git
cd Clapsa-Net

# Instalar dependencias
npm install

# Copiar archivo .env (debe contener DATABASE_URL)
# El archivo .env debe estar en la raíz del proyecto con la cadena de conexión correcta
```

### 2️⃣ **Configurar Variables de Entorno**

Crear un archivo `.env` en la raíz con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgres://[usuario]:[contraseña]@[host]:[puerto]/[base_de_datos]?sslmode=require"

# Modo de ejecución
NODE_ENV=production
```

**Nota:** La `DATABASE_URL` de Prisma.io ya está configurada en el proyecto. Solo necesita validar que esté en el servidor.

### 3️⃣ **Validar Estado de Migraciones**

```bash
# Verificar el estado de las migraciones
npx prisma migrate status

# Esperado: "Database schema is up to date!"
```

### 4️⃣ **Ejecutar Migraciones** (si es necesario)

Si hay migraciones pendientes:

```bash
# Aplicar migraciones en producción
npx prisma migrate deploy
```

### 5️⃣ **Generar Cliente Prisma**

```bash
# Generar el cliente Prisma
npx prisma generate
```

### 6️⃣ **Compilar para Producción**

```bash
# Compilar el proyecto Next.js
npm run build

# Verificar que no haya errores (salida esperada: "✓ Compiled successfully")
```

### 7️⃣ **Iniciar el Servidor**

```bash
# Opción 1: Iniciar en modo producción
npm start

# Opción 2: Con PM2 (recomendado para servidor)
npm install -g pm2
pm2 start npm --name "clapsa-net" -- start
pm2 save

# Opción 3: Con Docker (si tienes Dockerfile configurado)
docker build -t clapsa-net .
docker run -p 3000:3000 --env-file .env clapsa-net
```

---

## 🔍 Verificación Post-Despliegue

```bash
# 1. Verificar que el servidor está corriendo
curl http://localhost:3000

# 2. Verificar conexión a la base de datos
npx prisma db execute --stdin < prisma/validate.sql

# 3. Revisar logs
npm run build && npm start
```

---

## 📊 Estado Actual de la Base de Datos

✅ **Migraciones:** 4 migraciones encontradas y aplicadas
✅ **Schema:** Actualizado
✅ **Tablas:** 
  - `Cliente` (con índices UNIQUE en `folio` y `rfc`)
  - `Proveedor` (con índices UNIQUE en `rfc`)
  - `Usuario` (con índices UNIQUE en `correo`)
  - `DespachoPDF` (relación con Proveedor)

---

## 🔧 Troubleshooting

### Error: "DATABASE_URL environment variable is not set"
```bash
# Solución: Verificar que .env esté en la raíz y tenga la variable
echo $DATABASE_URL  # Debe mostrar la URL de conexión
```

### Error: "P2023: Connection refused"
```bash
# Solución: Verificar que la base de datos esté accesible
# Validar: host, puerto, credenciales en DATABASE_URL
npx prisma db push  # Para probar conexión
```

### Error: "P2002: Unique constraint failed"
```bash
# Solución: Si hay datos duplicados, usar:
npx prisma db seed  # Ejecutar script de seed (si existe)
# O hacer reset (SOLO en desarrollo):
npx prisma migrate reset
```

---

## 📁 Estructura de Build

Después de `npm run build`, se genera la carpeta `.next` con:
- Código compilado optimizado
- Assets estáticos
- Rutas pre-renderizadas

```
.next/
├── standalone/   (Producción optimizada)
├── static/       (Assets estáticos)
└── ...otros archivos de build
```

---

## 🔐 Notas de Seguridad

- ✅ Nunca commitear `.env` a Git (ya está en `.gitignore`)
- ✅ Usar variables de entorno seguroseguras en el servidor
- ✅ Activar SSL/TLS en la base de datos (ya usa `sslmode=require`)
- ✅ Restringir acceso a puertos en firewall (puerto 3000 por defecto)

---

## 📞 Monitoreo

Para monitorear la aplicación en producción:

```bash
# Con PM2
pm2 logs clapsa-net
pm2 status

# Con systemd
sudo systemctl status clapsa-net
```

---

## ✅ Checklist de Despliegue

- [ ] Variables de entorno configuradas
- [ ] `.env` copiado al servidor
- [ ] `npm install` ejecutado
- [ ] Migraciones validadas: `npx prisma migrate status`
- [ ] Build compilado: `npm run build` (sin errores)
- [ ] Prisma client generado: `npx prisma generate`
- [ ] Servidor iniciado: `npm start`
- [ ] Conexión a BD verificada
- [ ] Logs revisados sin errores
- [ ] Acceso a `http://servidor:3000` confirmado

---

**Última actualización:** Inicialización - Base de datos en Prisma.io
**Estado:** ✅ Listo para despliegue en producción
