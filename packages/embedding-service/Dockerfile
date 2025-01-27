# Dockerfile for main-service

FROM node:18-bullseye-slim AS build


# 1. Set working directory
WORKDIR /app


COPY ./package.json .
COPY ./tsconfig.base.json .
COPY ./packages/embedding-service ./packages/embedding-service
COPY ./packages/shared-lib ./packages/shared-lib

RUN npm install
# RUN npx puppeteer install

RUN npm run build:shared-lib
RUN npm run build:embedding-service


# ---------- Production stage ----------
FROM node:18-bullseye-slim AS prod
WORKDIR /app

RUN  apt-get update \
     && apt-get install -y wget gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     # We install Chrome to get all the OS level dependencies, but Chrome itself
     # is not actually used as it's packaged in the node puppeteer library.
     # Alternatively, we could could include the entire dep list ourselves
     # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
     # but that seems too easy to get out of date.
     && apt-get install -y google-chrome-stable \
     && rm -rf /var/lib/apt/lists/* \
     && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     && chmod +x /usr/sbin/wait-for-it.sh

# Copy built artifacts from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/embedding-service/dist ./embedding-service-dist
COPY --from=build /app/packages/shared-lib/dist ./node_modules/@marketingthatworks/shared-lib
# COPY ./packages/main-service/marketingthatworks-service-acc.json ./marketingthatworks-service-acc.json

EXPOSE 3000
CMD ["node", "embedding-service-dist/server.js"]
# CMD ["-f","/dev/null"]
