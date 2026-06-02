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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Explain & Debug', icon: 'bolt' },
    { path: '/vulnerability', label: 'Security Scanner', icon: 'shield' },
    { path: '/refactor', label: 'Code Refactoring', icon: 'auto_fix_high' },
    { path: '/architecture', label: 'Architecture Gen', icon: 'hub' },
    { path: '/repo', label: 'Repo Analysis', icon: 'account_tree' },
    { path: '/history', label: 'History', icon: 'history' },
  ];

  const SidebarContent = ({ className = "" }) => (
    <div className={`w-64 flex flex-col bg-[#121214] border-r border-[#1E1E22] shrink-0 p-4 justify-between h-full ${className}`}>
      <div className="flex flex-col gap-6">
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="CodeShield Logo" className="w-6 h-6 animate-pulse" />
            <span className="font-headline-sm text-[16px] font-bold text-[#c0c1ff] tracking-tight">CodeShield</span>
          </div>
          {/* Close button inside mobile menu */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-[#908fa0] hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-label-caps text-label-caps transition-all duration-150 group ${
                  isActive 
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff] border-r-2 border-[#c0c1ff] shadow-[0_0_15px_rgba(192,193,255,0.05)]' 
                    : 'text-[#c7c4d7] hover:bg-[#353437]/20 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Workspace Selection & Profile footer */}
      <div className="flex flex-col gap-4 mt-auto">
        {/* Workspace Dropdown */}
        <div className="border-t border-[#1E1E22] pt-4">
          <label className="block text-[10px] font-label-caps text-[#908fa0] uppercase tracking-wider mb-2">
            Workspace
          </label>
          <select 
            value={activeTeamId} 
            onChange={(e) => switchTeam(e.target.value)}
            className="w-full bg-[#1c1b1d] text-white border border-[#1E1E22] rounded-lg p-2 text-xs focus:outline-none focus:border-[#c0c1ff] cursor-pointer"
          >
            <option value="personal">Personal Account</option>
            {teams.map(t => (
              <option key={t._id} value={t._id}>Team: {t.name}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              setIsTeamModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full mt-2 bg-transparent text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8] hover:bg-[#38BDF8]/5 rounded-lg py-1.5 text-[11px] font-label-caps transition-all duration-150 cursor-pointer"
          >
            Manage Teams
          </button>
        </div>

        {/* Profile Details */}
        <div className="border-t border-[#1E1E22] pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7c6af7] to-[#c0c1ff] flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-semibold text-white truncate">{user?.name}</p>
            </div>
          </div>
          <button 
            className="w-full py-1.5 text-xs text-[#908fa0] hover:text-[#ffb4ab] border border-[#1E1E22] hover:border-[#ffb4ab]/40 rounded-lg bg-transparent transition-all cursor-pointer"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Header Bar */}
      <header className="lg:hidden flex items-center justify-between w-full h-14 bg-[#121214] border-b border-[#1E1E22] px-4 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="CodeShield Logo" className="w-6 h-6" />
          <span className="font-headline-sm text-[16px] font-bold text-[#c0c1ff] tracking-tight">CodeShield</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-[#c7c4d7] hover:text-white p-1 rounded-lg hover:bg-[#353437]/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sliding Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Menu Body */}
          <div className="relative flex flex-col h-full w-64 animate-fadeIn shadow-2xl z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {isTeamModalOpen && <TeamModal onClose={() => setIsTeamModalOpen(false)} />}
    </>
  );
};

export default Sidebar;
