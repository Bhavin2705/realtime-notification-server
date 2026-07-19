# Real-Time Notification Server

A real-time notification system I built to learn WebSockets, Redis pub/sub, and event-driven architecture. Users get instant push notifications via Socket.io when they're online, and can fetch missed notifications via REST API when they come back.

## How It Works

```
Backend Service → POST /send → PostgreSQL (persist) + Redis Pub/Sub (broadcast)
                                            ↓
                              Socket.io picks it up → pushes to user's browser
```

1. An external service sends a notification via the REST API
2. It gets saved to PostgreSQL and published to a Redis channel
3. The Redis subscriber forwards it through Socket.io to the user's private room (`user:<id>`)
4. If the user is offline, they fetch unread notifications via `GET /unread` when they reconnect

## Tech Stack

- **Node.js + Express** — REST API
- **Socket.io** — real-time WebSocket delivery
- **PostgreSQL** — notification persistence
- **Redis** — pub/sub broadcasting + unread count caching
- **JWT** — auth for both REST and WebSocket
- **Playwright** — E2E browser tests

## Quick Start

### With Docker (easiest)

```bash
docker-compose up --build
```

### Locally

```bash
cp .env.example .env
npm install
npm run dev
```

Make sure PostgreSQL and Redis are running.

### Seed test data

```bash
npm run seed
```

### Generate a JWT token

```bash
npm run generate-token          # default: usr_1
npm run generate-token usr_42   # custom user
```

## Demo

Open `http://localhost:3000` in your browser to try the live demo client:

1. Generate a token with `npm run generate-token`
2. Paste it in the token field and click Connect
3. Send a test notification from the form
4. Watch it appear in real-time 🔔

## REST API

### POST /api/v1/notifications/send

```bash
curl -X POST http://localhost:3000/api/v1/notifications/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "usr_1",
    "type": "ORDER_SHIPPED",
    "title": "Order Shipped!",
    "body": "Your package #8821 has been handed to the carrier.",
    "data": { "order_id": "8821" }
  }'
```

### GET /api/v1/notifications/unread

```bash
curl http://localhost:3000/api/v1/notifications/unread?page=1&limit=20 \
  -H "Authorization: Bearer <token>"
```

### PATCH /api/v1/notifications/:id/read

```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/<id>/read \
  -H "Authorization: Bearer <token>"
```

### PATCH /api/v1/notifications/read-all

```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/read-all \
  -H "Authorization: Bearer <token>"
```

## WebSocket Events

```javascript
// connect
const socket = io('http://localhost:3000', {
  auth: { token: '<jwt_token>' }
});

// receive notifications
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

// acknowledge
socket.emit('notification:ack', { id: '<notification_id>' });
```

## Testing

### Unit & Integration Tests (Jest)

```bash
npm test
```

### E2E Tests (Playwright)

Requires the full stack running (`docker-compose up`):

```bash
npm run test:e2e
```

The E2E tests open a real browser, connect via WebSocket, send notifications through the API, and verify they appear on the page in real-time.

## What I Learned

- How Redis pub/sub enables broadcasting across multiple server instances
- Socket.io room management for targeting specific users
- Caching strategies with Redis (unread counter cache with TTL + DB fallback)
- JWT-based authentication for both HTTP and WebSocket connections
- Writing E2E tests with Playwright for real-time WebSocket features

## License

MIT
