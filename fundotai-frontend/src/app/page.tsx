'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

type CommandInfo = {
  command: string;
  description: string;
};

type GroupedCommands = Record<string, CommandInfo[]>;

type HistoryLine = {
  type: 'user' | 'system';
  content: string;
};


export default function TerminalPage() {
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [groupedCommands, setGroupedCommands] = useState<GroupedCommands>({});
  const [isLoading, setIsLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);


  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [history]);

  // useEffect(() => {
  //   const handleContextMenu = (e: MouseEvent) => e.preventDefault();
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (
  //       e.key === 'F12' ||
  //       (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
  //       (e.ctrlKey && e.key === 'U')
  //     ) {
  //       e.preventDefault();
  //     }
  //   };

  //   document.addEventListener('contextmenu', handleContextMenu);
  //   document.addEventListener('keydown', handleKeyDown);

  //   return () => {
  //     document.removeEventListener('contextmenu', handleContextMenu);
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [sessionRes, commandsRes] = await Promise.all([
          axios.post(`${API_BASE}/create-session`, { distro: 'linux' }),
          axios.get(`${API_BASE}/allowed-commands`)
        ]);

        console.log('Session ID:', sessionRes.data.data.session_id);
        setSessionId(sessionRes.data.data.session_id);
        setHistory(prev => [
          ...prev,
          { type: 'system', content: `🟢 New session started (id: ${sessionRes.data.data.session_id})` }
        ]);


        setGroupedCommands(commandsRes.data.grouped_commands || {});
      } catch (err) {
        setErrorMessage('❌ Failed to initialize terminal. Please try again later.');
        console.error(err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    setIsMounted(true);
  }, []);


 const animateOutput = (text: string) => {
  let index = 0;
  const delay = 1; // Adjust typing speed here (ms per character)

  const typeChar = () => {
    setHistory(prev => {
      const updated = [...prev];
      const lastEntry = updated[updated.length - 1];

      // Only update the last system message
      if (lastEntry && lastEntry.type === 'system') {
        updated[updated.length - 1] = {
          ...lastEntry,
          content: lastEntry.content + text.charAt(index)
        };
      }

      return updated;
    });

    index++;
    if (index < text.length) {
      setTimeout(typeChar, delay);
    }
  };

  // Start by adding an empty system message
  setHistory(prev => [...prev, { type: 'system', content: '' }]);
  typeChar();
};



  const handleCommand = async (cmd?: string) => {
  let command = cmd ?? input.trim();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!command || !sessionId) return;

  const baseCmd = command.split(' ')[0].toLowerCase();
  const allCommands = Object.values(groupedCommands).flat();
  const matched = allCommands.find(c => c.command.toLowerCase() === baseCmd);

  if (!matched) {
  setHistory(prev => [
    ...prev,
    { type: 'user', content: command },
    { type: 'system', content: '❌ Command not allowed or recognized' }
  ]);
  return;
}

if (cmd === undefined && baseCmd !== matched.command) {
  setHistory(prev => [
    ...prev,
    { type: 'user', content: command },
    {
      type: 'system',
      content: `⚠️ Commands are case-sensitive. Interpreted as "${matched.command}"`
    }
  ]);
  command = command.replace(baseCmd, matched.command);
} else {
  setHistory(prev => [...prev, { type: 'user', content: command }]);
}

  setInput('');
  setIsLoading(true);

  try {
    // Delay execution slightly for command click
    await new Promise(res => setTimeout(res, 500));

    const res = await axios.post(`${API_BASE}/exec`, { session_id: sessionId, command });
    const output = res.data.data?.output || '✅ No output';

    // Simulate typing animation
    animateOutput(output);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.output || '❌ Error executing command';
      animateOutput(msg);
    } else {
      animateOutput('❌ Unknown error occurred');
    }
  } finally {
    setIsLoading(false);
  }
};

  if (!isMounted || isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
        <p className="text-sm text-white/80">Initializing terminal session...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-400 p-4">
        <p className="text-lg font-semibold mb-2">🚫 Error</p>
        <p className="text-sm">{errorMessage}</p>
        <button
          onClick={() => location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col items-center p-6 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-4 drop-shadow-lg">🧪 Linux Terminal Sandbox</h1>
      <div className="w-full max-w-4xl mb-6 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-md transition hover:shadow-lg">
        <p className="text-sm text-white/80 leading-relaxed text-center">
        ⚙️ <span className="font-semibold text-white">Welcome to The Linux Terminal Sandbox!</span> <br />
        You&apos;re in a secure, browser-based environment built on a <span className="text-cyan-300 font-semibold">Debian-like distro</span>.
        <br className="my-2" />
        💡 <span className="text-cyan-300 font-semibold">Tip:</span> Tap any command in the list below to instantly run it in the terminal.
      </p>

      </div>

      <div
        ref={terminalRef}
        className="w-full max-w-4xl h-[300px] overflow-y-auto bg-gray-900 p-4 rounded mb-4 font-mono text-sm border border-gray-700 custom-scrollbar"
      >
        {history.map((entry, i) => {
            let style = 'text-white';

            if (entry.type === 'user') style = 'text-cyan-400';
            else if (entry.content.includes('✅')) style = 'text-green-400';
            else if (entry.content.includes('❌')) style = 'text-pink-500';
            else if (entry.content.includes('🟢')) style = 'text-blue-400';

            return (
              <div key={i} className={`whitespace-pre-wrap ${style}`}>
                {entry.content}
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
        onKeyDown={(e) => {
          console.log("Key pressed:", e.key); // 🔍 Debug line
          if (e.key === 'Enter') handleCommand();
        }}
        disabled={isLoading}
      />

      {Object.keys(groupedCommands).length > 0 && (
        <div className="w-full max-w-4xl space-y-4 mt-4">
          {Object.entries(groupedCommands).map(([groupName, commands]) => (
            <details
              key={groupName}
              className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg"
              open={groupName === 'filesystem'} // open default group
            >
              <summary className="cursor-pointer text-sm text-cyan-300 font-semibold capitalize">
                📂 {groupName} ({commands.length})
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-white/90 text-sm">
                {commands.map(({ command, description }) => (
                  <div
                    key={command}
                    onClick={() => handleCommand(`${command} --help`)}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:cursor-pointer hover:bg-white/10 transition"
                  >
                    <span className="block text-cyan-300 font-mono">{command}</span>
                    <p className="text-white/70 text-xs mt-1">{description}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
      <footer className="text-xs text-white/50 mt-6">
        © {new Date().getFullYear()} Abhishek Dvs • All rights reserved
      </footer>

    </div>
    
  );
}
