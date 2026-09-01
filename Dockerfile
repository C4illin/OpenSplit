# Stage 1: Build the frontend
FROM node:24-alpine AS frontend

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ENV pnpm_config_verify_deps_before_run=false
RUN pnpm build

# Stage 2: Build the custom PocketBase binary (adds Web Push, see main.go)
FROM golang:1.27-alpine AS backend

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go webpush.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o pocketbase .

# Stage 3: PocketBase + static frontend
FROM alpine:latest

RUN apk add --no-cache ca-certificates

COPY --from=backend /app/pocketbase /pb/pocketbase

COPY --from=frontend /app/dist /pb/pb_public

COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks

EXPOSE 5050

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:5050"]
