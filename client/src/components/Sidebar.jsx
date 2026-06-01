// client/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import logoImg from '../assets/logo.png';
import TeamModal from './TeamModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { teams, activeTeamId, switchTeam } = useTeam();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Explain & Debug', icon: '⚡' },
    { path: '/vulnerability', label: 'Security Scanner', icon: '🛡️' },
    { path: '/refactor', label: 'Code Refactoring', icon: '⚙️' },
    { path: '/architecture', label: 'Architecture Gen', icon: '📐' },
    { path: '/repo', label: 'Repo Analysis', icon: '📁' },
    { path: '/history', label: 'History', icon: '⏳' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src={logoImg} alt="CodeShield Logo" style={{ width: '24px', height: '24px' }} />
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>CodeShield</span>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div style={{ padding: '0 8px', marginTop: 'auto', marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workspace
        </label>
        <select 
          value={activeTeamId} 
          onChange={(e) => switchTeam(e.target.value)}
          style={{ 
            width: '100%', 
            background: '#1E293B', 
            color: '#fff', 
            border: '1px solid #334155', 
            borderRadius: '6px', 
            padding: '8px',
            fontSize: '12px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="personal">Personal Account</option>
          {teams.map(t => (
            <option key={t._id} value={t._id}>Team: {t.name}</option>
          ))}
        </select>
        <button 
          onClick={() => setIsTeamModalOpen(true)}
          style={{ 
            width: '100%', 
            marginTop: '8px', 
            background: 'transparent', 
            color: '#38BDF8', 
            border: '1px solid #38BDF8', 
            borderRadius: '6px', 
            padding: '6px', 
            fontSize: '11px', 
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Manage Teams
        </button>
      </div>

      <div className="sidebar-user" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div className="user-name" style={{ fontSize: '13px', fontWeight: '500' }}>{user?.name}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>

      {isTeamModalOpen && <TeamModal onClose={() => setIsTeamModalOpen(false)} />}
    </aside>
  );
};

export default Sidebar;
