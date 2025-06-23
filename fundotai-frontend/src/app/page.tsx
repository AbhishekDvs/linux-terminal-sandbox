'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

type CommandInfo = {
  command: string;
  description: string;
};

type GroupedCommands = Record<string, CommandInfo[]>;

export default function TerminalPage() {
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [groupedCommands, setGroupedCommands] = useState<GroupedCommands>({});
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
        setGroupedCommands(res.data.grouped_commands || {});
      } catch {
        console.error('❌ Failed to load allowed commands');
      }
    };

    createSession();
    fetchAllowedCommands();
  }, []);

  const animateOutput = (text: string) => {
  let index = 0;
  const delay = 10; // typing speed (ms per character)

  const typeChar = () => {
    setHistory(prev => {
      const lastLine = prev[prev.length - 1] || '';
      const updated = [...prev];
      updated[updated.length - 1] = lastLine + text.charAt(index);
      return updated;
    });

    index++;
    if (index < text.length) {
      setTimeout(typeChar, delay);
    }
  };

  // Start with an empty line
  setHistory(prev => [...prev, '']);
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
    setHistory(prev => [...prev, `> ${command}`, '❌ Command not allowed or recognized']);
    return;
  }

  if (cmd === undefined && baseCmd !== matched.command) {
    setHistory(prev => [
      ...prev,
      `> ${command}`,
      `⚠️ Commands are case-sensitive. Interpreted as "${matched.command}"`
    ]);
    command = command.replace(baseCmd, matched.command);
  } else {
    setHistory(prev => [...prev, `> ${command}`]);
  }

  setInput('');
  setIsLoading(true);

  try {
    // Delay execution slightly for command click
    await new Promise(res => setTimeout(res, 500));

    const res = await axios.post(`${API_BASE}/exec`, { session_id: sessionId, command });
    const output = res.data.output || '✅ No output';

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


  // const handleCommand = async (cmd?: string) => {
  //   let command = cmd ?? input.trim();

  //   window.scrollTo({ top: 0, behavior: 'smooth' });

  //   if (!command || !sessionId) return;

  //   const baseCmd = command.split(' ')[0].toLowerCase();
  //   const allCommands = Object.values(groupedCommands).flat();
  //   const matched = allCommands.find(c => c.command.toLowerCase() === baseCmd);

  //   if (!matched) {
  //     setHistory(prev => [...prev, `> ${command}`, '❌ Command not allowed or recognized']);
  //     return;
  //   }

  //   if (cmd === undefined && baseCmd !== matched.command) {
  //     setHistory(prev => [
  //       ...prev,
  //       `> ${command}`,
  //       `⚠️ Commands are case-sensitive. Interpreted as "${matched.command}"`
  //     ]);
  //     command = command.replace(baseCmd, matched.command);
  //   } else {
  //     setHistory(prev => [...prev, `> ${command}`]);
  //   }

  //   setInput('');
  //   setIsLoading(true);

  //   try {
  //     const res = await axios.post(`${API_BASE}/exec`, { session_id: sessionId, command });
  //     setHistory(prev => [...prev, res.data.output || '✅ No output']);
  //   } catch (err: unknown) {
  //     if (axios.isAxiosError(err)) {
  //       const msg = err.response?.data?.output || '❌ Error executing command';
  //       setHistory(prev => [...prev, msg]);
  //     } else {
  //       setHistory(prev => [...prev, '❌ Unknown error occurred']);
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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
        {history.map((line, i) => {
          let style = 'text-white';
          if (line.startsWith('>')) style = 'text-cyan-400';
          else if (line.includes('✅')) style = 'text-green-400';
          else if (line.includes('❌')) style = 'text-pink-500';
          else if (line.includes('🟢')) style = 'text-blue-400';

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
        onKeyDown={(e) => {
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
    </div>
  );
}
