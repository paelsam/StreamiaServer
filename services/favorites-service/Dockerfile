# ========== ETAPA ÚNICA (más simple) ==========
FROM node:20-alpine

WORKDIR /app/services/favorites-service

# 1. Copiar archivos del servicio
COPY services/favorites-service/package*.json ./
COPY services/favorites-service/tsconfig.json ./
COPY services/favorites-service/src ./src

# 2. Copiar shared package (desde el contexto raíz)
COPY shared/ ../shared/

# 3. Configurar shared como dependencia local
RUN npm pkg set dependencies.@streamia/shared="file:../../shared" \
    && npm pkg set dependencies.@streamia/event-bus="file:../../shared/event-bus"

# 4. Instalar dependencias
RUN npm install

# 5. Construir
RUN npm run build

# 6. Variables de entorno
ENV NODE_ENV=production
ENV PORT=3003

# 7. Exponer puerto
EXPOSE 3003

# 8. Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health/live || exit 1

# 9. Usuario no-root
USER node

# 10. Comando de inicio
CMD ["node", "dist/index.js"]