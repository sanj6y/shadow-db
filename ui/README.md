# Shadow-DB UI

Next.js dashboard for visualizing Shadow-DB diffs and managing agent commands.

## Features

- Connect to Brain API and create initial snapshots
- Execute agent commands with Shadow Mode enabled
- Visualize diffs with side-by-side comparison (Red for original, Green for proposed)
- Dark mode, monospaced font design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```
NEXT_PUBLIC_BRAIN_API_URL=http://localhost:3001
NEXT_PUBLIC_PROXY_URL=http://localhost:8787
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect**: Click the "Connect" button to create an initial snapshot (default: John with $100, Jane with $200)
2. **Execute Command**: Enter a SQL command in the text area and click "Execute"
3. **View Diff**: The diff section will automatically display after execution, showing Original State (red) vs Proposed State (green)

## Example Commands

- `UPDATE users SET balance = 0 WHERE name = 'John'`
- `DELETE FROM users WHERE balance < 50`
- `INSERT INTO users (id, name, balance) VALUES (3, 'Bob', 300)`
