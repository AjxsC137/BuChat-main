import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, UserPlus, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import Button from '../common/Button';
import './RightSidebar.css';

const RightSidebar = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
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

  return (
    <aside className="right-sidebar">
      
      {/* --- Trending Groups Widget --- */}
      <div className="glass-panel sidebar-widget">
        <div className="widget-header">
          <div className="icon-badge orange">
            <TrendingUp size={18} />
          </div>
          <h3>Trending Tribes</h3>
        </div>
        
        <div className="widget-content">
          {trendingGroups.map((group) => (
            <Link key={group.id} to={`/g/${group.id}`} className="group-row">
              <div className="group-circle-icon">
                {group.icon}
              </div>
              <div className="group-info">
                <span className="group-name">g/{group.name}</span>
                <span className="group-meta">
                  <Users size={12} /> {group.members}
                </span>
              </div>
              <div className="arrow-hint">
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* --- User Suggestions Widget --- */}
      {user && (
        <div className="glass-panel sidebar-widget">
          <div className="widget-header">
            <div className="icon-badge blue">
              <UserPlus size={18} />
            </div>
            <h3>People to Follow</h3>
          </div>
          
          <div className="widget-content">
            {loadingSuggestions ? (
              <div className="widget-loading">
                <div className="spinner-ring"></div>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <div key={suggestion.userId} className="suggestion-row">
                  <Link to={`/u/${suggestion.username}`} className="suggestion-link">
                    <div className="suggestion-avatar-wrapper">
                      {suggestion.avatar ? (
                        <img 
                          src={suggestion.avatar} 
                          alt={suggestion.username} 
                          className="circle-avatar"
                        />
                      ) : (
                        <div className="circle-avatar placeholder">
                          {(suggestion.displayName || suggestion.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="suggestion-info">
                      <span className="suggestion-name">
                        {suggestion.displayName || suggestion.username}
                      </span>
                      <span className="suggestion-handle">@{suggestion.username}</span>
                    </div>
                  </Link>
                  
                  <button className="follow-icon-btn" title="Follow">
                    <UserPlus size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="widget-empty">
                <p>No new suggestions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- About / Footer Widget --- */}
      <div className="glass-panel sidebar-widget mini-footer-card">
        <div className="widget-header">
          <div className="icon-badge purple">
            <Info size={18} />
          </div>
          <h3>BuChat Premium</h3>
        </div>
        <div className="widget-content">
          <p className="about-text">
            Unlock exclusive badges, custom themes, and support the community.
          </p>
          <Button variant="primary" fullWidth size="small" className="premium-btn">
            Try Premium
          </Button>
          
          <div className="footer-links-row">
            <a href="/terms">Terms</a> • <a href="/privacy">Privacy</a> • <a href="/help">Help</a>
          </div>
          <div className="copyright">© 2025 BuChat Inc.</div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;