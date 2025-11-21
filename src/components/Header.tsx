import React, { useState } from 'react';
import './Header.css';

interface HeaderProps {
  nodeCount?: number;
  relationshipCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ nodeCount = 0, relationshipCount = 0 }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <button 
            className="burger-menu" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
          </button>
          
          <div className="header-branding">
            <div className="logo">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="8" cy="8" r="3" fill="#55efc4" />
                <circle cx="24" cy="8" r="3" fill="#74b9ff" />
                <circle cx="16" cy="24" r="3" fill="#a29bfe" />
                <line x1="8" y1="8" x2="24" y2="8" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="8" y1="8" x2="16" y2="24" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="24" y1="8" x2="16" y2="24" stroke="#ffffff" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="app-title">KnowledgeMesh</h1>
          </div>
        </div>

        <div className="header-center">
          {nodeCount > 0 && (
            <div className="graph-stats">
              <div className="stat-item">
                <span className="stat-icon">●</span>
                <span className="stat-value">{nodeCount.toLocaleString()}</span>
                <span className="stat-label">nodes</span>
              </div>
              <div className="stat-divider">|</div>
              <div className="stat-item">
                <span className="stat-icon">→</span>
                <span className="stat-value">{relationshipCount.toLocaleString()}</span>
                <span className="stat-label">relationships</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="user-menu">
            <button className="user-menu-button" aria-label="User menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="8" r="4" strokeWidth="2" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
