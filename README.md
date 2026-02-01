# DishFlow - Project Organization

This repository contains three main applications:

## 📱 Mobile App (`/mobile`)
- **Platform**: iOS & Android (React Native + Expo)
- **Tech Stack**: React Native, Expo, NativeWind (Tailwind CSS), TypeScript
- **Entry Point**: `index.ts`
- **Configuration**: `app.json`, `eas.json`

### Running the Mobile App
```bash
cd mobile
npm install
npx expo start
```

## 🔧 Backend API (`/backend`)
- **Platform**: Server (Go)
- **Tech Stack**: Go 1.23, Chi Router, PostgreSQL, Redis
- **Entry Point**: `cmd/server/main.go`
- **Documentation**: See `backend/TRACKING.md`

### Running the Backend
```bash
cd backend
make dev          # Start with Docker Compose
make migrate      # Run database migrations
```

## 🌐 Web Dashboard (`/web-dashboard`)
- **Platform**: Web (Next.js)
- **Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Entry Point**: `app/page.tsx`
- **Purpose**: Testing dashboard for backend features

### Running the Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev       # Runs on http://localhost:3000
```

---

## Project Structure

```
dishflow/
├── mobile/           # 📱 Expo React Native app (iOS/Android)
│   ├── app/          # App screens/routes
│   ├── components/   # React components
│   ├── assets/       # Images, fonts, etc.
│   ├── services/     # API clients
│   └── package.json
│
├── backend/          # 🔧 Go API server
│   ├── cmd/          # Entry points
│   ├── internal/     # Application code
│   ├── migrations/   # Database migrations
│   └── docker-compose.yml
│
└── web-dashboard/    # 🌐 Next.js testing dashboard
    ├── app/          # Next.js pages
    ├── lib/          # Utilities & services
    └── package.json
```

## Development Workflow

1. **Start Backend** (required for mobile & web):
   ```bash
   cd backend && make dev
   ```

2. **Start Mobile App**:
   ```bash
   cd mobile && npx expo start
   ```

3. **Start Web Dashboard** (optional):
   ```bash
   cd web-dashboard && npm run dev
   ```

## Environment Variables

- **Mobile**: Copy `.env.example` if exists
- **Backend**: Set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `GEMINI_API_KEY`
- **Web Dashboard**: API defaults to `http://localhost:8080`

## Documentation

- **Backend**: `backend/TRACKING.md` - Full implementation status
- **Architecture**: `.agent/specs/` - Project specifications
- **API Docs**: `backend/api/openapi.yaml` (if available)

---

**Last Updated**: 2026-02-01  
**Reorganized**: Mobile app files moved to dedicated `/mobile` directory for cleaner structure
