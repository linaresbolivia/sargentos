#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE SINCRONIZACIÓN Y DESPLIEGUE RÁPIDO PARA VPS (CHLS SARGENTOS)
# ==============================================================================
# Este script automatiza la sincronización total desde GitHub en el VPS:
# 1. git pull (actualización de código)
# 2. Instalación de dependencias si hubo cambios
# 3. Sincronización y migración segura de Base de Datos (Prisma db push + generate)
# 4. Compilación de Backend y Frontend
# 5. Recarga en caliente del servicio (PM2 / Node)
# ==============================================================================

set -e

# Colores para la consola
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN} 🏇 CHLS SARGENTOS - SINCRONIZACIÓN & DESPLIEGUE VPS ${NC}"
echo -e "${CYAN}======================================================${NC}\n"

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. ACTUALIZAR CÓDIGO DESDE GITHUB
echo -e "${YELLOW}📥 [Paso 1/5] Descargando últimos cambios desde GitHub...${NC}"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo -e "   Rama actual: ${CYAN}${BRANCH}${NC}"
git pull origin "$BRANCH"

# 2. INSTALAR DEPENDENCIAS (si se modificaron packages)
echo -e "\n${YELLOW}📦 [Paso 2/5] Verificando dependencias...${NC}"
npm install --no-audit

# 3. MIGRACIÓN Y SINCRONIZACIÓN DE LA BASE DE DATOS
echo -e "\n${YELLOW}🗄️  [Paso 3/5] Sincronizando esquema de Base de Datos (PostgreSQL / Prisma)...${NC}"
# Sincronización rápida y no destructiva sin requerir shadow database
npm run db:migrate

# 4. COMPILACIÓN DE APLICACIONES (BACKEND + FRONTEND)
echo -e "\n${YELLOW}⚙️  [Paso 4/5] Compilando Backend y Frontend...${NC}"
echo -e "   Compilando Backend (TypeScript -> JavaScript)..."
npm run build:backend

echo -e "   Compilando Frontend (React / Vite -> dist)..."
npm run build:frontend

# 5. REINICIAR SERVICIO DEL BACKEND
echo -e "\n${YELLOW}🔄 [Paso 5/5] Recargando servicio del servidor...${NC}"
if command -v pm2 &> /dev/null; then
    # Intentar recargar el proceso si existe en PM2
    if pm2 list | grep -q "sargentos"; then
        echo -e "   Recargando proceso 'sargentos' en PM2..."
        pm2 reload sargentos --update-env || pm2 restart sargentos
    elif pm2 list | grep -q "backend"; then
        echo -e "   Recargando proceso 'backend' en PM2..."
        pm2 reload backend --update-env || pm2 restart backend
    else
        echo -e "   Reiniciando todos los procesos en PM2..."
        pm2 reload all --update-env || pm2 restart all
    fi
    echo -e "   Estado actual de PM2:"
    pm2 status
elif command -v systemctl &> /dev/null && systemctl is-active --quiet sargentos; then
    echo -e "   Reiniciando servicio systemd 'sargentos'..."
    sudo systemctl restart sargentos
else
    echo -e "${CYAN}ℹ️  Nota: Recuerde reiniciar su proceso Node si corre como servicio.${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN} ✨ ¡SINCRONIZACIÓN Y MIGRACIÓN COMPLETADAS CON ÉXITO! ${NC}"
echo -e "${GREEN}======================================================${NC}\n"
