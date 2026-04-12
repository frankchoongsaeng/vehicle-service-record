FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_BUGSINK_ENABLED=true
ARG VITE_BUGSINK_DSN=
ARG VITE_BUGSINK_ENVIRONMENT=production
ARG VITE_BUGSINK_TRACES_SAMPLE_RATE=0.15
ARG VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE=0
ARG VITE_BUGSINK_REPLAYS_ON_ERROR_SAMPLE_RATE=1
ENV VITE_BUGSINK_ENABLED=$VITE_BUGSINK_ENABLED
ENV VITE_BUGSINK_DSN=$VITE_BUGSINK_DSN
ENV VITE_BUGSINK_ENVIRONMENT=$VITE_BUGSINK_ENVIRONMENT
ENV VITE_BUGSINK_TRACES_SAMPLE_RATE=$VITE_BUGSINK_TRACES_SAMPLE_RATE
ENV VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE=$VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE
ENV VITE_BUGSINK_REPLAYS_ON_ERROR_SAMPLE_RATE=$VITE_BUGSINK_REPLAYS_ON_ERROR_SAMPLE_RATE

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    mkdir -p /tmp/picomatch; \
    cd /tmp/picomatch; \
    npm pack picomatch@4.0.4 >/dev/null; \
    tar -xzf picomatch-4.0.4.tgz; \
    rm -rf /usr/local/lib/node_modules/npm/node_modules/picomatch; \
    mv package /usr/local/lib/node_modules/npm/node_modules/picomatch; \
    rm -rf /tmp/picomatch

COPY package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.node.json vite.config.ts eslint.config.js postcss.config.cjs tailwind.config.ts ./
COPY prisma ./prisma

RUN npm ci --include=dev --ignore-scripts

COPY . .

RUN MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 MYSQL_DATABASE=duralog MYSQL_USER=duralog MYSQL_PASSWORD=duralog npm run db:generate \
    && npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    mkdir -p /tmp/picomatch; \
    cd /tmp/picomatch; \
    npm pack picomatch@4.0.4 >/dev/null; \
    tar -xzf picomatch-4.0.4.tgz; \
    rm -rf /usr/local/lib/node_modules/npm/node_modules/picomatch; \
    mv package /usr/local/lib/node_modules/npm/node_modules/picomatch; \
    rm -rf /tmp/picomatch

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/docker ./docker
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/tsconfig.node.json ./tsconfig.node.json

EXPOSE 3001

ENTRYPOINT ["/bin/sh", "./docker/docker-entrypoint.sh"]
CMD ["node", "./dist/index.js"]
