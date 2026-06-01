// client/src/pages/HistoryPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import useHistory from '../hooks/useHistory';
import logoImg from '../assets/logo.png';
import TeamModal from '../components/TeamModal';

const HistoryPage = () => {
  const { user, logout } = useAuth();
  const { teams, activeTeamId, switchTeam } = useTeam();
  const { history, pagination, loading, error, fetchHistory, deleteOne, clearAll } = useHistory();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

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
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logoImg} alt="CodeShield Logo" style={{ width: '24px', height: '24px', marginRight: '10px', verticalAlign: 'middle' }} />
          CodeShield
        </div>
        <nav className="sidebar-nav">
          <a href="/" className="nav-item">Explain & Debug</a>
          <a href="/history" className="nav-item active">History</a>
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

      <main className="main-content history-main">
        <div className="history-header">
          <h1>Explanation History</h1>
          {history.length > 0 && (
            <button className="btn-danger-sm" onClick={handleClear}>Clear all</button>
          )}
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}
        {loading && <div className="loading-text">Loading...</div>}

        {!loading && history.length === 0 && (
          <div className="output-placeholder">
            <div className="placeholder-icon">📂</div>
            <p>No explanations yet. <Link to="/">Explain some code!</Link></p>
          </div>
        )}

        <div className="history-list">
          {history.map((item) => (
            <div key={item._id} className="history-card" onClick={() => setSelected(item)}>
              <div className="hc-top">
                <span className="hc-title">{item.title || 'Untitled'}</span>
                <button
                  className="hc-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                >
                  ✕
                </button>
              </div>
              <div className="hc-meta">
                <span className="tag">{item.language}</span>
                <span className="tag">{item.level}</span>
                <span className="tag dim">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="pagination">
            <button disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        )}

        {/* Detail drawer */}
        {selected && (
          <div className="drawer-overlay" onClick={() => setSelected(null)}>
            <div className="drawer" onClick={(e) => e.stopPropagation()}>
              <button className="drawer-close" onClick={() => setSelected(null)}>✕</button>
              <h2>{selected.title}</h2>
              <div className="hc-meta" style={{ marginBottom: '1.5rem' }}>
                <span className="tag">{selected.language}</span>
                <span className="tag">{selected.level}</span>
              </div>
              <p><em>{new Date(selected.createdAt).toLocaleString()}</em></p>
              <p style={{ marginTop: '1rem', color: '#888' }}>
                Open this item in the explainer for the full breakdown.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
