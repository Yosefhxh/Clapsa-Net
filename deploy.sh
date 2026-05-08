#!/bin/bash

# Script de Despliegue Automático para Clapsa-Net
# Uso: ./deploy.sh [producción|desarrollo]

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de Clapsa-Net..."
echo "=========================================="

# Validar parámetro
ENVIRONMENT=${1:-"producción"}

# Color para logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Validar que .env existe
if [ ! -f .env ]; then
  log_error ".env no encontrado"
  log_warning "Crear un archivo .env basado en .env.example"
  exit 1
fi
log_info ".env encontrado"

# 2. Validar que DATABASE_URL está configurado
if ! grep -q "DATABASE_URL" .env; then
  log_error "DATABASE_URL no está configurado en .env"
  exit 1
fi
log_info "DATABASE_URL configurado"

# 3. Instalar dependencias
echo ""
log_info "Instalando dependencias..."
npm install --omit=dev

# 4. Generar cliente Prisma
echo ""
log_info "Generando cliente Prisma..."
npx prisma generate

# 5. Validar estado de migraciones
echo ""
log_info "Validando estado de migraciones..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1)
if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
  log_info "Migraciones: al día ✓"
else
  log_warning "Puede haber migraciones pendientes"
  echo "$MIGRATION_STATUS"
fi

# 6. Compilar para producción
echo ""
log_info "Compilando para $ENVIRONMENT..."
npm run build

if [ $? -ne 0 ]; then
  log_error "Error en la compilación"
  exit 1
fi
log_info "Compilación exitosa"

# 7. Resumen
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Despliegue completado exitosamente${NC}"
echo "=========================================="
echo ""
echo "Pasos siguientes:"
echo "1. Copiar la carpeta del proyecto al servidor:"
echo "   scp -r . usuario@servidor:/ruta/destino"
echo ""
echo "2. En el servidor, iniciar la aplicación:"
echo "   npm start"
echo ""
echo "3. Verificar que la aplicación esté corriendo:"
echo "   curl http://localhost:3000"
echo ""
echo "Nota: Usar PM2 para mantener la aplicación corriendo en background:"
echo "   pm2 start npm --name clapsa-net -- start"
echo ""
