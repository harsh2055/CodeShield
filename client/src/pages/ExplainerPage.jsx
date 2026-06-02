// client/src/pages/ExplainerPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import useExplain from '../hooks/useExplain';
import { executeCode } from '../utils/sandboxApi';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import Sidebar from '../components/Sidebar';

const LANGUAGES = [
  'auto', 'javascript', 'typescript', 'python', 'java',
  'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin', 'sql',
];
const LEVELS = ['beginner', 'intermediate', 'expert'];
const MODELS = [
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Fast)' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen Coder (Smart)' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Expert)' }
];

const ExplainerPage = () => {
  const { user } = useAuth();
  const { activeTeamId } = useTeam();
  const { explain, sendFollowUp, messages, loading, error } = useExplain();
  
  const [code, setCode] = useState('// Paste your code here to analyze, explain or debug\nfunction calculateFactorial(n) {\n  if (n < 0) return null;\n  if (n === 0) return 1;\n  return n * calculateFactorial(n - 1);\n}');
  const [language, setLanguage] = useState('auto');
  const [level, setLevel] = useState('beginner');
  const [model, setModel] = useState(MODELS[0].id);
  const [chatInput, setChatInput] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('workspace');
  
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
      const importedCode = decodeURIComponent(hash.slice(6));
      if (importedCode) {
        setCode(importedCode);
        explain({ code: importedCode, language: 'auto', level: 'beginner', modelId: MODELS[0].id, action: 'explain', teamId: activeTeamId });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleExplain = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    await explain({ code, language, level, modelId: model, action: 'explain', teamId: activeTeamId });
  };

  const handleDebug = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    await explain({ code, language, level, modelId: model, action: 'debug', errorMessage, teamId: activeTeamId });
  };

  const handleAutoFix = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsAgentRunning(true);
    setTerminalOutput('> Agent initialized. Passing control to AI...\n');
    
    try {
      const token = localStorage.getItem('cl_token');
      const response = await fetch('/api/explain/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, language, errorMessage, modelId: model })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.status) {
                setTerminalOutput((prev) => prev + `[AGENT] ${data.status}\n`);
              }
              if (data.code) {
                setCode(data.code);
              }
              if (data.output) {
                setTerminalOutput((prev) => prev + `[OUTPUT] ${data.output}\n`);
              }
              if (data.error) {
                setTerminalOutput((prev) => prev + `[ERROR] ${data.error}\n`);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    } catch (err) {
      setTerminalOutput((prev) => prev + `[FATAL] Autonomous agent failed: ${err.message}\n`);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleGithubImport = async () => {
    if (!githubUrl.trim()) return;
    setIsImporting(true);
    try {
      const token = localStorage.getItem('cl_token');
      const response = await fetch('/api/repo/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: githubUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode(data.content);
      if (data.language) setLanguage(data.language);
      alert('GitHub file imported successfully!');
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSandboxRun = async () => {
    setIsSandboxRunning(true);
    setTerminalOutput('> Compiling and launching secure environment...\n');
    try {
      const res = await executeCode(language, code);
      if (res.program_error || res.compiler_error) {
        setTerminalOutput((prev) => prev + `[ERR] ${res.program_error || res.compiler_error}\n`);
      } else {
        setTerminalOutput((prev) => prev + `[RUN] ${res.program_message || res.compiler_message || 'Successfully executed.'}\n`);
      }
    } catch (err) {
      setTerminalOutput((prev) => prev + `[FATAL] Sandbox crash: ${err.message}\n`);
    } finally {
      setIsSandboxRunning(false);
    }
  };

  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;
    const text = chatInput;
    setChatInput('');
    await sendFollowUp({ message: text, modelId: model });
  };

  const handleExportPDF = async () => {
    if (!chatContainerRef.current) return;
    setIsExporting(true);
    try {
      const opt = {
        margin: 10,
        filename: 'CodeShield-Analysis.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0B0F19' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(chatContainerRef.current).save();
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-[#0A0A0C] font-body-md">
      <Sidebar />

      {/* Mobile view Tab switcher */}
      <div className="lg:hidden flex bg-[#16161d] border-b border-[#1E1E22] p-1.5 shrink-0 w-full">
        <button 
          onClick={() => setActiveMobileTab('workspace')}
          className={`flex-1 py-2 text-center text-xs font-bold font-label-caps rounded-lg transition-all ${activeMobileTab === 'workspace' ? 'bg-[#c0c1ff]/15 text-[#c0c1ff]' : 'text-[#908fa0]'}`}
        >
          Code Workspace
        </button>
        <button 
          onClick={() => setActiveMobileTab('analysis')}
          className={`flex-1 py-2 text-center text-xs font-bold font-label-caps rounded-lg transition-all ${activeMobileTab === 'analysis' ? 'bg-[#c0c1ff]/15 text-[#c0c1ff]' : 'text-[#908fa0]'}`}
        >
          AI Analysis
        </button>
      </div>

      {/* Main Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        
        {/* Left Side: Monaco & Sandbox */}
        <div className={`flex flex-col border-r border-[#1E1E22] overflow-hidden bg-[#0e0e12] ${activeMobileTab === 'workspace' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Header Controls */}
          <div className="flex justify-between items-center px-6 h-14 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
            <span className="font-label-caps text-label-caps text-[#908fa0] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">terminal</span> Code Workspace
            </span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste GitHub URL..." 
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="bg-[#1c1b1d] border border-[#1E1E22] text-white rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-[#c0c1ff] w-48"
              />
              <button 
                onClick={handleGithubImport}
                disabled={isImporting || !githubUrl}
                className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-40 transition-all active:scale-95"
              >
                {isImporting ? '⏳' : 'Import'}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-6 h-10 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
            <div className="flex gap-4">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#1c1b1d] border border-[#1E1E22] text-[#e5e1e4] rounded px-2 py-0.5 text-xs focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="bg-[#1c1b1d] border border-[#1E1E22] text-[#e5e1e4] rounded px-2 py-0.5 text-xs focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden bg-[#0A0A0C]">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'auto' ? 'javascript' : language}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 20,
              }}
            />
          </div>

          {/* Sandbox Terminal Output */}
          {terminalOutput && (
            <div className="h-40 bg-[#0e0e10] border-t border-[#1E1E22] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center px-4 py-1.5 bg-[#16161d] border-b border-[#1E1E22] shrink-0 text-[10px] font-label-caps text-[#908fa0]">
                <span>🖥️ Secure Execution Terminal</span>
                <button className="hover:text-white" onClick={() => setTerminalOutput('')}>Clear</button>
              </div>
              <pre className="flex-1 p-3 overflow-y-auto font-code-md text-[11px] text-[#4edea3] leading-relaxed select-text">
                {terminalOutput}
              </pre>
            </div>
          )}

          {/* Workspace Footer Actions */}
          <div className="px-6 py-3 border-t border-[#1E1E22] bg-[#16161d] shrink-0 flex flex-col gap-3">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
              {/* Level Pills */}
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider font-label-caps transition-all cursor-pointer ${
                      level === lvl 
                        ? 'bg-[#c0c1ff]/15 border border-[#c0c1ff] text-[#c0c1ff]' 
                        : 'bg-transparent border border-[#1E1E22] text-[#908fa0] hover:text-white'
                    }`}
                  >
                    {lvl.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Explain & Debug Buttons */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleSandboxRun} 
                  disabled={isSandboxRunning}
                  className="bg-[#353437] text-white border border-[#1E1E22] hover:bg-[#39393b] rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span> Run
                </button>
                <button 
                  onClick={handleDebug} 
                  disabled={loading}
                  className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/15 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">bug_report</span> Debug
                </button>
                <button 
                  onClick={handleAutoFix} 
                  disabled={isAgentRunning}
                  className="bg-[#ca8100]/20 border border-[#ffb95f]/30 text-[#ffb95f] hover:bg-[#ca8100]/35 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95 animate-pulse"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_fix_high</span> Auto-Fix
                </button>
                <button 
                  onClick={handleExplain} 
                  disabled={loading}
                  className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95 shadow-[0_0_20px_rgba(128,131,255,0.2)]"
                >
                  <span className="material-symbols-outlined text-[16px]">neurology</span> Explain
                </button>
              </div>
            </div>

            {/* Error Message Input for Debugging */}
            <input 
              type="text" 
              placeholder="Optional: Paste compiler/runtime error message here before clicking Debug..."
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              className="w-full bg-[#1c1b1d] border border-[#1E1E22] text-[#ffb4ab] placeholder-[#ffb4ab]/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ffb4ab]/50"
            />
          </div>

        </div>

        {/* Right Side: AI Explanations & Follow-up */}
        <div className={`flex flex-col bg-[#0B0F19] overflow-hidden ${activeMobileTab === 'analysis' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Top Header */}
          <div className="flex justify-between items-center px-6 h-14 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
            <span className="font-label-caps text-label-caps text-[#908fa0] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">psychology</span> Analysis & Explanations
            </span>
            {messages.length > 0 && (
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className="bg-transparent border border-[#1E1E22] hover:border-[#c0c1ff] text-[#908fa0] hover:text-white rounded-lg px-3 py-1 text-[11px] font-label-caps cursor-pointer disabled:opacity-40 transition-all"
              >
                {isExporting ? '⏳ Exporting...' : '📄 PDF Report'}
              </button>
            )}
          </div>

          {/* Explanation Chat Thread */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" ref={chatContainerRef}>
            {error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-4 text-xs">
                ⚠️ {error}
              </div>
            )}

            {messages.length === 0 && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#64748B] p-8 gap-4">
                <span className="material-symbols-outlined text-4xl text-[#908fa0] opacity-30">terminal</span>
                <p className="text-[13px] leading-relaxed max-w-sm">
                  Your secure environment is active. Write or import some code in the workspace and click **Explain** or **Debug** to trigger static audits.
                </p>
              </div>
            )}

            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col gap-2 p-5 rounded-xl border relative overflow-hidden transition-all duration-150 ${
                    isAssistant 
                      ? 'bg-[#16161D] border-[#1E1E22] text-[#CBD5E1] shadow-md' 
                      : 'bg-[#1e1e28]/50 border-[#8083ff]/20 text-[#c0c1ff]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22] mb-3">
                    <span className="text-[10px] font-label-caps uppercase tracking-wider text-[#908fa0] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">
                        {isAssistant ? 'neurology' : 'person'}
                      </span>
                      {isAssistant ? 'CodeShield Intelligence' : 'Code Developer'}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-code-md">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="markdown-body text-[13.5px] leading-relaxed select-text">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex flex-col gap-2 p-5 rounded-xl border bg-[#16161D] border-[#1E1E22] text-[#CBD5E1]">
                <div className="loading-dots mb-2">
                  <span></span><span></span><span></span>
                </div>
                <p className="text-[12px] text-[#908fa0]">AI is analyzing algorithms and processing structural logic...</p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Follow-up Interactive Input */}
          {messages.length > 0 && (
            <form onSubmit={handleSendFollowUp} className="p-4 bg-[#16161d] border-t border-[#1E1E22] shrink-0 flex gap-2">
              <input 
                type="text" 
                placeholder="Ask follow-up questions on this analysis..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={loading}
                className="flex-1 bg-[#1c1b1d] border border-[#1E1E22] text-white placeholder-[#64748B] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#c0c1ff] disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-5 py-2.5 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-all active:scale-95"
              >
                Send <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default ExplainerPage;
