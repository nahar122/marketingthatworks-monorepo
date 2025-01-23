# Dockerfile for embedding-service

FROM node:18-bullseye-slim as build

# 1. Set working directory
WORKDIR /app

# 2. Copy package files for embedding-service AND shared-lib
COPY embedding-service/package*.json ./
COPY shared-lib/package*.json ../shared-lib/

# 3. Copy the entire repository so Docker has both embedding-service & shared-lib code
COPY . /app

# 4. Switch into the embedding-service folder; install dependencies (including the local file reference to ../shared-lib)
WORKDIR /app/embedding-service
RUN npm install

# 5. Build the shared-lib, then build the embedding-service
RUN cd ../shared-lib && npm run build
RUN npm run build

# ---------- Production stage ----------
FROM node:18-bullseye-slim
WORKDIR /app

# 6. Copy the compiled artifacts and node_modules from the build stage
COPY --from=build /app/embedding-service/node_modules ./node_modules
COPY --from=build /app/embedding-service/dist ./dist

# If you also need the compiled shared-lib code at runtime,
# you could copy it as well:
# COPY --from=build /app/shared-lib/dist ../shared-lib/dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
