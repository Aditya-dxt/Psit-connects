# PSIT BusTrack Backend

Backend for the PSIT BusTrack TechExpo project.

## Stack
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO for live location events

## Setup

```bash
npm install
copy .env.example .env
npm run seed
npm run dev
```

Linux/macOS:
```bash
cp .env.example .env
```

Server:
`http://localhost:5000`

Health:
`GET /api/health`

## Demo accounts after seeding

Driver:
- mobile: `9999999999`
- password: `driver123`

Student:
- mobile: `8888888888`
- password: `student123`

## Main API flow

Driver:
1. POST `/api/auth/login`
2. POST `/api/driver/verify-qr`
3. POST `/api/trips/start`
4. POST `/api/trips/:tripId/location` repeatedly
5. POST `/api/trips/:tripId/end`

Student:
1. POST `/api/auth/login`
2. GET `/api/stops`
3. GET `/api/stops/:stopId/buses`
4. GET `/api/buses/:busId/live`
5. GET `/api/buses/:busId/eta?stopId=...`

Socket:
- Connect with JWT
- Event emitted by server: `bus:location`
