// client/src/components/TeamModal.jsx
import { useState } from 'react';
import { useTeam } from '../context/TeamContext';

const TeamModal = ({ onClose }) => {
  const { teams, activeTeamId, createTeam, inviteUser } = useTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      await createTeam(newTeamName);
      setNewTeamName('');
      setMsg('Team created successfully!');
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || activeTeamId === 'personal') return;
    setLoading(true);
    setMsg('');
    try {
      await inviteUser(activeTeamId, inviteEmail);
      setInviteEmail('');
      setMsg('User invited successfully!');
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const activeTeam = teams.find(t => t._id === activeTeamId);

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '400px', maxWidth: '90%' }}>
        <button className="drawer-close" onClick={onClose}>✕</button>
        <h2>Manage Workspaces</h2>
        
        {msg && <div style={{ margin: '15px 0', padding: '10px', background: '#334155', borderRadius: '4px', fontSize: '13px' }}>{msg}</div>}

        <div style={{ marginTop: '20px' }}>
          <h3>Create New Team</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input 
              type="text" 
              placeholder="Team Name" 
              value={newTeamName} 
              onChange={e => setNewTeamName(e.target.value)} 
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1E293B', color: '#fff' }}
            />
            <button disabled={loading || !newTeamName.trim()} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '4px', background: '#3B82F6', color: '#fff', border: 'none' }}>Create</button>
          </form>
        </div>

        {activeTeamId !== 'personal' && activeTeam && (
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
            <h3>Invite to '{activeTeam.name}'</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input 
                type="email" 
                placeholder="User Email" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1E293B', color: '#fff' }}
              />
              <button disabled={loading || !inviteEmail.trim()} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '4px', background: '#10B981', color: '#fff', border: 'none' }}>Invite</button>
            </form>
            
            <h4 style={{ marginTop: '20px' }}>Members ({activeTeam.members?.length || 0})</h4>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
              {activeTeam.members?.map(m => (
                <li key={m._id} style={{ padding: '8px', background: '#1E293B', marginBottom: '4px', borderRadius: '4px', fontSize: '13px' }}>
                  {m.name} <span style={{ color: '#94A3B8' }}>({m.email})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamModal;
