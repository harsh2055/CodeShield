// client/src/pages/RepoPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

const MODELS = [
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Fast)' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen Coder (Smart)' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Expert)' }
];

const RepoPage = () => {
  const { user, logout } = useAuth();
  
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
        filename: 'CodeLens-Repo-Analysis.pdf',
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
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logoImg} alt="CodeLens Logo" style={{ width: '24px', height: '24px', marginRight: '10px', verticalAlign: 'middle' }} />
          CodeLens
        </div>
        <nav className="sidebar-nav">
          <a href="/" className="nav-item">Explain & Debug</a>
          <a href="/history" className="nav-item">History</a>
          <a href="/repo" className="nav-item active">Repo Analysis</a>
        </nav>
        
        <div className="sidebar-user" style={{ marginTop: 'auto' }}>
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-topbar" style={{ padding: '15px 20px', borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
          <h1 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>Repository Architecture Analyzer</h1>
          <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="https://github.com/owner/repo" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #334155', background: '#1E293B', color: '#fff' }}
              disabled={loading}
            />
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              style={{ width: '200px', padding: '10px', borderRadius: '4px', border: '1px solid #334155', background: '#1E293B', color: '#fff' }}
              disabled={loading}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button 
              type="submit"
              disabled={loading || !url.trim()}
              style={{ padding: '10px 20px', borderRadius: '4px', background: '#3B82F6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
            {analysis && (
              <button 
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                style={{ padding: '10px 20px', borderRadius: '4px', background: 'transparent', color: '#94A3B8', border: '1px solid #334155', cursor: 'pointer' }}
              >
                {isExporting ? '⏳ Exporting...' : '📄 PDF'}
              </button>
            )}
          </form>
        </div>

        <div style={{ flex: 1, padding: '30px', overflowY: 'auto', background: '#0B0F19' }}>
          {error && <div className="error-banner" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}

          {!analysis && !loading && !error && (
            <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '100px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏗️</div>
              <p>Paste a public GitHub URL above to generate an architectural breakdown.</p>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>CodeLens will fetch the repository tree and README to construct a high-level overview.</p>
            </div>
          )}

          {analysis && (
            <div ref={contentRef} style={{ background: '#0B0F19', padding: '20px', borderRadius: '8px' }}>
              <div className="markdown-body" style={{ lineHeight: '1.6' }}>
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
