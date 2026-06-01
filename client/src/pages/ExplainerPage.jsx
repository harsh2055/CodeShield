// client/src/pages/ExplainerPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import useExplain from '../hooks/useExplain';
import { executeCode } from '../utils/sandboxApi';
import logoImg from '../assets/logo.png';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import TeamModal from '../components/TeamModal';

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
  const { user, logout } = useAuth();
  const { teams, activeTeamId, switchTeam } = useTeam();
  const { explain, sendFollowUp, messages, loading, error, meta } = useExplain();
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('auto');
  const [level, setLevel] = useState('beginner');
  const [model, setModel] = useState(MODELS[0].id);
  const [chatInput, setChatInput] = useState('');
  
  // New State
  const [errorMessage, setErrorMessage] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle extension ?code= imports
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importedCode = params.get('code');
    if (importedCode) {
      setCode(importedCode);
      // We can't safely call handleExplain directly because state hasn't updated yet.
      // So we use a ref or wait for the user to click it, or we trigger it after a timeout.
      // Better yet, just pre-fill the code editor! The user can hit Explain.
      // To auto-trigger, we can do it directly:
      explain({ code: importedCode, language: 'auto', level: 'beginner', modelId: MODELS[0].id, action: 'explain', teamId: activeTeamId });
      
      // Clean up the URL so refreshing doesn't re-trigger it
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Run only once on mount

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
                setTerminalOutput((prev) => prev + '> ' + data.status + '\n');
              }
              if (data.code) {
                setCode(data.code);
              }
              if (data.output) {
                setTerminalOutput((prev) => prev + '\n[OUTPUT]\n' + data.output + '\n');
              }
              if (data.error) {
                setTerminalOutput((prev) => prev + '\n[ERROR]\n' + data.error + '\n');
              }
            } catch (e) {
              console.error('Failed to parse SSE chunk:', dataStr);
            }
          }
        }
      }
    } catch (err) {
      setTerminalOutput((prev) => prev + '\nAuto-fix failed: ' + err.message);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;
    const msg = chatInput;
    setChatInput('');
    await sendFollowUp(msg);
  };

  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsSandboxRunning(true);
    setTerminalOutput('Running code...');
    try {
      const result = await executeCode(code, language === 'auto' ? 'javascript' : language);
      const combinedOutput = result.stdout + (result.stderr ? '\n[STDERR]\n' + result.stderr : '');
      setTerminalOutput(combinedOutput || 'Code executed successfully with no output.');
    } catch (err) {
      setTerminalOutput(err.message || 'Sandbox execution failed.');
    } finally {
      setIsSandboxRunning(false);
    }
  };

  const handleGithubImport = async () => {
    if (!githubUrl.trim()) return;
    setIsImporting(true);
    try {
      let rawUrl = githubUrl.trim();
      
      // Basic validation: It must be a file, not a repo root or clone link
      if (rawUrl.endsWith('.git')) {
        throw new Error('Please provide a link to a specific file, not the .git repository clone link.');
      }

      if (rawUrl.includes('github.com')) {
        if (!rawUrl.includes('/blob/')) {
          throw new Error('Please navigate to a specific file on GitHub and paste its URL (it should contain /blob/).');
        }
        rawUrl = rawUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file. Server responded with status ${response.status}.`);
      }
      const text = await response.text();
      setCode(text);
      
      // Attempt to auto-detect language from extension
      const ext = rawUrl.split('.').pop().toLowerCase();
      const extMap = { js: 'javascript', ts: 'typescript', py: 'python', java: 'java', cpp: 'cpp', c: 'c', rs: 'rust', go: 'go', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin', sql: 'sql' };
      if (extMap[ext]) setLanguage(extMap[ext]);
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

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
      alert('Failed to export PDF. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logoImg} alt="CodeShield Logo" style={{ width: '24px', height: '24px', marginRight: '10px', verticalAlign: 'middle' }} />
          CodeShield
        </div>
        <nav className="sidebar-nav">
          <a href="/" className="nav-item active">Explain & Debug</a>
          <a href="/history" className="nav-item">History</a>
          <a href="/repo" className="nav-item">Repo Analysis</a>
        </nav>
        
        <div style={{ padding: '0 15px', marginTop: 'auto', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Workspace</label>
          <select 
            value={activeTeamId} 
            onChange={(e) => switchTeam(e.target.value)}
            style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '6px' }}
          >
            <option value="personal">Personal Account</option>
            {teams.map(t => (
              <option key={t._id} value={t._id}>Team: {t.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsTeamModalOpen(true)}
            style={{ width: '100%', marginTop: '8px', background: 'transparent', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '4px', padding: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Manage Teams
          </button>
        </div>
        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      {isTeamModalOpen && <TeamModal onClose={() => setIsTeamModalOpen(false)} />}

      {/* Main */}
      <main className="main-content">
        <div className="editor-panel">
          <div className="panel-topbar">
            <span className="panel-label">Workspace</span>
            <div className="topbar-controls" style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Paste GitHub URL..." 
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                style={{ background: '#1e1e28', border: '1px solid #334155', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
              />
              <button 
                onClick={handleGithubImport}
                disabled={isImporting || !githubUrl}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
              >
                {isImporting ? '⏳' : 'Import'}
              </button>
            </div>
          </div>
          
          <div className="panel-topbar" style={{ borderTop: '1px solid #1E293B' }}>
            <div className="topbar-controls" style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ flex: 1 }}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l === 'auto' ? 'Auto-detect Language' : l}</option>
                ))}
              </select>
              <select value={model} onChange={(e) => setModel(e.target.value)} style={{ flex: 1 }}>
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: '10px 0', overflow: 'hidden' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'auto' ? 'javascript' : language}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>

          {/* Sandbox Terminal */}
          {terminalOutput && (
            <div style={{ height: '150px', background: '#000', color: '#0f0', padding: '10px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', borderTop: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#888' }}>
                <span>Terminal Output</span>
                <button onClick={() => setTerminalOutput('')} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>✖</button>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{terminalOutput}</pre>
            </div>
          )}

          <div className="editor-footer" style={{ flexWrap: 'wrap' }}>
            <div className="level-pills">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  className={`pill ${level === l ? 'active' : ''}`}
                  onClick={() => setLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button
                className="btn-explain"
                onClick={handleRunCode}
                disabled={isSandboxRunning || !code.trim() || language === 'auto'}
                style={{ background: '#10B981' }}
              >
                {isSandboxRunning ? '⏳' : '▶️ Run'}
              </button>
              <button
                className="btn-explain"
                onClick={handleExplain}
                disabled={loading || !code.trim()}
              >
                {loading && messages.length === 0 ? '⏳' : '⚡ Explain'}
              </button>
              <button
                className="btn-explain"
                onClick={handleDebug}
                disabled={loading || !code.trim()}
                style={{ background: '#EF4444' }}
              >
                {loading && messages.length === 0 ? '⏳' : '🐞 Debug'}
              </button>
              <button
                className="btn-explain"
                onClick={handleAutoFix}
                disabled={isAgentRunning || !code.trim() || language === 'auto'}
                style={{ background: '#8B5CF6' }}
              >
                {isAgentRunning ? '⏳' : '🤖 Auto-Fix'}
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Optional: Paste error message here before debugging..."
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              style={{ width: '100%', marginTop: '10px', background: '#1e1e28', border: '1px solid #334155', color: '#fff', borderRadius: '4px', padding: '8px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="output-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-topbar">
            <span className="panel-label">AI Analysis & Chat</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {messages.length > 0 && (
                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {isExporting ? '⏳ Exporting...' : '📄 Export PDF'}
                </button>
              )}

            </div>
          </div>

          <div className="output-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {error && <div className="error-banner">⚠️ {error}</div>}

            {messages.length === 0 && !error && !loading && (
              <div className="output-placeholder">
                <div className="placeholder-icon">🔬</div>
                <p>Paste code on the left and hit Explain or Debug</p>
              </div>
            )}

            <div ref={chatContainerRef} style={{ background: '#0B0F19' /* needed for pdf */ }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#1E293B' : 'transparent',
                  border: msg.role === 'user' ? '1px solid #334155' : 'none',
                  pageBreakInside: 'avoid'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: msg.role === 'user' ? '#38BDF8' : '#A78BFA' }}>
                    {msg.role === 'user' ? 'You' : 'CodeShield AI'}
                  </div>
                  <div className="markdown-body" style={{ lineHeight: '1.6' }}>
                    {msg.role === 'user' ? (
                      <p style={{ color: '#fff' }}>{msg.content}</p>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {loading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
              <div className="loading-dots" style={{ padding: '20px' }}>
                <span /><span /><span />
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input for follow ups */}
          {messages.length > 0 && (
            <div style={{ padding: '15px', borderTop: '1px solid #1E293B', backgroundColor: '#0B0F19' }}>
              <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1E293B', color: 'white', fontSize: '14px' }}
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  disabled={loading || !chatInput.trim()}
                  style={{ padding: '0 20px', borderRadius: '6px', backgroundColor: '#3B82F6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExplainerPage;
