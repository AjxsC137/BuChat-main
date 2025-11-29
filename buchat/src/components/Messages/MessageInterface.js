import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Smile, MoreVertical, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import messagingService from '../../services/messagingService';
import { postService } from '../../services/postService';
import { toast } from 'react-toastify';
import ConfirmDialog from '../common/ConfirmDialog';
import './MessageInterface.css';

const MessageInterface = ({ recipientId, recipientUsername, recipientDisplayName, recipientAvatar }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [messageRequests, setMessageRequests] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const conversationId = [user?.userId, recipientId].sort().join('#');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    const type = file.type || file.mimeType;
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎥';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('word')) return '📝';
    if (type?.includes('excel')) return '📊';
    if (type?.includes('zip')) return '🗜️';
    return '📎';
  };

  const openFullscreen = (mediaUrl, mediaType) => {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.9); z-index: 9999; display: flex;
      align-items: center; justify-content: center; cursor: pointer;
    `;
    
    let content;
    if (mediaType?.startsWith('image/') || mediaType === 'image') {
      content = document.createElement('img');
      content.src = mediaUrl;
      content.style.maxWidth = '90vw';
      content.style.maxHeight = '90vh';
    } else if (mediaType?.startsWith('video/') || mediaType === 'video') {
      content = document.createElement('video');
      content.src = mediaUrl;
      content.controls = true;
      content.style.maxWidth = '90vw';
      content.style.maxHeight = '90vh';
    }
    
    if (content) {
      overlay.appendChild(content);
      overlay.onclick = () => document.body.removeChild(overlay);
      document.body.appendChild(overlay);
    }
  };

  const getMessageStatusIcon = (message) => {
    if (message.senderId !== user.userId) return null;
    if (message.sending || message.status === 'sending') return <span className="status-icon sending">⏳</span>;
    if (message.failed || message.status === 'failed') return <span className="status-icon failed">❌</span>;
    if (message.readAt || message.status === 'read') return <span className="status-icon read">✓✓</span>;
    if (message.deliveredAt || message.status === 'delivered') return <span className="status-icon delivered">✓</span>;
    if (message.status === 'sent') return <span className="status-icon sent">✓</span>;
    return <span className="status-icon sent">✓</span>;
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await messagingService.getConversationMessages(conversationId);
      setMessages(data.messages || []);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    const tempId = Date.now().toString();
    let processedMedia = [];
    
    // Upload files if any
    if (selectedFiles.length > 0) {
      try {
        const uploadPromises = selectedFiles.map(file => messagingService.uploadMedia(file));
        processedMedia = await Promise.all(uploadPromises);
      } catch (error) {
        toast.error('Failed to upload media');
        return;
      }
    }

    const tempMessage = {
      messageId: tempId,
      senderId: user.userId,
      recipientId,
      content: newMessage,
      decryptedMessage: newMessage,
      media: processedMedia,
      messageType: processedMedia.length > 0 ? processedMedia[0].type : 'text',
      createdAt: new Date().toISOString(),
      status: 'sending',
      sending: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSelectedFiles([]);
    scrollToBottom();

    try {
      const response = await messagingService.sendMessage(recipientId, newMessage, {
        media: processedMedia,
        messageType: processedMedia.length > 0 ? processedMedia[0].type : 'text'
      });
      
      if (response.message) {
        setMessages(prev => prev.map(msg => 
          msg.messageId === tempId 
            ? { ...response.message, sending: false, status: 'sent', decryptedMessage: response.message.content }
            : msg
        ));
      }
      
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => prev.map(msg => 
        msg.messageId === tempId 
          ? { ...msg, sending: false, failed: true, status: 'failed' }
          : msg
      ));
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    messagingService.setTypingIndicator(conversationId, true);
    
    typingTimeoutRef.current = setTimeout(() => {
      messagingService.setTypingIndicator(conversationId, false);
    }, 1000);
  };

  const deleteMessage = async (messageId, forEveryone = false) => {
    try {
      await messagingService.deleteMessage(messageId, forEveryone);
      
      if (forEveryone) {
        setMessages(prev => prev.map(msg => 
          msg.messageId === messageId 
            ? { ...msg, decryptedMessage: '🚫 This message was deleted', deletedForBoth: true }
            : msg
        ));
      } else {
        setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
      }
      
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete message');
    }
  };

  const toggleBlockUser = async () => {
    try {
      // Placeholder - implement block/unblock functionality
      setIsBlocked(!isBlocked);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
    } catch (error) {
      toast.error('Failed to update block status');
    }
  };

  const handleMessageRequest = async (requestId, action) => {
    try {
      await messagingService.respondToMessageRequest(requestId, action);
      setMessageRequests(prev => prev.filter(req => req.requestId !== requestId));
      if (action === 'accept') {
        loadMessages();
      }
      toast.success(`Request ${action}ed`);
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    }
  };

  const clearChat = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Chat',
      message: 'Are you sure you want to clear this chat? This action cannot be undone.',
      confirmText: 'Clear',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await messagingService.clearConversation(conversationId);
          setMessages([]);
          toast.success('Chat cleared');
        } catch (error) {
          toast.error('Failed to clear chat');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (recipientId) {
      loadMessages();
      // Poll for typing indicators
      const typingInterval = setInterval(async () => {
        try {
          const users = await messagingService.getTypingUsers(conversationId);
          setTypingUsers(users.filter(u => u.userId !== user?.userId));
        } catch (error) {
          console.debug('Failed to get typing users:', error);
        }
      }, 2000);
      
      return () => clearInterval(typingInterval);
    }
  }, [recipientId, conversationId, user?.userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll for new messages and show notifications
  useEffect(() => {
    if (!recipientId || !conversationId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const data = await messagingService.getConversationMessages(conversationId, { useCache: false });
        const allMessages = data.messages || [];
        
        // Find truly new messages (not in current state)
        const currentMessageIds = new Set(messages.map(m => m.messageId));
        const newMessages = allMessages.filter(msg => !currentMessageIds.has(msg.messageId));
        
        if (newMessages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.messageId));
            const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.messageId));
            return [...prev, ...uniqueNewMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
          
          // Mark new messages from recipient as delivered
          const recipientMessages = newMessages.filter(msg => msg.senderId === recipientId);
          recipientMessages.forEach(async (msg) => {
            try {
              await messagingService.markMessageDelivered(msg.messageId);
            } catch (error) {
              console.debug('Failed to mark message as delivered:', error);
            }
          });
          
          // Show notification for new messages from recipient
          if (Notification.permission === 'granted' && document.hidden && recipientMessages.length > 0) {
            recipientMessages.forEach(msg => {
              const messageText = msg.decryptedMessage || msg.content || 
                                (msg.media?.length > 0 ? `📎 ${msg.media[0].type} file` : 'New message');
              
              new Notification(`${recipientDisplayName || recipientUsername}`, {
                body: messageText,
                icon: recipientAvatar || '/logo192.png',
                tag: msg.messageId
              });
            });
          }
          
          scrollToBottom();
        }
        
        // Mark messages as read when viewing conversation
        if (!document.hidden) {
          const unreadMessages = allMessages.filter(msg => 
            msg.senderId === recipientId && 
            !msg.readAt && 
            msg.status !== 'read'
          );
          
          unreadMessages.forEach(async (msg) => {
            try {
              await messagingService.markMessageRead(msg.messageId, true);
            } catch (error) {
              console.debug('Failed to mark message as read:', error);
            }
          });
        }
      } catch (error) {
        console.debug('Failed to poll messages:', error);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [recipientId, conversationId, recipientDisplayName, recipientUsername, recipientAvatar]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-options') && !event.target.closest('.message-options-btn')) {
        setShowMessageOptions(null);
      }
      if (!event.target.closest('.emoji-picker') && !event.target.closest('.input-action-btn')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!user?.userId || !recipientId) {
    return (
      <div className="message-interface">
        <div className="empty-state">
          <p>Select a user to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
      <div className="message-interface">
        <div className="messages-header">
          <div className="header-user">
            <div className="user-avatar">
              {recipientAvatar ? (
                <img alt={recipientDisplayName || recipientUsername} src={recipientAvatar} />
              ) : (
                <div className="avatar-placeholder">
                  {(recipientDisplayName || recipientUsername).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="user-names">
              <span className="display-name">{recipientDisplayName || recipientUsername}</span>
              {recipientDisplayName && (
                <span className="username">@{recipientUsername}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            <button className="action-btn" onClick={clearChat} title="Clear chat">
              <Trash2 size={18} />
            </button>
            <button 
              className={`action-btn ${isBlocked ? 'blocked' : ''}`} 
              onClick={toggleBlockUser} 
              title={isBlocked ? 'Unblock user' : 'Block user'}
            >
              <Shield size={18} />
              {isBlocked && <span className="blocked-indicator">✓</span>}
            </button>
          </div>
        </div>

        <div className="messages-content">
          {selectedFiles.length > 0 && (
            <div className="selected-files-preview">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="file-preview">
                  <div className="file-info">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        className="file-preview-thumb"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <span className="file-icon" style={{ fontSize: '24px' }}>
                        {getFileIcon(file)}
                      </span>
                    )}
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="remove-file-btn"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {messageRequests.length > 0 && (
            <div className="message-requests">
              <h4>Message Requests</h4>
              {messageRequests.filter(req => req.status === 'pending').map(request => (
                <div key={request.requestId} className="message-request">
                  <p>Message request from @{request.senderId}</p>
                  <div className="request-actions">
                    <button onClick={() => handleMessageRequest(request.requestId, 'accept')}>Accept</button>
                    <button onClick={() => handleMessageRequest(request.requestId, 'decline')}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {loading ? (
            <div className="loading-state">
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages yet. Send the first message!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.messageId} 
                className={`message ${message.senderId === user.userId ? 'sent' : 'received'} ${message.sending ? 'sending' : ''}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowMessageOptions(message.messageId);
                }}
              >
                <div className="message-bubble">
                  {message.media && message.media.length > 0 && (
                    <div className="message-media">
                      {message.media.map((m, idx) => (
                        <div key={idx} className="media-item">
                          {(m.type === 'image' || m.mimeType?.startsWith('image/') || m.type?.startsWith('image/')) ? (
                            <img 
                              src={m.url} 
                              alt={m.name || 'Image'} 
                              loading="lazy"
                              style={{ maxWidth: '300px', maxHeight: '300px', cursor: 'pointer', borderRadius: '8px' }}
                              onClick={() => openFullscreen(m.url, m.type || m.mimeType)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : (m.type === 'video' || m.mimeType?.startsWith('video/') || m.type?.startsWith('video/')) ? (
                            <div style={{ position: 'relative' }}>
                              <video 
                                src={m.url} 
                                controls 
                                preload="metadata"
                                style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px' }}
                                onClick={() => openFullscreen(m.url, m.type || m.mimeType)}
                              >
                                Your browser does not support video playback.
                              </video>
                            </div>
                          ) : (m.type === 'audio' || m.mimeType?.startsWith('audio/') || m.type?.startsWith('audio/')) ? (
                            <div className="audio-player" style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '24px' }}>🎵</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>{m.name || 'Audio'}</div>
                                <audio 
                                  src={m.url} 
                                  controls 
                                  preload="metadata"
                                  style={{ width: '100%', maxWidth: '250px', marginTop: '4px' }}
                                >
                                  Your browser does not support audio playback.
                                </audio>
                              </div>
                            </div>
                          ) : (m.type === 'gif' || m.mimeType === 'image/gif') ? (
                            <img 
                              src={m.url} 
                              alt={m.name || 'GIF'} 
                              loading="lazy"
                              style={{ maxWidth: '300px', maxHeight: '300px', cursor: 'pointer', borderRadius: '8px' }}
                              onClick={() => openFullscreen(m.url, m.type || m.mimeType)}
                            />
                          ) : (
                            <div className="document-preview" style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '300px' }}>
                              <span style={{ fontSize: '32px' }}>{getFileIcon(m)}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.name || 'Document'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  {formatFileSize(m.size)}
                                </div>
                              </div>
                              <a 
                                href={m.url} 
                                download={m.name} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ padding: '4px 8px', background: '#007bff', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '12px' }}
                              >
                                Download
                              </a>
                            </div>
                          )}
                          <div className="media-fallback" style={{ display: 'none' }}>
                            <a href={m.url} target="_blank" rel="noopener noreferrer">
                              📎 {m.name || 'Media file'}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(message.decryptedMessage || message.content) && (
                    <p className="message-text">
                      {message.deletedForBoth ? (
                        <em style={{ opacity: 0.7 }}>🚫 This message was deleted</em>
                      ) : (
                        message.decryptedMessage || message.content
                      )}
                    </p>
                  )}
                  <div className="message-footer">
                    <span className="message-time">
                      {formatTime(message.createdAt)}
                    </span>
                    {getMessageStatusIcon(message)}
                    {message.senderId === user.userId && !message.deletedForBoth && (
                      <button 
                        className="message-options-btn"
                        onClick={() => setShowMessageOptions(showMessageOptions === message.messageId ? null : message.messageId)}
                        title="Message options"
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>
                  {showMessageOptions === message.messageId && !message.deletedForBoth && (
                    <div className="message-options" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        deleteMessage(message.messageId, false);
                        setShowMessageOptions(null);
                      }}>
                        <Trash2 size={14} /> Delete for me
                      </button>
                      {message.senderId === user.userId && (
                        <button 
                          onClick={() => {
                            const messageAge = Date.now() - new Date(message.createdAt).getTime();
                            if (messageAge > 3600000) {
                              toast.error('Can only delete messages within 1 hour');
                              setShowMessageOptions(null);
                              return;
                            }
                            deleteMessage(message.messageId, true);
                            setShowMessageOptions(null);
                          }}
                          disabled={Date.now() - new Date(message.createdAt).getTime() > 3600000}
                        >
                          <AlertTriangle size={14} /> Delete for everyone
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="typing-text">{recipientDisplayName || recipientUsername} is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className="message-input" onSubmit={sendMessage}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files);
              
              // Validate file types and sizes
              const validFiles = files.filter(file => {
                // Check file type
                const allowedTypes = [
                  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                  'video/mp4', 'video/webm', 'video/ogg', 'video/mov',
                  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
                  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain', 'application/zip', 'application/x-zip-compressed'
                ];
                
                if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
                  toast.error(`${file.name} is not a supported file type`);
                  return false;
                }
                
                // Check file size
                const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : // 10MB for images
                               file.type.startsWith('video/') ? 100 * 1024 * 1024 : // 100MB for videos
                               file.type.startsWith('audio/') ? 20 * 1024 * 1024 : // 20MB for audio
                               20 * 1024 * 1024; // 20MB for documents
                
                if (file.size > maxSize) {
                  toast.error(`${file.name} is too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`);
                  return false;
                }
                return true;
              });
              
              if (validFiles.length > 0) {
                setSelectedFiles(prev => [...prev, ...validFiles]);
                toast.success(`${validFiles.length} file(s) selected`);
              }
            }}
          />
          <div className="input-actions">
            <button type="button" className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Add media">
              <Image size={18} />
            </button>
            <button 
              type="button" 
              className="input-action-btn" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              <Smile size={18} />
            </button>
          </div>
          
          {showEmojiPicker && (
            <div className="emoji-picker" style={{ position: 'absolute', bottom: '60px', left: '50px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500', color: '#666' }}>Emojis</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', marginBottom: '12px' }}>
                {['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '🚀'].map(emoji => (
                  <button key={emoji} onClick={() => addEmoji(emoji)} className="emoji-btn" style={{ padding: '6px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', borderRadius: '4px' }} onMouseOver={(e) => e.target.style.background = '#f0f0f0'} onMouseOut={(e) => e.target.style.background = 'none'}>
                    {emoji}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '500', color: '#666' }}>Popular GIFs</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {[
                  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                  'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
                  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
                ].map((gif, idx) => (
                  <img 
                    key={idx}
                    src={gif}
                    alt="GIF"
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      const file = { name: `gif-${idx}.gif`, type: 'image/gif', size: 1024000 };
                      setSelectedFiles(prev => [...prev, { ...file, url: gif }]);
                      setShowEmojiPicker(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() && selectedFiles.length === 0 || loading}
            className="send-button"
          >
            <Send size={18} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </>
  );
};

export default MessageInterface;