// client/src/hooks/useHistory.js
import { useState, useCallback } from 'react';
import api from '../utils/api';

const useHistory = () => {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (teamId = 'personal', page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      if (teamId !== 'personal') {
        const { data } = await api.get(`/teams/${teamId}/history`, { params: { page, limit } });
        setHistory(data.history || data.explanations || []);
        setPagination(data.pagination || null);
      } else {
        const { data } = await api.get('/history', { params: { page, limit } });
        setHistory(data.explanations || []);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (id) => {
    const { data } = await api.get(`/history/${id}`);
    return data.explanation;
  }, []);

  const deleteOne = useCallback(async (id) => {
    await api.delete(`/history/${id}`);
    setHistory((prev) => prev.filter((e) => e._id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await api.delete('/history');
    setHistory([]);
    setPagination(null);
  }, []);

  return { history, pagination, loading, error, fetchHistory, fetchOne, deleteOne, clearAll };
};

export default useHistory;
