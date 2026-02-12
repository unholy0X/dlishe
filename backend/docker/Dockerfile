# Build stage
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /migrate-thumbnails ./cmd/migrate-thumbnails

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates ffmpeg python3 py3-pip curl
RUN pip3 install yt-dlp --break-system-packages

COPY --from=builder /server /server
COPY --from=builder /migrate-thumbnails /migrate-thumbnails
COPY --from=builder /app/migrations /migrations

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["/server"]
