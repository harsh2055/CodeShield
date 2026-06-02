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
    <div className="h-screen flex overflow-hidden bg-[#0A0A0C] font-body-md">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex justify-between items-center px-6 h-16 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
          <div>
            <h1 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#c0c1ff]">auto_fix_high</span> AI Code Refactoring Engine
            </h1>
            <p className="text-[11px] text-[#908fa0]">Optimize, convert, or clean legacy systems side-by-side powered by Qwen-Coder.</p>
          </div>

          <div className="flex gap-3 items-center">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#1c1b1d] border border-[#1E1E22] text-[#e5e1e4] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#c0c1ff]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <button 
              onClick={handleRefactor}
              disabled={loading || !code.trim()}
              className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-5 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-[0_0_20px_rgba(128,131,255,0.2)]"
            >
              {loading ? '⚙️ Optimizing...' : '⚡ Refactor Code'}
            </button>
          </div>
        </div>

        {/* Refactor Mode Selector Pills */}
        <div className="bg-[#0B0F19] px-6 py-3 border-b border-[#1E1E22] flex gap-2 overflow-x-auto shrink-0">
          {REFACTOR_MODES.map((rm) => (
            <button
              key={rm.id}
              onClick={() => setMode(rm.id)}
              disabled={loading}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider font-label-caps transition-all duration-150 cursor-pointer flex items-center gap-1.5 border ${
                mode === rm.id 
                  ? 'bg-[#c0c1ff]/15 border-[#c0c1ff] text-[#c0c1ff]' 
                  : 'bg-[#16161D] border-[#1E1E22] text-[#908fa0] hover:text-white'
              }`}
            >
              <span>{rm.icon}</span>
              <span>{rm.label}</span>
            </button>
          ))}
        </div>

        {/* Main Double Workspace Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Dual Monaco Panels */}
          <div className="flex-1 flex overflow-hidden border-r border-[#1E1E22]">
            
            {/* Original Source */}
            <div className="flex-1 flex flex-col border-r border-[#1E1E22]">
              <div className="bg-[#16161D] px-4 py-2 border-b border-[#1E1E22] text-[10px] font-bold text-[#94A3B8] font-label-caps uppercase tracking-wider">
                Original Workspace Source
              </div>
              <div className="flex-1 relative overflow-hidden bg-[#0A0A0C]">
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

            {/* Refactored Output */}
            <div className="flex-1 flex flex-col">
              <div className="bg-[#16161D] px-4 py-2 border-b border-[#1E1E22] text-[10px] font-bold text-[#4edea3] font-label-caps uppercase tracking-wider flex justify-between items-center h-9">
                <span>Refactored Output Optimized</span>
                {report && (
                  <div className="flex gap-2">
                    <button className="btn-copy py-0.5 px-2.5 text-[10px]" onClick={handleCopyCode}>Copy</button>
                    <button className="btn-copy py-0.5 px-2.5 text-[10px] border-[#4edea3] text-[#4edea3]" onClick={handleApplyToSource}>Apply Source</button>
                  </div>
                )}
              </div>
              <div className="flex-1 bg-[#0B0F19] relative">
                {loading && (
                  <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-3">
                    <div className="loading-dots mb-2">
                      <span></span><span></span><span></span>
                    </div>
                    <p className="text-[13px]">Qwen Coder 480B is refactoring variables and optimizing complexity models...</p>
                  </div>
                )}

                {!report && !loading && (
                  <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-3">
                    <span className="material-symbols-outlined text-4xl text-[#908fa0] opacity-30">auto_fix_high</span>
                    <p className="text-[13px]">Optimized code comparisons will display here side-by-side.</p>
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

          {/* Right Metrics Panel */}
          <div className="w-80 bg-[#0B0F19] p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
            {error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-4 text-xs">
                ⚠️ {error}
              </div>
            )}

            {report && !loading && (
              <div className="flex flex-col gap-5">
                <h3 className="text-[11px] font-label-caps text-[#94A3B8] uppercase tracking-wider">Complexity Scales</h3>

                <div className="bg-[#16161D] p-4 rounded-xl border border-[#1E1E22] flex justify-between text-center gap-4">
                  <div>
                    <span className="text-[9px] text-[#64748B] uppercase tracking-wider block">Complexity Before</span>
                    <strong className="text-sm text-[#ffb4ab] block mt-1 font-bold">{report.complexityBefore || 'N/A'}</strong>
                  </div>
                  <div className="border-l border-[#1E1E22] pl-6">
                    <span className="text-[9px] text-[#64748B] uppercase tracking-wider block">Complexity After</span>
                    <strong className="text-sm text-[#4edea3] block mt-1 font-bold">{report.complexityAfter || 'N/A'}</strong>
                  </div>
                </div>

                {report.performanceGain && (
                  <div>
                    <span className="text-[10px] font-label-caps text-[#8083ff] uppercase block mb-1">Performance Gain</span>
                    <div className="bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 p-3 rounded-lg text-xs leading-relaxed">
                      {report.performanceGain}
                    </div>
                  </div>
                )}

                {report.improvements && report.improvements.length > 0 && (
                  <div>
                    <span className="text-[10px] font-label-caps text-[#94A3B8] uppercase block mb-2">Key Improvements</span>
                    <ul className="list-disc pl-4 space-y-2 text-xs text-[#CBD5E1] leading-relaxed">
                      {report.improvements.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!report && (
              <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-3 opacity-60">
                <span className="material-symbols-outlined text-3xl">bar_chart</span>
                <p className="text-[11px]">Algorithmic scales comparison data will populate here.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default RefactoringPage;
