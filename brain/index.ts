import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Supermemory will be dynamically imported if available
let supermemory: any = null;

const app = new Hono();

// Enable CORS
app.use('*', cors());

// API keys
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY || 'YOUR_SUPERMEMORY_API_KEY';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

// Initialize Supermemory client (will be done lazily in functions)
async function initSupermemory() {
  if (supermemory) return supermemory;
  
  try {
    // @ts-ignore - Supermemory package may not be installed yet
    const Supermemory = (await import('supermemory')).default;
    supermemory = new Supermemory({
      apiKey: SUPERMEMORY_API_KEY,
    });
    console.log('[BRAIN] Supermemory client initialized');
    return supermemory;
  } catch (error) {
    console.warn('[BRAIN] Supermemory package not found. Install with: npm install supermemory');
    console.warn('[BRAIN] Using in-memory storage as fallback');
    return null;
  }
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Fallback in-memory storage (used if Supermemory fails)
const memoryStore: Record<string, {
  initial_snapshot?: any;
  shadow_update?: any;
  [key: string]: any;
}> = {};

// Helper function to call Supermemory API
async function storeInSupermemory(sessionId: string, namespace: string, data: any): Promise<void> {
  // Always store in-memory as fallback
  if (!memoryStore[sessionId]) {
    memoryStore[sessionId] = {};
  }
  memoryStore[sessionId][namespace] = data;
  
  // Try to use Supermemory if available
  const client = await initSupermemory();
  if (client) {
    try {
      // Store in Supermemory using containerTags for session_id and metadata for namespace
      await client.add({
        content: JSON.stringify(data),
        containerTags: [sessionId],
        metadata: {
          namespace: namespace,
          type: 'shadow-db-state',
          timestamp: new Date().toISOString(),
        },
      });
      console.log(`[BRAIN] Stored in Supermemory - Session: ${sessionId}, Namespace: ${namespace}`);
    } catch (error) {
      console.error(`[BRAIN] Error storing in Supermemory, using in-memory fallback:`, error);
    }
  } else {
    console.log(`[BRAIN] Stored in-memory (Supermemory not available) - Session: ${sessionId}, Namespace: ${namespace}`);
  }
}

async function retrieveFromSupermemory(sessionId: string, namespace: string): Promise<any> {
  // Try Supermemory first if available
  const client = await initSupermemory();
  if (client) {
    try {
      // First try: Search for documents with matching session_id and namespace
      const response = await client.search.documents({
        q: `namespace:${namespace}`,
        containerTags: [sessionId],
        filters: {
          AND: [
            { key: 'namespace', value: namespace },
            { key: 'type', value: 'shadow-db-state' },
          ],
        },
        limit: 10, // Get more results to find the most recent
      });
      
      if (response.results && response.results.length > 0) {
        // Get the most recent document (first one should be most recent)
        const doc = response.results[0];
        console.log(`[BRAIN] Found document in Supermemory search:`, {
          hasContent: !!doc.content,
          contentType: typeof doc.content,
          contentLength: doc.content?.length,
          metadata: doc.metadata,
        });
        let data;
        try {
          data = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
          console.log(`[BRAIN] Parsed data:`, JSON.stringify(data).substring(0, 200));
        } catch (parseError) {
          console.error(`[BRAIN] Failed to parse document content:`, doc.content);
          data = doc.content;
        }
        console.log(`[BRAIN] Retrieved from Supermemory - Session: ${sessionId}, Namespace: ${namespace}`);
        // Also update in-memory cache
        if (!memoryStore[sessionId]) {
          memoryStore[sessionId] = {};
        }
        memoryStore[sessionId][namespace] = data;
        return data;
      } else {
        // If search didn't find it, try listing documents
        console.log(`[BRAIN] Search found no results, trying documents.list for Session: ${sessionId}, Namespace: ${namespace}`);
        try {
          const docs = await client.documents.list({ 
            containerTags: [sessionId], 
            limit: 50 
          });
          
          // Filter by namespace in metadata
          const matchingDocs = docs.documents?.filter((doc: any) => 
            doc.metadata?.namespace === namespace && doc.metadata?.type === 'shadow-db-state'
          ) || [];
          
          if (matchingDocs.length > 0) {
            // Get the most recent one
            const doc = matchingDocs[0];
            console.log(`[BRAIN] Found document in Supermemory list:`, {
              hasContent: !!doc.content,
              contentType: typeof doc.content,
              contentLength: doc.content?.length,
              metadata: doc.metadata,
            });
            let data;
            try {
              data = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
              console.log(`[BRAIN] Parsed data (via list):`, JSON.stringify(data).substring(0, 200));
            } catch (parseError) {
              console.error(`[BRAIN] Failed to parse document content (via list):`, doc.content);
              data = doc.content;
            }
            console.log(`[BRAIN] Retrieved from Supermemory (via list) - Session: ${sessionId}, Namespace: ${namespace}`);
            // Update in-memory cache
            if (!memoryStore[sessionId]) {
              memoryStore[sessionId] = {};
            }
            memoryStore[sessionId][namespace] = data;
            return data;
          }
        } catch (listError) {
          console.error(`[BRAIN] Error listing documents:`, listError);
        }
      }
    } catch (error) {
      console.error(`[BRAIN] Error retrieving from Supermemory:`, error);
    }
  }
  
  // Fallback to in-memory storage
  const inMemoryData = memoryStore[sessionId]?.[namespace];
  if (inMemoryData) {
    console.log(`[BRAIN] Retrieved from in-memory - Session: ${sessionId}, Namespace: ${namespace}`);
    return inMemoryData;
  } else {
    console.log(`[BRAIN] No data found (neither Supermemory nor in-memory) - Session: ${sessionId}, Namespace: ${namespace}`);
    return null;
  }
}

// Root route - show server status
app.get('/', (c) => {
  return c.json({
    status: 'running',
    service: 'Shadow-DB Brain',
    endpoints: {
      'POST /v1/fork': 'Store initial database snapshot',
      'POST /v1/execute': 'Simulate SQL query',
      'GET /v1/diff?session_id=<id>': 'Get diff between original and proposed state',
    },
  });
});

// POST /v1/fork - Store initial snapshot
app.post('/v1/fork', async (c) => {
  try {
    const body = await c.req.json();
    const { snapshot, session_id } = body;
    
    if (!snapshot || !session_id) {
      return c.json({ error: 'Missing snapshot or session_id' }, 400);
    }
    
    console.log(`[BRAIN] Fork request - Session: ${session_id}`);
    
    await storeInSupermemory(session_id, 'initial_snapshot', snapshot);
    
    return c.json({
      status: 'success',
      message: 'Snapshot stored successfully',
      session_id: session_id,
    });
  } catch (error) {
    console.error('[BRAIN] Error in /v1/fork:', error);
    return c.json(
      { error: 'Failed to store snapshot', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// POST /v1/execute - Simulate SQL query using Gemini
app.post('/v1/execute', async (c) => {
  try {
    const body = await c.req.json();
    const { query, session_id } = body;
    
    if (!query || !session_id) {
      return c.json({ error: 'Missing query or session_id' }, 400);
    }
    
    console.log(`[BRAIN] Execute request - Session: ${session_id}, Query: ${query}`);
    
    // Retrieve initial snapshot
    const initialSnapshot = await retrieveFromSupermemory(session_id, 'initial_snapshot');
    
    if (!initialSnapshot) {
      return c.json({ error: 'No initial snapshot found. Please call /v1/fork first.' }, 404);
    }
    
    // Use Gemini to simulate the SQL query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a SQL simulation expert. Given the following initial database state and a SQL query, describe what the resulting state would look like after executing the query.

Initial State (JSON):
${JSON.stringify(initialSnapshot, null, 2)}

SQL Query:
${query}

Please provide a JSON object representing the resulting state after the SQL query is executed. Only return the JSON, no additional explanation.`;

    console.log('[BRAIN] Calling Gemini API to simulate SQL query...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let shadowStateText = response.text();
    
    // Clean up the response (remove markdown code blocks if present)
    shadowStateText = shadowStateText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let shadowState;
    try {
      shadowState = JSON.parse(shadowStateText);
    } catch (parseError) {
      console.error('[BRAIN] Failed to parse Gemini response:', shadowStateText);
      // Fallback: return a structured response
      shadowState = {
        error: 'Failed to parse Gemini response',
        raw_response: shadowStateText,
        query: query,
        initial_state: initialSnapshot,
      };
    }
    
    // Store the shadow update
    await storeInSupermemory(session_id, 'shadow_update', {
      query: query,
      resulting_state: shadowState,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[BRAIN] Shadow state calculated and stored');
    
    return c.json({
      status: 'success',
      message: 'Query simulated successfully',
      session_id: session_id,
      shadow_state: shadowState,
    });
  } catch (error) {
    console.error('[BRAIN] Error in /v1/execute:', error);
    return c.json(
      { error: 'Failed to execute query simulation', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /v1/diff - Compare initial snapshot with shadow update
app.get('/v1/diff', async (c) => {
  try {
    const session_id = c.req.query('session_id') || 'default-session';
    
    console.log(`[BRAIN] Diff request - Session: ${session_id}`);
    
    const initialSnapshot = await retrieveFromSupermemory(session_id, 'initial_snapshot');
    const shadowUpdate = await retrieveFromSupermemory(session_id, 'shadow_update');
    
    console.log(`[BRAIN] Diff - initialSnapshot:`, initialSnapshot ? 'found' : 'not found');
    console.log(`[BRAIN] Diff - initialSnapshot value:`, JSON.stringify(initialSnapshot).substring(0, 200));
    console.log(`[BRAIN] Diff - shadowUpdate:`, shadowUpdate ? 'found' : 'not found');
    console.log(`[BRAIN] Diff - shadowUpdate value:`, JSON.stringify(shadowUpdate).substring(0, 200));
    
    // Check if data is actually valid (not empty object)
    const hasValidSnapshot = initialSnapshot && Object.keys(initialSnapshot).length > 0;
    const hasValidUpdate = shadowUpdate && (shadowUpdate.resulting_state || Object.keys(shadowUpdate).length > 0);
    
    if (!hasValidSnapshot) {
      return c.json({ error: 'No initial snapshot found or snapshot is empty' }, 404);
    }
    
    if (!hasValidUpdate) {
      return c.json({ error: 'No shadow update found. Please execute a query first.' }, 404);
    }
    
    // Handle different possible structures
    const proposedState = shadowUpdate.resulting_state || shadowUpdate.shadow_state || shadowUpdate;
    const query = shadowUpdate.query || 'Unknown query';
    const timestamp = shadowUpdate.timestamp || new Date().toISOString();
    
    const diff = {
      original: initialSnapshot,
      proposed: proposedState,
      query: query,
      timestamp: timestamp,
    };
    
    return c.json({
      status: 'success',
      diff: diff,
    });
  } catch (error) {
    console.error('[BRAIN] Error in /v1/diff:', error);
    return c.json(
      { error: 'Failed to generate diff', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

import { serve } from '@hono/node-server';

const port = 3001;

console.log(`[BRAIN] Starting server on port ${port}`);
console.log(`[BRAIN] Supermemory API Key: ${SUPERMEMORY_API_KEY.substring(0, 10)}...`);
console.log(`[BRAIN] Gemini API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`[BRAIN] Server running on http://localhost:${info.port}`);
});
