// client/src/pages/RepoPage.jsx
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import Sidebar from '../components/Sidebar';

const MODELS = [
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Fast)' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen Coder (Smart)' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Expert)' }
];

const RepoPage = () => {
  const [url, setUrl] = useState('');
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const contentRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [analysis]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const token = localStorage.getItem('cl_token');
      const response = await fetch('/api/repo/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url, modelId: model })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

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
              if (data.error) {
                setError(data.error);
                break;
              }
              if (data.content) {
                setAnalysis((prev) => prev + data.content);
              }
            } catch (e) {
              console.error('Failed to parse SSE chunk:', dataStr);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const opt = {
        margin: 10,
        filename: 'CodeShield-Repo-Analysis.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0B0F19' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[#0A0A0C] font-body-md">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F19]">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 bg-[#16161d] border-b border-[#1E1E22] shrink-0 gap-4">
          <div>
            <h1 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#c0c1ff]">account_tree</span> Repository Architecture Analyzer
            </h1>
            <p className="text-[11px] text-[#908fa0]">Paste a public GitHub repository link to inspect codebase maps and file trees.</p>
          </div>

          <form onSubmit={handleAnalyze} className="flex gap-2 w-full md:w-auto items-center">
            <input 
              type="text" 
              placeholder="https://github.com/owner/repo" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="bg-[#1c1b1d] border border-[#1E1E22] text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#c0c1ff] w-64"
            />
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              className="bg-[#1c1b1d] border border-[#1E1E22] text-[#e5e1e4] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#c0c1ff]"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button 
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-5 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-[0_0_20px_rgba(128,131,255,0.2)]"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
            {analysis && (
              <button 
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-transparent border border-[#1E1E22] hover:border-[#c0c1ff] text-[#94A3B8] hover:text-white rounded-lg px-4 py-1.5 text-xs transition-all cursor-pointer"
              >
                {isExporting ? '⏳' : '📄 PDF'}
              </button>
            )}
          </form>
        </div>

        {/* Audit Details Panel */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#0A0A0C] node-line">
          {error && <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-4 text-xs mb-6">⚠️ {error}</div>}

          {!analysis && !loading && !error && (
            <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-4 mt-20">
              <span className="material-symbols-outlined text-5xl text-[#908fa0] opacity-30">deployed_code</span>
              <h3 className="text-white font-bold text-sm">Static Directory Topology Loader</h3>
              <p className="text-[13px] leading-relaxed max-w-sm">
                Paste any public GitHub repository URL above. CodeShield will fetch the directory tree and README files to map component dependencies.
              </p>
            </div>
          )}

          {analysis && (
            <div ref={contentRef} className="glass-panel p-6 rounded-xl border border-[#1E1E22] bg-[#16161D] max-w-4xl mx-auto shadow-xl select-text animate-fadeIn">
              <div className="markdown-body text-[13.5px] leading-relaxed">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}
          
          <div ref={endRef} />
        </div>
      </main>
    </div>
  );
};

export default RepoPage;
