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
    <div className="app-layout">
      <Sidebar />

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
