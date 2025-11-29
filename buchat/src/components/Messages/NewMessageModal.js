import React, { useState, useEffect } from 'react';
import { X, Search, User, Filter } from 'lucide-react';
import { userService } from '../../services/userService';
import './NewMessageModal.css';

const NewMessageModal = ({ isOpen, onClose, onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState('both');

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setUsers([]);
    }
  }, [searchQuery, searchType, isOpen]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      console.log('Searching for users with query:', searchQuery, 'type:', searchType);
      const response = await userService.searchUsers(searchQuery, { searchType });
      console.log('Search response:', response);
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleStartConversation = () => {
    if (selectedUser) {
      onSelectUser(selectedUser);
      onClose();
      setSelectedUser(null);
      setSearchQuery('');
      setUsers([]);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUser(null);
    setSearchQuery('');
    setUsers([]);
  };

  const formatLastActive = (timestamp) => {
    const now = new Date();
    const lastActive = new Date(timestamp);
    const diffMs = now - lastActive;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Message</h3>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="search-section">
            <div className="search-input-container">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button 
                className="filter-btn"
                onClick={() => setShowFilters(!showFilters)}
                title="Filter users"
              >
                <Filter size={16} />
              </button>
            </div>
            
            {showFilters && (
              <div className="filter-options">
                <div className="filter-group">
                  <label>Search by:</label>
                  <div className="search-type-options">
                    <button 
                      className={`filter-option ${searchType === 'both' ? 'active' : ''}`}
                      onClick={() => setSearchType('both')}
                    >
                      Both
                    </button>
                    <button 
                      className={`filter-option ${searchType === 'username' ? 'active' : ''}`}
                      onClick={() => setSearchType('username')}
                    >
                      Username
                    </button>
                    <button 
                      className={`filter-option ${searchType === 'displayName' ? 'active' : ''}`}
                      onClick={() => setSearchType('displayName')}
                    >
                      Display Name
                    </button>
                  </div>
                </div>
                <div className="filter-group">
                  <label>Filter:</label>
                  <div className="user-filter-options">
                    <button 
                      className={`filter-option ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterType('all')}
                    >
                      All Users
                    </button>
                    <button 
                      className={`filter-option ${filterType === 'recent' ? 'active' : ''}`}
                      onClick={() => setFilterType('recent')}
                    >
                      Recent
                    </button>
                    <button 
                      className={`filter-option ${filterType === 'following' ? 'active' : ''}`}
                      onClick={() => setFilterType('following')}
                    >
                      Following
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {searchQuery.length >= 2 && (
            <div className="users-list">
              {loading ? (
                <div className="loading-state">
                  <p>Searching users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="empty-state">
                  <p>No users found</p>
                </div>
              ) : (
                users
                  .filter(user => {
                    if (filterType === 'all') return true;
                    if (filterType === 'recent') return user.lastActive;
                    if (filterType === 'following') return user.isFollowing;
                    return true;
                  })
                  .map((user) => (
                    <div
                      key={user.userId}
                      className={`user-item ${selectedUser?.userId === user.userId ? 'selected' : ''}`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <div className="user-header">
                          <h4>u/{user.username}</h4>
                          {user.isOnline && <div className="online-indicator"></div>}
                        </div>
                        {user.displayName && (
                          <p className="display-name">{user.displayName}</p>
                        )}
                        {user.lastActive && (
                          <p className="last-active">Last active: {formatLastActive(user.lastActive)}</p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {searchQuery.length < 2 && (
            <div className="instruction">
              <div className="instruction-content">
                <User size={48} className="instruction-icon" />
                <h4>Find people to message</h4>
                <p>Type at least 2 characters to search for users</p>
                <p className="search-hint">Use filters to search by username, display name, or both</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button 
            className="start-btn" 
            onClick={handleStartConversation}
            disabled={!selectedUser}
          >
            Start Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewMessageModal;