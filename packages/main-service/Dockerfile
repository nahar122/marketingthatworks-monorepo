# Dockerfile for main-service

FROM node:18-bullseye-slim as build

# 1. Set working directory
WORKDIR /app

# 2. Copy package files for main-service AND shared-lib so npm sees both
COPY main-service/package*.json ./
COPY shared-lib/package*.json ../shared-lib/

# 3. Copy the entire repository (so Docker sees both main-service and shared-lib code)
COPY . /app

# 4. Move into main-service folder, install dependencies including local reference to ../shared-lib
WORKDIR /app/main-service
RUN npm install

# 5. Build the shared-lib, then build the main-service
RUN cd ../shared-lib && npm run build
RUN npm run build

# ---------- Production stage ----------
FROM node:18-bullseye-slim
WORKDIR /app

# Copy built artifacts from build stage
COPY --from=build /app/main-service/node_modules ./node_modules
COPY --from=build /app/main-service/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
