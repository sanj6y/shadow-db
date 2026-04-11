# Shadow-DB

**Deterministic Simulation API for AI Agents**

Shadow-DB intercepts write operations (INSERT/UPDATE/DELETE) from AI agents, simulates them in a virtual memory layer using Supermemory and Gemini, and generates a "Diff Report" before any real data is touched.

## Architecture

- **Proxy** (Cloudflare Worker): Intercepts HTTP requests. If `X-Shadow-Mode` header is `true`, reroutes `POST/PUT/DELETE` to the Brain API.
- **Brain** (Node.js/Hono): Uses Supermemory SDK to store "forked" state and Gemini API to calculate the "Resulting State" of a SQL query.
- **UI** (Next.js): A dashboard to visualize the Original State vs. the Shadow State (the Diff).

## Technology Stack

- Cloudflare Workers
- Supermemory API
- Gemini API
- Hono
- Next.js
- Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deploying the proxy)
- Supermemory API key (placeholder for now)
- Gemini API key (placeholder for now)

### Installation

1. **Proxy Setup**
   ```bash
   cd proxy
   npm install
   ```

2. **Brain Setup**
   ```bash
   cd brain
   npm install
   ```

3. **UI Setup**
   ```bash
   cd ui
   npm install
   ```

## Configuration

### Environment Variables

**Brain Server** (`brain/.env`):
```
SUPERMEMORY_API_KEY=your_supermemory_api_key
SUPERMEMORY_API_URL=https://api.supermemory.com/v1
GEMINI_API_KEY=your_gemini_api_key
```

**UI** (`ui/.env.local`):
```
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:3001
NEXT_PUBLIC_PROXY_URL=http://localhost:8787
```

## Running Locally

### 1. Start the Brain Server
```bash
cd brain
npm run dev
```
Server runs on `http://localhost:3001`

### 2. Start the Proxy (Cloudflare Worker)
```bash
cd proxy
npm run dev
```
Worker runs on `http://localhost:8787` (default Wrangler port)

### 3. Start the UI
```bash
cd ui
npm run dev
```
UI runs on `http://localhost:3000`

## Usage

1. Open the UI dashboard at `http://localhost:3000`
2. Click "Connect" to create an initial snapshot
3. Enter a SQL command in the "Run Agent Command" text area (e.g., `UPDATE users SET balance = 0 WHERE name = 'John'`)
4. Click "Execute" to simulate the query
5. View the diff showing Original State vs. Proposed State

## API Endpoints

### Brain API

- `POST /v1/fork` - Store initial snapshot
  ```json
  {
    "snapshot": {...},
    "session_id": "your-session-id"
  }
  ```

- `POST /v1/execute` - Simulate SQL query
  ```json
  {
    "query": "UPDATE users SET balance = 0",
    "session_id": "your-session-id"
  }
  ```

- `GET /v1/diff?session_id=your-session-id` - Get diff between original and proposed state

### Proxy

- Any endpoint with `X-Shadow-Mode: true` header will be intercepted and forwarded to Brain API
- Without the header, returns mock production response

## Development Notes

- Supermemory API integration uses placeholder functions - replace with actual SDK calls when API keys are available
- Gemini API is configured but requires valid API key
- The proxy uses in-memory storage for development - replace with actual Supermemory API calls in production
