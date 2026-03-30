FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV DATABASE_URL=mysql://duralog:duralog@mysql:3306/duralog
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

COPY package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.node.json vite.config.ts eslint.config.js postcss.config.cjs tailwind.config.ts ./
COPY prisma ./prisma

RUN npm ci --include=dev

COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

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
CMD ["npm", "run", "start"]
