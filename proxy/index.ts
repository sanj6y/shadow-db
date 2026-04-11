import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  BRAIN_API_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for development
app.use('*', cors());

// Logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url} - ${ms}ms`);
});

// Main request handler
app.all('*', async (c) => {
  const shadowMode = c.req.header('X-Shadow-Mode');
  const method = c.req.method;
  
  console.log(`[PROXY] Request received - Method: ${method}, X-Shadow-Mode: ${shadowMode}`);
  
  // Check if shadow mode is enabled and method is not GET
  if (shadowMode === 'true' && method !== 'GET') {
    console.log(`[PROXY] Intercepting ${method} request - forwarding to Brain API`);
    
    try {
      const body = await c.req.text();
      const originalUrl = c.req.url;
      
      // Forward to Brain API
      const brainUrl = c.env?.BRAIN_API_URL || 'http://localhost:3001/v1/execute';
      
      console.log(`[PROXY] Forwarding to: ${brainUrl}`);
      console.log(`[PROXY] Original URL: ${originalUrl}`);
      console.log(`[PROXY] Request body: ${body}`);
      
      const response = await fetch(brainUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: body,
          session_id: c.req.header('X-Session-ID') || 'default-session',
          original_url: originalUrl,
          method: method,
        }),
      });
      
      const result = await response.json();
      console.log(`[PROXY] Brain API response:`, result);
      
      return c.json(result);
    } catch (error) {
      console.error(`[PROXY] Error forwarding request:`, error);
      return c.json(
        { 
          status: 'error', 
          message: 'Failed to forward request to Brain API',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        500
      );
    }
  }
  
  // Default response for non-shadow mode or GET requests
  console.log(`[PROXY] Returning mock response - mode: production`);
  return c.json({
    status: 'success',
    mode: 'production',
    data: 'Real DB updated'
  });
});

export default app;
