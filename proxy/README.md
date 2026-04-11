# Shadow-DB Proxy

Cloudflare Worker that intercepts HTTP requests and forwards them to the Brain API when Shadow Mode is enabled.

## Features

- Intercepts all HTTP requests
- Checks for `X-Shadow-Mode: true` header
- Forwards non-GET requests to Brain API when shadow mode is enabled
- Returns mock production response otherwise
- Comprehensive logging for debugging

## Development

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run deploy
```

## Configuration

Update `wrangler.toml` to configure:
- Worker name
- Environment variables (BRAIN_API_URL)
- Compatibility date

## Usage

Send requests with the following headers to enable shadow mode:
- `X-Shadow-Mode: true`
- `X-Session-ID: your-session-id` (optional, defaults to 'default-session')
