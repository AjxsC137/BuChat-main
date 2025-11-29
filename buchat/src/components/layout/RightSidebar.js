import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  UserPlus, 
  Info, 
  Menu, 
  ChevronDown, 
  ChevronRight,
  Shield, // For Premium icon
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import './RightSidebar.css';

const RightSidebar = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // UI States for collapsible sections
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    trending: true,
    suggestions: true,
    premium: true
  });

  const trendingGroups = [
    { name: 'Technology', members: '2.5M', icon: '💻', id: 'tech' },
    { name: 'Gaming', members: '1.8M', icon: '🎮', id: 'gaming' },
    { name: 'Movies', members: '1.2M', icon: '🎬', id: 'movies' },
  ];

  useEffect(() => {
    if (user?.userId) {
      loadUserSuggestions();
    }
  }, [user?.userId]);

  const loadUserSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await userService.getUserSuggestions(user.userId, 5);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load user suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside className="app-right-rail" aria-label="Secondary navigation">
      <div 
        id="flex-right-nav-container" 
        className={isExpanded ? 'expanded' : 'collapsed'} 
        data-state={isExpanded ? 'expanded' : 'collapsed'} 
        aria-expanded={isExpanded}
      >
        
        {/* Toggle Button (Optional, can remove if you want it always open) */}
        <div id="flex-nav-buttons">
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Sidebar"
          >
            {isExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div id="flex-right-nav-contents">
          <div className="contents" id="right-nav-persistent-container">
            <nav className="sidebar-nav" aria-label="Right sidebar navigation">
              
              {/* --- Section: Trending Tribes --- */}
              <section className="nav-section">
                <button 
                  type="button" 
                  className="nav-section-header" 
                  aria-expanded={expandedSections.trending} 
                  onClick={() => toggleSection('trending')}
                >
                  <span className="section-title">TRENDING TRIBES</span>
                  <span className="section-icon">
                    {expandedSections.trending ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                  </span>
                </button>

                {expandedSections.trending && (
                  <div className="nav-section-content">
                    <ul className="nav-list">
                      {trendingGroups.map((group) => (
                        <li key={group.id}>
                          <Link to={`/g/${group.id}`} className="nav-item">
                            <span className="nav-icon text-emoji">{group.icon}</span>
                            <div className="nav-label-container">
                              <span className="nav-label">{group.name}</span>
                              <span className="nav-meta-sub">{group.members} members</span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <hr className="nav-divider" />

              {/* --- Section: People to Follow --- */}
              {user && (
                <section className="nav-section">
                  <button 
                    type="button" 
                    className="nav-section-header" 
                    aria-expanded={expandedSections.suggestions} 
                    onClick={() => toggleSection('suggestions')}
                  >
                    <span className="section-title">SUGGESTIONS</span>
                    <span className="section-icon">
                      {expandedSections.suggestions ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </span>
                  </button>

                  {expandedSections.suggestions && (
                    <div className="nav-section-content">
                      <ul className="nav-list">
                        {loadingSuggestions ? (
                          <li className="nav-item-loading">Loading...</li>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((suggestion) => (
                            <li key={suggestion.userId}>
                              <div className="nav-item user-item">
                                <Link to={`/u/${suggestion.username}`} className="nav-link-wrapper">
                                  <span className="nav-icon">
                                    {suggestion.avatar ? (
                                      <img src={suggestion.avatar} alt="" className="nav-avatar-img" />
                                    ) : (
                                      <div className="nav-avatar-placeholder">
                                        {(suggestion.displayName || suggestion.username).charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </span>
                                  <div className="nav-label-container">
                                    <span className="nav-label">
                                      {suggestion.displayName || suggestion.username}
                                    </span>
                                    <span className="nav-meta-sub">@{suggestion.username}</span>
                                  </div>
                                </Link>
                                <button className="mini-follow-btn" title="Follow">
                                  <UserPlus size={16} />
                                </button>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="nav-item-empty">No new suggestions</li>
                        )}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              <hr className="nav-divider" />

              {/* --- Section: Premium --- */}
              <ul className="nav-list nav-list-primary">
                <li>
                  <Link to="/premium" className="nav-item premium-item">
                    <span className="nav-icon highlight-purple">
                      <Shield size={20} />
                    </span>
                    <div className="nav-label-container">
                      <span className="nav-label highlight-purple">BuChat Premium</span>
                      <span className="nav-meta-sub">Unlock badges & themes</span>
                    </div>
                  </Link>
                </li>
              </ul>

            </nav>

            {/* --- Footer --- */}
            <div className="sidebar-footer" role="contentinfo">
              <div className="footer-links-row">
                 <Link to="/terms">Terms</Link> • <Link to="/privacy">Privacy</Link> • <Link to="/help">Help</Link>
              </div>
              <p className="footer-text">BuChat © 2025</p>
            </div>

          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;