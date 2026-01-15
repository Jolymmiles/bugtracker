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
- `IMGBB_API_KEY` - ImgBB API key (optional)

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
