import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import MessageInterface from '../components/Messages/MessageInterface';
import NewMessageModal from '../components/Messages/NewMessageModal';
import messagingService from '../services/messagingService';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import AuthDebug from '../components/debug/AuthDebug';


const Messages = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      loadConversations();
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    // Handle URL parameter for direct user messaging
    const userId = searchParams.get('user');
    if (userId && user?.userId && userId !== user.userId && !loading) {
      handleDirectMessage(userId);
    }
  }, [searchParams, user?.userId, loading]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagingService.getUserConversations(50);
      const convs = response.conversations || [];
      setConversations(convs);
      
      // Fetch user details for all participants
      const userIds = new Set();
      convs.forEach(conv => {
        conv.participants?.forEach(p => {
          if (p !== user.userId) userIds.add(p);
        });
      });
      
      await fetchUserDetails(Array.from(userIds));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userIds) => {
    const details = {};
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userData = await userService.getUserById(userId);
          details[userId] = {
            username: userData.username || `user_${userId.slice(-8)}`,
            displayName: userData.displayName,
            avatar: userData.avatar
          };
        } catch (error) {
          details[userId] = {
            username: `user_${userId.slice(-8)}`,
            displayName: null,
            avatar: null
          };
        }
      })
    );
    setUserDetails(prev => ({ ...prev, ...details }));
  };

  const startNewConversation = () => {
    setShowNewMessageModal(true);
  };

  const handleSelectUser = (selectedUser) => {
    setSelectedConversation({
      conversationId: [user.userId, selectedUser.userId].sort().join('#'),
      recipientId: selectedUser.userId,
      recipientUsername: selectedUser.username,
      recipientDisplayName: selectedUser.displayName,
      recipientAvatar: selectedUser.avatar
    });
    setShowNewMessageModal(false);
  };

  const handleDirectMessage = async (userId) => {
    // Check if user details are already loaded
    let userData = userDetails[userId];
    
    if (!userData) {
      // Fetch user details if not available
      try {
        const userInfo = await userService.getUserById(userId);
        userData = {
          username: userInfo.username || userId,
          displayName: userInfo.displayName,
          avatar: userInfo.avatar
        };
        setUserDetails(prev => ({ ...prev, [userId]: userData }));
      } catch (error) {
        userData = {
          username: userId,
          displayName: null,
          avatar: null
        };
        setUserDetails(prev => ({ ...prev, [userId]: userData }));
      }
    }

    // Set up conversation
    const conversation = {
      conversationId: [user.userId, userId].sort().join('#'),
      recipientId: userId,
      recipientUsername: userData.username,
      recipientDisplayName: userData.displayName,
      recipientAvatar: userData.avatar
    };
    setSelectedConversation(conversation);
    
    // Clear URL parameter
    window.history.replaceState({}, '', '/messages');
  };

  const selectConversation = (conversation) => {
    const otherParticipantId = conversation.participants?.find(p => p !== user.userId) || 'Unknown';
    const otherUser = userDetails[otherParticipantId] || { username: otherParticipantId };
    setSelectedConversation({
      conversationId: conversation.conversationId,
      recipientId: otherParticipantId,
      recipientUsername: otherUser.username,
      recipientDisplayName: otherUser.displayName,
      recipientAvatar: otherUser.avatar
    });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageTime.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="messages-page">
        <Card>
          <div className="empty-state">
            <h3>Please log in to access messages</h3>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <AuthDebug />
      <div className="messages-container">
        <Card className="messages-card">
          <div className="messages-layout">
            <aside className="conversations-sidebar">
              <div className="sidebar-header">
                <div className="header-top">
                  <h2>Messages</h2>
                  <button 
                    className="new-message-btn" 
                    onClick={startNewConversation}
                    title="New message"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="search-bar">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="conversations-list">
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💬</div>
                    <h4>No conversations yet</h4>
                    <p>Start a new conversation to begin messaging</p>
                  </div>
                ) : (
                  conversations
                    .filter(conv => 
                      !searchQuery || 
                      conv.conversationId.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((conversation) => {
                      const otherParticipantId = conversation.participants?.find(p => p !== user.userId) || 'Unknown';
                      const otherUser = userDetails[otherParticipantId] || { username: otherParticipantId, displayName: null, avatar: null };
                      const isUnread = conversation.unreadCount > 0;
                      
                      return (
                        <div
                          key={conversation.conversationId}
                          className={`conversation-item ${
                            selectedConversation?.conversationId === conversation.conversationId ? 'active' : ''
                          } ${isUnread ? 'unread' : ''}`}
                          onClick={() => {
                            selectConversation(conversation);
                            // Clear URL parameter after selection
                            if (searchParams.get('user')) {
                              window.history.replaceState({}, '', '/messages');
                            }
                          }}
                        >
                          <div className="conversation-avatar">
                            {otherUser.avatar ? (
                              <img src={otherUser.avatar} alt={otherUser.username} className="avatar-image" />
                            ) : (
                              <div className="avatar-circle">
                                {(otherUser.displayName || otherUser.username).charAt(0).toUpperCase()}
                              </div>
                            )}
                            {isUnread && <div className="unread-dot"></div>}
                          </div>
                          <div className="conversation-info">
                            <div className="conversation-header">
                              <div className="user-names">
                                <h4>{otherUser.displayName || otherUser.username}</h4>
                                {otherUser.displayName && (
                                  <span className="username">@{otherUser.username}</span>
                                )}
                              </div>
                              <span className="message-time">
                                {formatMessageTime(conversation.lastMessageAt)}
                              </span>
                            </div>
                            <p className="last-message">
                              {conversation.lastMessagePreview || 'No messages yet'}
                            </p>
                            {isUnread && (
                              <div className="unread-badge">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </aside>

            <main className="messages-main">
              {selectedConversation ? (
                <MessageInterface
                  recipientId={selectedConversation.recipientId}
                  recipientUsername={selectedConversation.recipientUsername}
                  recipientDisplayName={selectedConversation.recipientDisplayName}
                  recipientAvatar={selectedConversation.recipientAvatar}
                />
              ) : (
                <div className="empty-state">
                  <h3>Select a conversation to start messaging</h3>
                  <p>Choose from your existing conversations or start a new one</p>
                </div>
              )}
            </main>
          </div>
        </Card>
        
        <NewMessageModal
          isOpen={showNewMessageModal}
          onClose={() => setShowNewMessageModal(false)}
          onSelectUser={handleSelectUser}
        />
      </div>
    </div>
  );
};

export default Messages;