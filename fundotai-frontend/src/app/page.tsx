'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// const API_BASE = 'http://localhost:10000';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;


export default function TerminalPage() {
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [allowedCommands, setAllowedCommands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [history]);

    useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await axios.post(`${API_BASE}/create-session`, { distro: 'linux' });
        setSessionId(res.data.session_id);
        setHistory(prev => [...prev, `🟢 New session started (id: ${res.data.session_id})`]);
      } catch {
        setHistory(prev => [...prev, '❌ Failed to create session']);
      }
    };

    const fetchAllowedCommands = async () => {
      try {
        const res = await axios.get(`${API_BASE}/allowed-commands`);
        setAllowedCommands(res.data.allowed_commands || []);
      } catch {
        console.error('❌ Failed to load allowed commands');
      }
    };

    createSession();
    fetchAllowedCommands();
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
    }catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.output || '❌ Error executing command';
        setHistory(prev => [...prev, msg]);
      } else {
        setHistory(prev => [...prev, '❌ Unknown error occurred']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommand();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col items-center p-6 transition-colors duration-300">

      <h1 className="text-2xl font-bold mb-6 drop-shadow-lg">🧪 Linux Terminal Sandbox</h1>

      <div
        ref={terminalRef}
           className="w-full max-w-3xl h-[400px] overflow-y-auto 
             bg-gray-100 dark:bg-gray-900 p-4 rounded mb-4 
             font-mono text-sm border border-gray-300 dark:border-gray-700 
             custom-scrollbar"
      >
        {history.map((line, i) => {
          let style = "text-white";
          if (line.startsWith(">")) style = "text-cyan-400";
          else if (line.includes("✅")) style = "text-green-400";
          else if (line.includes("❌")) style = "text-pink-500";
          else if (line.includes("🟢")) style = "text-blue-400";

          return (
            <div key={i} className={`whitespace-pre-wrap ${style}`}>
              {line}
            </div>
          );
        })}

      </div>

      <input
        type="text"
        className="w-full max-w-4xl px-4 py-2 mb-4 rounded-xl bg-white/10 backdrop-blur-md text-white placeholder-white/50 border border-white/20 outline-none font-mono transition-all focus:ring-2 focus:ring-cyan-400 shadow-md"
        placeholder={isLoading ? 'Running...' : 'Enter command...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={isLoading}
      />

      {allowedCommands.length > 0 && (
        <details className="w-full max-w-4xl bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
          <summary className="cursor-pointer text-sm text-cyan-300 font-semibold">
            📜 View Allowed Commands ({allowedCommands.length})
          </summary>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-white/80">
            {allowedCommands.map((cmd, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20 text-center hover:bg-white/20 transition"
              >
                {cmd}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
