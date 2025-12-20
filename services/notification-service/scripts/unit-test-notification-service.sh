#!/bin/bash

# Script para ejecutar solo las pruebas unitarias del notification-service

echo "🔬 Ejecutando pruebas unitarias del Notification Service..."
echo "================================================"

cd "$(dirname "$0")/.."

# Ejecutar solo las pruebas unitarias
npm test -- --testPathPattern=notificationService.test.ts

# Verificar el resultado
if [ $? -eq 0 ]; then
    echo "================================================"
    echo "✅ Pruebas unitarias pasadas!"
else
    echo "================================================"
    echo "❌ Algunas pruebas unitarias fallaron."
    exit 1
fi
