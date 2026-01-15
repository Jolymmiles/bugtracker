# Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_BOT_USERNAME=YourBotName
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME
RUN npm run build

# Build Go backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bugtracker ./cmd/server

# Final image
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=backend-builder /app/bugtracker .
COPY --from=frontend-builder /app/frontend/../web/dist ./web/dist

EXPOSE 3000

CMD ["./bugtracker"]
