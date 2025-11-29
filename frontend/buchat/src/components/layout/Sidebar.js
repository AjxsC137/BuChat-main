import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, MessageCircle, Bell, Settings,
  ChevronDown, User, Search,
  Compass, Bookmark, Pin, PinOff,
  TrendingUp
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(true);

  // Smart Hover Logic:
  // If collapsed (unpinned), it only expands on hover.
  // If not collapsed (pinned), it stays expanded.
  const isExpanded = !collapsed || isHovered;

  const mainItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
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

  // Animation Variants
  const sidebarVariants = {
    expanded: { 
      width: 200, 
      transition: { type: "spring", stiffness: 400, damping: 30 } 
    },
    collapsed: { 
      width: 70, 
      transition: { type: "spring", stiffness: 400, damping: 30 } 
    }
  };

  const labelVariants = {
    visible: { opacity: 1, x: 0, display: "block", transition: { delay: 0.05 } },
    hidden: { opacity: 0, x: -10, transitionEnd: { display: "none" } }
  };

  return (
    <motion.aside
      className={`glass-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header & Pin Toggle */}
      <div className="sidebar-header">
        <button
          className={`toggle-btn ${!collapsed ? 'pinned' : ''}`}
          onClick={onToggleCollapse}
          title={!collapsed ? "Unpin Sidebar (Enable Auto-Collapse)" : "Pin Sidebar (Keep Open)"}
        >
          {!collapsed ? <Pin size={20} fill="currentColor" /> : <PinOff size={20} />}
        </button>
      </div>

      <div className="sidebar-content">
        <nav className="nav-section">
          <ul className="nav-list">
            {mainItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              
              return (
                <li key={item.path} className="nav-li">
                  <Link
                    to={item.path}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    {/* Active Indicator (Left Border) */}
                    {active && (
                      <motion.div 
                        layoutId="active-glow" 
                        className="active-indicator"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}

                    <div className={`icon-wrapper ${active ? 'active' : ''}`}>
                      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                    </div>
                    
                    <motion.span 
                      className="nav-label"
                      variants={labelVariants}
                      animate={isExpanded ? "visible" : "hidden"}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Groups Section - Only shows when fully expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className="nav-group-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="divider" />
              
              <button
                className="group-header-btn"
                onClick={() => setGroupsOpen(!groupsOpen)}
              >
                <span>YOUR TRIBES</span>
                <motion.div
                  animate={{ rotate: groupsOpen ? 0 : -90 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {groupsOpen && (
                  <motion.ul
                    className="nav-list group-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {yourGroups.map((group) => (
                      <li key={group.path}>
                        <Link to={group.path} className="nav-item group-item">
                          <span className="group-emoji">{group.icon}</span>
                          <span className="nav-label">{group.label}</span>
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sidebar-footer">
        <motion.p 
          className="footer-text"
          variants={labelVariants}
          animate={isExpanded ? "visible" : "hidden"}
        >
          BuChat © 2025
        </motion.p>
      </div>
    </motion.aside>
  );
};

export default Sidebar;