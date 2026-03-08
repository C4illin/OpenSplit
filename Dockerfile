# Stage 1: Build the frontend
FROM node:24-alpine AS frontend

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 2: PocketBase + static frontend
FROM alpine:latest

ARG PB_VERSION=0.36.6

RUN apk add --no-cache \
    unzip \
    ca-certificates

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

COPY --from=frontend /app/dist /pb/pb_public

COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks

EXPOSE 8080

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
