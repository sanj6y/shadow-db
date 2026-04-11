# Shadow-DB Brain

Node.js server that manages state forking, SQL simulation, and diff generation.

## Features

- **POST /v1/fork**: Store initial database snapshot in Supermemory
- **POST /v1/execute**: Simulate SQL queries using Gemini API
- **GET /v1/diff**: Compare original state with proposed state

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
SUPERMEMORY_API_KEY=your_key_here
SUPERMEMORY_API_URL=https://api.supermemory.com/v1
GEMINI_API_KEY=your_key_here
```

3. Run the server:
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### POST /v1/fork
Store an initial snapshot of the database state.

**Request:**
```json
{
  "snapshot": {
    "users": [
      {"id": 1, "name": "John", "balance": 100}
    ]
  },
  "session_id": "my-session"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Snapshot stored successfully",
  "session_id": "my-session"
}
```

### POST /v1/execute
Simulate a SQL query and calculate the resulting state.

**Request:**
```json
{
  "query": "UPDATE users SET balance = 0 WHERE name = 'John'",
  "session_id": "my-session"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Query simulated successfully",
  "session_id": "my-session",
  "shadow_state": {...}
}
```

### GET /v1/diff
Get the difference between original and proposed state.

**Request:**
```
GET /v1/diff?session_id=my-session
```

**Response:**
```json
{
  "status": "success",
  "diff": {
    "original": {...},
    "proposed": {...},
    "query": "UPDATE users SET balance = 0",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Notes

- Currently uses in-memory storage for development
- Replace Supermemory API calls with actual SDK when API keys are available
- Gemini API integration requires valid API key
