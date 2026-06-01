// client/src/context/TeamContext.js
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const TeamContext = createContext(null);

export const TeamProvider = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(() => {
    return localStorage.getItem('cl_active_team') || 'personal';
  });

  const fetchTeams = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/teams');
      setTeams(data.teams);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  }, [user]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const switchTeam = useCallback((teamId) => {
    setActiveTeamId(teamId);
    localStorage.setItem('cl_active_team', teamId);
  }, []);

  const createTeam = useCallback(async (name) => {
    const { data } = await api.post('/teams', { name });
    await fetchTeams();
    switchTeam(data.team._id);
    return data.team;
  }, [fetchTeams, switchTeam]);

  const inviteUser = useCallback(async (teamId, email) => {
    const { data } = await api.post(`/teams/${teamId}/invite`, { email });
    await fetchTeams();
    return data;
  }, [fetchTeams]);

  // Clear state on logout
  useEffect(() => {
    if (!user) {
      setTeams([]);
      switchTeam('personal');
    }
  }, [user, switchTeam]);

  return (
    <TeamContext.Provider value={{ teams, activeTeamId, switchTeam, createTeam, inviteUser, fetchTeams }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within TeamProvider');
  return ctx;
};
