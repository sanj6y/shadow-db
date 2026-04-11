'use client';

import { useState } from 'react';

const BRAIN_API_URL = process.env.NEXT_PUBLIC_BRAIN_API_URL || 'http://localhost:3001';
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8787';

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('default-session');
  const [connected, setConnected] = useState(false);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const mockSnapshot = {
        users: [
          { id: 1, name: 'John', balance: 100 },
          { id: 2, name: 'Jane', balance: 200 },
        ],
      };

      const response = await fetch(`${BRAIN_API_URL}/v1/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshot: mockSnapshot,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect');
      }

      setConnected(true);
      console.log('Connected successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!command.trim()) {
      setError('Please enter a command');
      return;
    }

    setLoading(true);
    setError(null);
    setDiff(null);

    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-Shadow-Mode': 'true',
          'X-Session-ID': sessionId,
        },
        body: command,
      });

      if (!response.ok) {
        throw new Error('Failed to execute command');
      }

      const result = await response.json();
      console.log('Execution result:', result);

      // Fetch diff after execution
      await fetchDiff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiff = async () => {
    try {
      const response = await fetch(`${BRAIN_API_URL}/v1/diff?session_id=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch diff');
      }

      const data = await response.json();
      setDiff(data.diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diff');
    }
  };

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <main className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-green-800 pb-4">
          <h1 className="text-3xl font-bold mb-2">Shadow-DB</h1>
          <p className="text-green-500 text-sm">Deterministic Simulation API for AI Agents</p>
        </header>

        <div className="space-y-6">
          {/* Connection Section */}
          <section className="bg-gray-900 border border-green-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Connection</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm mb-2">Session ID</label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full bg-black border border-green-700 rounded px-3 py-2 text-green-400 font-mono text-sm"
                  placeholder="default-session"
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={loading || connected}
                className={`px-6 py-2 rounded font-mono text-sm font-bold ${
                  connected
                    ? 'bg-green-900 text-green-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-black'
                }`}
              >
                {connected ? '✓ Connected' : 'Connect'}
              </button>
            </div>
            {connected && (
              <p className="mt-4 text-green-500 text-sm">
                ✓ Initial snapshot stored (John: $100, Jane: $200)
              </p>
            )}
          </section>

          {/* Command Execution Section */}
          <section className="bg-gray-900 border border-green-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Run Agent Command</h2>
            <div className="space-y-4">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="UPDATE users SET balance = 0 WHERE name = 'John'"
                className="w-full h-32 bg-black border border-green-700 rounded px-3 py-2 text-green-400 font-mono text-sm resize-none"
                disabled={!connected || loading}
              />
              <button
                onClick={handleExecute}
                disabled={!connected || loading}
                className={`px-6 py-2 rounded font-mono text-sm font-bold ${
                  !connected || loading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </section>

          {/* Error Display */}
          {error && (
            <section className="bg-red-900 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 font-mono text-sm">Error: {error}</p>
            </section>
          )}

          {/* Diff Visualization */}
          {diff && (
            <section className="bg-gray-900 border border-green-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">View Diff</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black border border-red-700 rounded p-4">
                  <h3 className="text-red-400 font-bold mb-2 text-sm">Original State</h3>
                  <pre className="text-red-300 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                    {formatJSON(diff.original)}
                  </pre>
                </div>
                <div className="bg-black border border-green-700 rounded p-4">
                  <h3 className="text-green-400 font-bold mb-2 text-sm">Proposed State</h3>
                  <pre className="text-green-300 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                    {formatJSON(diff.proposed)}
                  </pre>
                </div>
              </div>
              {diff.query && (
                <div className="mt-4 pt-4 border-t border-green-800">
                  <p className="text-green-500 text-sm font-mono">
                    <span className="font-bold">Query:</span> {diff.query}
                  </p>
                  {diff.timestamp && (
                    <p className="text-green-600 text-xs font-mono mt-1">
                      <span className="font-bold">Timestamp:</span> {diff.timestamp}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
