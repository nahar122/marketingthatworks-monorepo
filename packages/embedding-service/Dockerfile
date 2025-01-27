# Dockerfile for main-service

FROM node:18-bullseye-slim AS build


# 1. Set working directory
WORKDIR /app

# 2. Copy package files for main-service AND shared-lib so npm sees both
# COPY packages/main-service/package*.json ./main-service/
# COPY packages/shared-lib/package*.json ./shared-lib/

COPY ./package.json .
COPY ./tsconfig.base.json .
COPY ./packages/embedding-service ./packages/embedding-service
COPY ./packages/shared-lib ./packages/shared-lib

RUN npm install

RUN npm run build:shared-lib
RUN npm run build:embedding-service


# 3. Copy the entire repository (so Docker sees both main-service and shared-lib code)
# COPY . /app

# 4. Move into main-service folder, install dependencies including local reference to ../shared-lib
# WORKDIR /app/packages/main-service
# RUN npm install

# 5. Build the shared-lib, then build the main-service
# RUN cd ../shared-lib && npm run build
# RUN npm run build

# ---------- Production stage ----------
FROM node:18-bullseye-slim AS prod
WORKDIR /app

# Copy built artifacts from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/embedding-service/dist ./embedding-service-dist
COPY --from=build /app/packages/shared-lib/dist ./node_modules/@marketingthatworks/shared-lib
# COPY ./packages/main-service/marketingthatworks-service-acc.json ./marketingthatworks-service-acc.json

EXPOSE 3000
CMD ["node", "embedding-service-dist/server.js"]
# CMD ["-f","/dev/null"]
