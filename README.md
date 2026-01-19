# Bug Tracker

Bug and suggestion tracker with Telegram authentication.

## Features

- Create cards (bugs and suggestions)
- Vote on cards
- Comments
- Image uploads
- Telegram authentication
- Admin panel for status management

## Quick Start

### Docker Compose

1. Create `.env` file:
```bash
cp .env.example .env
```

2. Fill in the variables in `.env`:
- `BOT_TOKEN` - bot token from @BotFather
- `BOT_USERNAME` - bot username
- `SESSION_KEY` - session secret key
- `IMGBB_API_KEY` - ImgBB API key (optional, legacy)

### S3 Storage (optional)
For file uploads (images, videos, files up to 100MB):
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - AWS region (default: us-east-1)
- `S3_ENDPOINT` - custom endpoint for MinIO/Cloudflare R2 (optional)
- `S3_ACCESS_KEY_ID` - AWS access key
- `S3_SECRET_ACCESS_KEY` - AWS secret key
- `S3_PUBLIC_URL` - public URL for accessing files (e.g., https://bucket.s3.amazonaws.com)

3. Run:
```bash
docker compose up -d
```

The app will be available at http://localhost:3000

## Development

### Backend (Go)
```bash
go run cmd/server/main.go
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend**: Go, Chi, PostgreSQL
- **Frontend**: React, Mantine UI, BlockNote
- **Auth**: Telegram Login Widget
