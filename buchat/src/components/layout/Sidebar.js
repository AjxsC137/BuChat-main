import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Users, MessageCircle, Bell, Settings,
  User, Search, Compass, Bookmark, Menu,
  ChevronDown, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const [groupsOpen, setGroupsOpen] = useState(true);

  // Map your existing data
  const mainItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Users, label: 'Friends', path: '/friends' },
    { icon: Compass, label: 'Groups', path: '/groups' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const yourGroups = [
    { label: 'Technology', path: '/c/technology', icon: '💻' },
    { label: 'Gaming', path: '/c/gaming', icon: '🎮' },
    { label: 'Art', path: '/c/art', icon: '🎨' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="app-left-rail" aria-label="Site navigation">
      <div 
        id="flex-left-nav-container" 
        className={collapsed ? 'collapsed' : 'expanded'}
        data-state={collapsed ? 'collapsed' : 'expanded'} 
        aria-expanded={!collapsed}
      >
        
        {/* Toggle Button */}
        <div id="flex-nav-buttons">
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={onToggleCollapse}
            title="Toggle Navigation"
          >
            <Menu size={20} />
          </button>
        </div>

        <div id="flex-left-nav-contents">
          <div className="contents" id="left-nav-persistent-container">
            <nav className="sidebar-nav" aria-label="Primary navigation">
              
              {/* Main Navigation List */}
              <ul className="nav-list nav-list-primary">
                {mainItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Link 
                        to={item.path} 
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                      >
                        <span className="nav-icon">
                          <Icon size={20} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                        </span>
                        <span className="nav-label-container">
                          <span className="nav-label">{item.label}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <hr className="nav-divider" />

              {/* Groups Section */}
              <section className="nav-section" aria-label="Your Groups">
                <button 
                  type="button" 
                  className="nav-section-header" 
                  aria-expanded={groupsOpen}
                  onClick={() => setGroupsOpen(!groupsOpen)}
                >
                  <span className="section-title">YOUR GROUPS</span>
                  <span className="section-icon">
                    {groupsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>

                {groupsOpen && (
                  <div className="nav-section-content" role="group">
                    <ul className="nav-list">
                      {yourGroups.map((group) => (
                        <li key={group.path}>
                          <Link to={group.path} className={`nav-item ${isActive(group.path) ? 'active' : ''}`}>
                             {/* Using emoji as icon here, or you can map Lucide icons */}
                             <span className="nav-icon emoji-icon">{group.icon}</span>
                             <span className="nav-label-container">
                                <span className="nav-label">{group.label}</span>
                             </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

            </nav>

            {/* Footer */}
            <div className="sidebar-footer" role="contentinfo">
              <p className="footer-text">BuChat © 2025</p>
            </div>
            
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;