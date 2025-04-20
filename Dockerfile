FROM node:22

WORKDIR /app

# Copiar e instalar dependências do backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend ./backend

# Copiar e instalar dependências do frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend

# Build do frontend
RUN cd frontend && npm run build --prod

# Expor a porta do backend
EXPOSE 3000

# Iniciar o backend
CMD ["node", "backend/server.js"]