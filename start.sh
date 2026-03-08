#!/bin/bash
# Script para iniciar la app de Control Presupuestal

echo "🏗️  Control Presupuestal - App Inmobiliaria"
echo "==========================================="

# Verificar que estamos en el directorio correcto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Iniciar backend
echo ""
echo "📦 Iniciando backend (puerto 3001)..."
cd backend && npx tsx src/index.ts &
BACKEND_PID=$!
cd ..

# Esperar a que el backend inicie
sleep 2

# Verificar que el backend está corriendo
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Backend listo en http://localhost:3001"
else
  echo "❌ Error iniciando el backend"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

# Iniciar frontend
echo ""
echo "🎨 Iniciando frontend (puerto 5173)..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==========================================="
echo "✅ App iniciada!"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📋 Usuarios:"
echo "   admin@empresa.com    / Admin123!    (Administrador)"
echo "   director@empresa.com / Director123! (Director de Obra)"
echo "   contador@empresa.com / Contador123! (Contador)"
echo ""
echo "Presiona Ctrl+C para detener"

# Esperar y limpiar al salir
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'App detenida'" EXIT
wait
