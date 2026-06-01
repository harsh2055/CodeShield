// client/src/pages/RefactoringPage.jsx
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import Sidebar from '../components/Sidebar';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin', 'sql'
];

const REFACTOR_MODES = [
  { id: 'clean', label: 'Clean Code', icon: '✨' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'readability', label: 'Readability', icon: '📝' },
  { id: 'modern', label: 'Modern Syntax', icon: '🚀' }
];

const RefactoringPage = () => {
  const [code, setCode] = useState('// Paste code here to optimize and refactor\nfunction findDuplicates(arr) {\n  let duplicates = [];\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {\n        duplicates.push(arr[i]);\n      }\n    }\n  }\n  return duplicates;\n}');
  const [language, setLanguage] = useState('javascript');
  const [mode, setMode] = useState('clean');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const handleRefactor = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const token = localStorage.getItem('cl_token');
      const response = await fetch('/api/refactor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, language, mode })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Refactoring failed');
      }

      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!report || !report.refactoredCode) return;
    navigator.clipboard.writeText(report.refactoredCode);
    alert('Refactored code copied to clipboard!');
  };

  const handleApplyToSource = () => {
    if (!report || !report.refactoredCode) return;
    setCode(report.refactoredCode);
    setReport(null);
    alert('Refactored code applied to source editor!');
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content" style={{ gridTemplateColumns: '1fr', display: 'flex', flexDirection: 'column' }}>
        {/* Top Control Bar */}
        <div className="panel-topbar" style={{ padding: '16px 24px', borderBottom: '1px solid #1E293B', background: '#0F172A', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>⚡ AI Code Refactoring Engine</h1>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Improve code modularity, speed, readability, or syntax powered by DeepSeek Coder.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: '#1E293B', color: '#fff', border: '1px solid #334155', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <button 
              className="btn-explain" 
              onClick={handleRefactor}
              disabled={loading || !code.trim()}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {loading ? '⚙️ Refactoring...' : '⚡ Refactor Code'}
            </button>
          </div>
        </div>

        {/* Refactor Mode Selector Pills */}
        <div style={{ background: '#0B0F19', padding: '12px 24px', borderBottom: '1px solid #1E293B', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
          {REFACTOR_MODES.map((rm) => (
            <button
              key={rm.id}
              onClick={() => setMode(rm.id)}
              disabled={loading}
              style={{
                background: mode === rm.id ? 'rgba(124, 106, 247, 0.15)' : '#16161D',
                border: `1px solid ${mode === rm.id ? 'var(--accent)' : 'var(--border)'}`,
                color: mode === rm.id ? 'var(--accent2)' : 'var(--muted)',
                borderRadius: '20px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <span>{rm.icon}</span>
              <span>{rm.label}</span>
            </button>
          ))}
        </div>

        {/* Workspace Split View */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Code Editors Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            
            {/* Side-by-side or Single workspace */}
            <div style={{ flex: 1, display: 'flex', height: '100%' }}>
              
              {/* Original Code */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <div style={{ background: '#16161D', padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 'bold', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                  ORIGINAL CODE
                </div>
                <div style={{ flex: 1 }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
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
              </div>

              {/* Refactored Code */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#16161D', padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 'bold', color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>REFACTORED CODE</span>
                  {report && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-copy" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={handleCopyCode}>Copy</button>
                      <button className="btn-copy" style={{ padding: '2px 8px', fontSize: '10px', borderColor: 'var(--green)', color: 'var(--green)' }} onClick={handleApplyToSource}>Apply as Source</button>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, background: '#0B0F19' }}>
                  {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '12px' }}>
                      <div className="loading-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <p style={{ fontSize: '13px' }}>DeepSeek-Coder is rewriting your logic...</p>
                    </div>
                  )}

                  {!report && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', padding: '2rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
                      <p style={{ fontSize: '13px' }}>Optimized code output will appear here side-by-side.</p>
                    </div>
                  )}

                  {report && !loading && (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={language}
                      value={report.refactoredCode}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: 'JetBrains Mono, monospace',
                        lineHeight: 20,
                        readOnly: true
                      }}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Analysis Summary Panel (Right Drawer) */}
          <div style={{ width: '320px', background: '#0B0F19', padding: '24px', overflowY: 'auto', flexShrink: 0 }}>
            {error && <div className="error-banner">⚠️ {error}</div>}

            {report && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Analytics</h3>

                {/* Score Guard comparison */}
                <div style={{ background: '#16161D', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>COMPLEXITY BEFORE</span>
                    <strong style={{ fontSize: '16px', color: '#F87171', display: 'block', marginTop: '4px' }}>{report.complexityBefore || 'N/A'}</strong>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>COMPLEXITY AFTER</span>
                    <strong style={{ fontSize: '16px', color: 'var(--green)', display: 'block', marginTop: '4px' }}>{report.complexityAfter || 'N/A'}</strong>
                  </div>
                </div>

                {report.performanceGain && (
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--accent2)', fontWeight: 'bold', textTransform: 'uppercase' }}>Performance Delta</span>
                    <div style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--green)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginTop: '6px' }}>
                      {report.performanceGain}
                    </div>
                  </div>
                )}

                {report.improvements && report.improvements.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' }}>Key Improvements</span>
                    <ul style={{ paddingLeft: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#CBD5E1' }}>
                      {report.improvements.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!report && (
              <div style={{ textAlign: 'center', color: '#64748B', marginTop: '100px' }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
                <p style={{ fontSize: '12px' }}>Audited complexity scales and performance changes will render here.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default RefactoringPage;
