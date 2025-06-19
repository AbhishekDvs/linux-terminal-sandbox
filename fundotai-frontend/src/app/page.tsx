'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:10000'; // Update this to your actual API base URL

export default function TerminalPage() {
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new output is added
  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [history]);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await axios.post(`${API_BASE}/create-session`, { distro: 'linux' });
        setSessionId(res.data.session_id);
        setHistory(prev => [...prev, `🟢 New session started (id: ${res.data.session_id})`]);
      } catch (err) {
        setHistory(prev => [...prev, '❌ Failed to create session']);
      }
    };
    createSession();
  }, []);

  const handleCommand = async () => {
    if (!input.trim() || !sessionId) return;
    const command = input.trim();
    setHistory(prev => [...prev, `> ${command}`]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/exec`, { session_id: sessionId, command });
      setHistory(prev => [...prev, res.data.output || '✅ No output']);
    } catch (err: any) {
      const msg = err.response?.data?.output || '❌ Error executing command';
      setHistory(prev => [...prev, msg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommand();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4">🧪 Sandboxed Terminal</h1>
      <div
        ref={terminalRef}
        className="w-full max-w-3xl h-[400px] overflow-y-auto bg-gray-900 p-4 rounded mb-4 font-mono text-sm border border-gray-700"
      >
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>
      <input
        type="text"
        className="w-full max-w-3xl px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 outline-none font-mono"
        placeholder={isLoading ? 'Running...' : 'Enter command...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={isLoading}
      />
    </div>
  );
}
