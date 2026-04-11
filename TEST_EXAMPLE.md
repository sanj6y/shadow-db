# Shadow-DB Test Example

## Prerequisites
Make sure all three services are running:
- Brain: `cd brain && npm run dev` (port 3001)
- Proxy: `cd proxy && npm run dev` (port 8787)
- UI: `cd ui && npm run dev` (port 3000)

## Test via UI (Easiest)

1. **Open the UI**: http://localhost:3000

2. **Connect (Fork)**:
   - Click the "Connect" button
   - This creates an initial snapshot with:
     - John: $100
     - Jane: $200

3. **Execute a Command**:
   - In the "Run Agent Command" text area, enter:
     ```
     UPDATE users SET balance = 0 WHERE name = 'John'
     ```
   - Click "Execute"
   - The system will simulate this query using Gemini

4. **View the Diff**:
   - The diff section will automatically appear showing:
     - **Original State** (Red): John has $100
     - **Proposed State** (Green): John has $0

## Test via cURL (API Testing)

### Step 1: Fork (Create Initial Snapshot)

```bash
curl -X POST http://localhost:3001/v1/fork \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-1",
    "snapshot": {
      "users": [
        {"id": 1, "name": "John", "balance": 100},
        {"id": 2, "name": "Jane", "balance": 200},
        {"id": 3, "name": "Bob", "balance": 150}
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Snapshot stored successfully",
  "session_id": "test-session-1"
}
```

### Step 2: Execute a SQL Command (via Proxy)

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: text/plain" \
  -H "X-Shadow-Mode: true" \
  -H "X-Session-ID: test-session-1" \
  -d "UPDATE users SET balance = 0 WHERE name = 'John'"
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Query simulated successfully",
  "session_id": "test-session-1",
  "shadow_state": {
    "users": [
      {"id": 1, "name": "John", "balance": 0},
      {"id": 2, "name": "Jane", "balance": 200},
      {"id": 3, "name": "Bob", "balance": 150}
    ]
  }
}
```

### Step 3: View the Diff

```bash
curl http://localhost:3001/v1/diff?session_id=test-session-1
```

**Expected Response:**
```json
{
  "status": "success",
  "diff": {
    "original": {
      "users": [
        {"id": 1, "name": "John", "balance": 100},
        {"id": 2, "name": "Jane", "balance": 200},
        {"id": 3, "name": "Bob", "balance": 150}
      ]
    },
    "proposed": {
      "users": [
        {"id": 1, "name": "John", "balance": 0},
        {"id": 2, "name": "Jane", "balance": 200},
        {"id": 3, "name": "Bob", "balance": 150}
      ]
    },
    "query": "UPDATE users SET balance = 0 WHERE name = 'John'",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## More Test Examples

### Example 2: DELETE Operation

```bash
# Fork
curl -X POST http://localhost:3001/v1/fork \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-2",
    "snapshot": {
      "users": [
        {"id": 1, "name": "John", "balance": 100},
        {"id": 2, "name": "Jane", "balance": 50}
      ]
    }
  }'

# Execute DELETE
curl -X POST http://localhost:8787 \
  -H "Content-Type: text/plain" \
  -H "X-Shadow-Mode: true" \
  -H "X-Session-ID: test-session-2" \
  -d "DELETE FROM users WHERE balance < 75"

# View Diff
curl http://localhost:3001/v1/diff?session_id=test-session-2
```

### Example 3: INSERT Operation

```bash
# Fork
curl -X POST http://localhost:3001/v1/fork \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-3",
    "snapshot": {
      "users": [
        {"id": 1, "name": "John", "balance": 100}
      ]
    }
  }'

# Execute INSERT
curl -X POST http://localhost:8787 \
  -H "Content-Type: text/plain" \
  -H "X-Shadow-Mode: true" \
  -H "X-Session-ID: test-session-3" \
  -d "INSERT INTO users (id, name, balance) VALUES (2, 'Alice', 300)"

# View Diff
curl http://localhost:3001/v1/diff?session_id=test-session-3
```

## Testing Without Shadow Mode

To test that the proxy returns the mock production response:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: text/plain" \
  -d "UPDATE users SET balance = 0"
```

**Expected Response:**
```json
{
  "status": "success",
  "mode": "production",
  "data": "Real DB updated"
}
```

## Notes

- The Gemini API will parse the SQL and generate the resulting state
- Each session_id maintains its own isolated state
- The diff shows exactly what would change before committing to the real database
- All operations are simulated - no real data is modified
