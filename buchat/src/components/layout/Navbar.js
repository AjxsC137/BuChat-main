import React, { useState, useEffect, useRef } from 'react'; // Added useRef, useEffect
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Search,
  Plus,
  Bell,
  MessageCircle,
  User,
  Menu,
  X,
  TrendingUp,
  Settings,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../common/Button';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: Ref to detect outside clicks
  const menuRef = useRef(null);

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  // NEW: Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  return (
    <nav className="navbar glass-nav">
      <div className="navbar-container">
        
        {/* LEFT: Logo */}
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="brand-wrapper"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" height="40" width="180">
                <defs>
                  <linearGradient id="headerGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <g transform="translate(2, 2)">
                  <path 
                    d="M 18 2 C 9.2 2 2 9.2 2 18 C 2 26.8 9.2 34 18 34 C 21 34 23.5 33.2 25.5 32 L 32 35 L 30 29 C 32.5 26 34 22.2 34 18 C 34 9.2 26.8 2 18 2 Z" 
                    fill="none" 
                    stroke="url(#headerGrad1)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <text 
                    x="18" y="23" 
                    textAnchor="middle" 
                    fontFamily="sans-serif" 
                    fontWeight="900" 
                    fontSize="14" 
                    fill="url(#headerGrad1)"
                    style={{ letterSpacing: '-1px' }}
                  >
                    BU
                  </text>
                </g>
                <text x="48" y="27" fontFamily="sans-serif" fontSize="24" fill="currentColor" className="logo-text">
                  <tspan fontWeight="800">Bu</tspan>
                  <tspan fontWeight="800" fill="url(#headerGrad1)">Chat</tspan>
                </text>
              </svg>
            </motion.div>
          </Link>
        </div>

        {/* CENTER: Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search topics, people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>

        {/* RIGHT: Actions */}
        <div className="navbar-right">
          <button
            className="nav-icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {isAuthenticated ? (
            <>
              <div className="desktop-actions">
                <Link to="/create-post" className="nav-icon-button accent-hover">
                  <Plus size={22} />
                </Link>
                <Link to="/notifications" className="nav-icon-button">
                  <Bell size={22} />
                  <span className="nav-badge">2</span>
                </Link>
                <Link to="/messages" className="nav-icon-button">
                  <MessageCircle size={22} />
                </Link>
              </div>

              {/* User Dropdown - WRAPPED IN REF */}
              <div className="user-menu-container" ref={menuRef}>
                <motion.button
                  className="user-avatar-button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  whileTap={{ scale: 0.95 }}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      className="user-dropdown glass-dropdown"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="dropdown-header">
                        <span className="user-name">{user?.displayName || 'User'}</span>
                        <span className="user-handle">@{user?.username}</span>
                      </div>
                      
                      <div className="dropdown-divider" />
                      
                      <Link
                        to={`/profile/${user?.username}`}
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={18} /> Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings size={18} /> Settings
                      </Link>
                      
                      <div className="dropdown-divider" />
                      
                      <button className="dropdown-item danger" onClick={handleLogout}>
                        <LogOut size={18} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Button 
                variant={isLoginPage ? "primary" : "ghost"} 
                size="small" 
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant={isRegisterPage ? "primary" : "secondary"}
                size="small" 
                onClick={() => navigate('/register')}
              >
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            className="mobile-menu glass-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="mobile-menu-content">
              <Link to="/" className="mobile-item" onClick={() => setShowMobileMenu(false)}>
                <Home size={20} /> Home
              </Link>
              <Link to="/trending" className="mobile-item" onClick={() => setShowMobileMenu(false)}>
                <TrendingUp size={20} /> Trending
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/messages" className="mobile-item" onClick={() => setShowMobileMenu(false)}>
                    <MessageCircle size={20} /> Messages
                  </Link>
                  <Link to={`/profile/${user?.username}`} className="mobile-item" onClick={() => setShowMobileMenu(false)}>
                    <User size={20} /> Profile
                  </Link>
                  <button className="mobile-item danger" onClick={handleLogout}>
                    <LogOut size={20} /> Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;