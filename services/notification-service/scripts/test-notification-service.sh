#!/bin/bash

# Script para ejecutar todas las pruebas del notification-service

echo "🧪 Ejecutando todas las pruebas del Notification Service..."
echo "================================================"

cd "$(dirname "$0")/.."

# Ejecutar pruebas con Jest
npm test

# Verificar el resultado
if [ $? -eq 0 ]; then
    echo "================================================"
    echo "✅ Todas las pruebas pasaron exitosamente!"
else
    echo "================================================"
    echo "❌ Algunas pruebas fallaron. Revisa los errores arriba."
    exit 1
fi
