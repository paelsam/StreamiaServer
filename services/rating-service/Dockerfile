FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build shared package first, then build all services
RUN npm run build --workspace=shared && npm run build --workspaces

EXPOSE 3004

CMD ["npm", "start"]