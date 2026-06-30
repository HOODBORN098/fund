import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopNavBar({
  variant = 'app',
  showSearch = false,
  searchPlaceholder = "Search...",
  showSwitch = false,
  userName,
  role,
}) {
  const navigate = useNavigate();
  const [chamaMenuOpen, setChamaMenuOpen] = useState(false);
  const auth = (() => { try { return useAuth(); } catch { return null; } })();

  if (variant === 'landing') {
    return (
      <header className="w-full top-0 bg-surface border-b border-outline-variant z-50 sticky">
        <div className="flex justify-center items-center h-20 px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto w-full">
          <div className="flex justify-between items-center w-full">
            <Link to="/" className="font-display-lg text-headline-md text-primary tracking-tight">FundLoop</Link>
            <nav className="hidden md:flex gap-xl">
              <a className="text-primary font-bold border-b-2 border-primary font-label-md text-label-md" href="#features">Platform</a>
              <a className="text-secondary font-medium font-label-md text-label-md hover:text-primary-container transition-colors duration-200" href="#features">Solutions</a>
              <Link className="text-secondary font-medium font-label-md text-label-md hover:text-primary-container transition-colors duration-200" to="/setup">Governance</Link>
              <a className="text-secondary font-medium font-label-md text-label-md hover:text-primary-container transition-colors duration-200" href="#security">Security</a>
            </nav>
            <div className="flex items-center gap-md">
              <Link to="/login" className="hidden md:block text-primary font-label-md text-label-md px-md py-sm hover:opacity-80">Log In</Link>
              <Link to="/setup" className="bg-primary-container text-on-primary-container px-lg py-sm rounded font-label-md text-label-md hover:opacity-90 transition-opacity">Get Started</Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const displayName = userName || auth?.user?.name || 'Guest';
  const displayRole = role || auth?.user?.role || '';
  const chamaName = auth?.activeChama?.name || 'Select Chama';

  return (
    <header className="sticky top-0 h-16 bg-surface border-b border-outline-variant z-40 flex justify-between items-center w-full px-margin-desktop">
      <div className="flex items-center gap-stack-lg">
        {!showSearch ? (
          <div className="relative">
            <button
              onClick={() => setChamaMenuOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer focus:ring-2 focus:ring-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              <span className="font-title-md text-title-md text-primary">{chamaName}</span>
              <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
            </button>
            {chamaMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-outline-variant rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={() => { setChamaMenuOpen(false); navigate('/portal'); }}
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-low font-body-md text-body-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span> Switch Chama
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative group w-96">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-stack-lg">
        {showSwitch && (
          <div className="flex items-center gap-4 border-r border-outline-variant pr-6">
            <button onClick={() => navigate('/portal')} className="px-4 py-2 border border-primary text-primary font-title-md text-title-md rounded hover:bg-surface-container-low transition-colors">
              Switch Chama
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
          <div className="text-right">
            <p className="font-title-md text-title-md text-on-surface leading-none">{displayName}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant capitalize">{displayRole}</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-outline-variant bg-primary-fixed flex items-center justify-center font-bold text-primary">
            {displayName.slice(0,2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
