// client/src/pages/HistoryPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';
import useHistory from '../hooks/useHistory';
import Sidebar from '../components/Sidebar';

const HistoryPage = () => {
  const { activeTeamId } = useTeam();
  const { history, pagination, loading, error, fetchHistory, deleteOne, clearAll } = useHistory();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchHistory(activeTeamId, page);
  }, [activeTeamId, page, fetchHistory]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this explanation?')) return;
    await deleteOne(id);
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    await clearAll();
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-[#0A0A0C] font-body-md">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F19]">
        {/* Top Control Bar */}
        <div className="flex justify-between items-center px-6 h-16 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
          <div>
            <h1 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#c0c1ff]">history</span> Explanation Audit History
            </h1>
            <p className="text-[11px] text-[#908fa0]">Access, review, or clear past static audits and team codebase scans.</p>
          </div>

          {history.length > 0 && (
            <button 
              className="bg-transparent border border-[#ffb4ab]/40 text-[#ffb4ab] hover:bg-[#ffb4ab]/5 rounded-lg px-4 py-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              onClick={handleClear}
            >
              Clear all history
            </button>
          )}
        </div>

        {/* Audit list workspace */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#0A0A0C] node-line">
          {error && <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-4 text-xs mb-6">⚠️ {error}</div>}
          {loading && (
            <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-3 mt-10">
              <div className="loading-dots mb-2">
                <span></span><span></span><span></span>
              </div>
              <p className="text-[13px]">Fetching historical records...</p>
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-4 mt-20">
              <span className="material-symbols-outlined text-5xl text-[#908fa0] opacity-30">history</span>
              <h3 className="text-white font-bold text-sm">No Audit History Found</h3>
              <p className="text-[13px] leading-relaxed max-w-sm">
                No logs have been processed in this workspace. Let's run a check! <Link to="/" className="text-[#c0c1ff] hover:underline font-semibold">Audit Code Now</Link>
              </p>
            </div>
          )}

          {/* Grid list of history cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {history.map((item) => (
              <div 
                key={item._id} 
                className="glass-panel p-5 rounded-xl border border-[#1E1E22] bg-[#16161D] hover:border-[#353437] transition-all duration-150 cursor-pointer flex flex-col justify-between h-40 shadow-md group relative overflow-hidden"
                onClick={() => setSelected(item)}
              >
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <span className="material-symbols-outlined text-5xl">description</span>
                </div>

                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-bold bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.language}
                  </span>
                  <button
                    className="text-[#64748B] hover:text-[#ffb4ab] transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                  >
                    ✕
                  </button>
                </div>

                <h3 className="text-[13.5px] font-bold text-white leading-snug line-clamp-2 pr-6">{item.title || 'Untitled Audit'}</h3>
                
                <div className="flex justify-between items-center mt-4 border-t border-[#1E1E22] pt-3 text-[10px] text-[#64748B] font-code-md">
                  <span>Level: {item.level}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center gap-4 justify-center mt-10 text-[13px] font-semibold text-[#908fa0]">
              <button 
                disabled={!pagination.hasPrev} 
                onClick={() => setPage((p) => p - 1)}
                className="bg-[#1c1b1d] border border-[#1E1E22] hover:border-[#c0c1ff] hover:text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button 
                disabled={!pagination.hasNext} 
                onClick={() => setPage((p) => p + 1)}
                className="bg-[#1c1b1d] border border-[#1E1E22] hover:border-[#c0c1ff] hover:text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Detail drawer overlay */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end animate-fadeIn" onClick={() => setSelected(null)}>
            <div className="bg-[#16161D] w-96 h-full p-8 border-l border-[#1E1E22] relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button 
                className="absolute top-4 right-4 text-[#64748B] hover:text-white text-lg"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selected.language}
                </span>
                <span className="text-[10px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selected.level}
                </span>
              </div>

              <h2 className="text-base font-bold text-white mb-2">{selected.title || 'Untitled Audit'}</h2>
              <p className="text-[11px] text-[#64748B] font-code-md">Recorded: {new Date(selected.createdAt).toLocaleString()}</p>
              
              <div className="mt-8 border-t border-[#1E1E22] pt-6">
                <p className="text-[13px] text-[#CBD5E1] leading-relaxed">
                  This check is stored securely in MongoDB. You can review the full breakdown or download a high-fidelity PDF from the **Explain & Debug** dashboard.
                </p>
                <Link 
                  to="/" 
                  className="w-full mt-6 bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg py-2.5 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span> Open in Workspace
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
