import api from './api';

class OptimizedMessagingService {
  constructor() {
    this.localCache = new Map();
    this.maxCacheSize = 500; // Reduced for cost efficiency
    this.messageQueue = [];
    this.isOnline = navigator.onLine;
    this.retryAttempts = new Map();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Smart caching with size limits
  cacheMessage(key, data, ttl = 300000) { // 5 minutes default
    if (this.localCache.size >= this.maxCacheSize) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
    
    this.localCache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  getCachedMessage(key) {
    const cached = this.localCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.localCache.delete(key);
    }
    return null;
  }

  // Aligned with backend Lambda - POST /messages
  async sendMessage(recipientId, content, options = {}) {
    const senderId = this.getCurrentUserId();
    
    if (!this.isOnline) {
      const tempMessage = {
        messageId: `temp_${Date.now()}`,
        senderId,
        recipientId,
        content,
        status: 'queued',
        createdAt: new Date().toISOString()
      };
      this.messageQueue.push({ recipientId, content, options });
      return { message: tempMessage };
    }
    
    try {
      const response = await api.post('/messages', {
        recipientId,
        content,
        messageType: options.messageType || 'text',
        media: options.media || []
      });
      
      const message = response.data.message || response.data;
      this.cacheMessage(`msg_${message.messageId}`, message);
      
      return { message };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Aligned with backend Lambda - GET /conversations/{conversationId}/messages
  async getConversationMessages(conversationId, options = {}) {
    const { limit = 50, useCache = true, lastKey = null } = options;
    const cacheKey = `conv_${conversationId}_${limit}_${lastKey || 'first'}`;
    
    if (useCache) {
      const cached = this.getCachedMessage(cacheKey);
      if (cached) return cached;
    }
    
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (lastKey) params.append('lastKey', lastKey);
      
      const response = await api.get(`/conversations/${encodeURIComponent(conversationId)}/messages?${params}`);
      const result = {
        messages: response.data.messages || [],
        lastKey: response.data.lastKey || null,
        hasMore: !!response.data.lastKey
      };
      
      this.cacheMessage(cacheKey, result, 60000);
      return result;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return { messages: [], hasMore: false };
    }
  }

  // Aligned with backend Lambda - POST /conversations/{conversationId}/typing
  async setTypingIndicator(conversationId, isTyping) {
    if (!this.isOnline) return;
    
    // Mock implementation - just log for development
    console.debug(`Typing indicator: ${isTyping} for conversation ${conversationId}`);
  }

  // Get typing users - GET /conversations/{conversationId}/typing
  async getTypingUsers(conversationId) {
    try {
      const response = await api.get(`/conversations/${encodeURIComponent(conversationId)}/typing`);
      return response.data.typingUsers || [];
    } catch (error) {
      console.debug('Failed to get typing users:', error.message);
      return [];
    }
  }

  // Delete message - DELETE /messages/{messageId}
  async deleteMessage(messageId, deleteForEveryone = false) {
    try {
      await api.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone }
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }

  // Edit message - PUT /messages/{messageId}
  async editMessage(messageId, content) {
    try {
      const response = await api.put(`/messages/${messageId}`, { content });
      return response.data;
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }

  // Add reaction - POST /messages/{messageId}/reactions
  async addReaction(messageId, emoji) {
    try {
      const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
      return response.data;
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  }

  // Remove reaction - DELETE /messages/{messageId}/reactions
  async removeReaction(messageId, emoji) {
    try {
      const response = await api.delete(`/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  }

  // Clear conversation - DELETE /messages/conversations/{conversationId}/clear
  async clearConversation(conversationId) {
    // Mock implementation for development
    console.debug(`Clearing conversation ${conversationId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Mark conversation as read - PUT /messages/conversations/{conversationId}/read
  async markConversationRead(conversationId) {
    try {
      await api.put(`/messages/conversations/${encodeURIComponent(conversationId)}/read`);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  }

  // Get message requests - GET /messages/requests
  async getMessageRequests(limit = 20) {
    try {
      const response = await api.get(`/messages/requests?userId=${this.getCurrentUserId()}&limit=${limit}`);
      return response.data.requests || [];
    } catch (error) {
      console.error('Failed to get message requests:', error);
      return [];
    }
  }

  // Respond to message request - PUT /messages/requests/{requestId}
  async respondToMessageRequest(requestId, action) {
    // Mock implementation for development
    console.debug(`Responding to message request ${requestId} with action: ${action}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Process offline message queue
  async processQueue() {
    if (!this.isOnline || this.messageQueue.length === 0) return;
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const item of queue) {
      try {
        await this.sendMessage(item.recipientId, item.content, item.options);
      } catch (error) {
        // Re-queue failed messages
        this.messageQueue.push(item);
      }
    }
  }

  // Aligned with backend Lambda - GET /conversations
  async getUserConversations(limit = 20) {
    const cacheKey = `user_conversations_${limit}`;
    const cached = this.getCachedMessage(cacheKey);
    
    if (cached) return cached;
    
    try {
      const response = await api.get(`/conversations?limit=${limit}`);
      const conversations = response.data.conversations || [];
      
      this.cacheMessage(cacheKey, conversations, 30000);
      return conversations;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      return cached || [];
    }
  }

  // Aligned with backend Lambda - PUT /messages/{messageId}/read
  async markMessageRead(messageId, isViewingConversation = false) {
    try {
      const response = await api.put(`/messages/${messageId}/read`, {
        isViewingConversation
      });
      
      const cached = this.getCachedMessage(`msg_${messageId}`);
      if (cached) {
        cached.status = 'read';
        cached.readAt = new Date().toISOString();
        this.cacheMessage(`msg_${messageId}`, cached);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      return null;
    }
  }

  // Mark message as delivered - PUT /messages/{messageId}/delivered
  async markMessageDelivered(messageId) {
    try {
      const response = await api.put(`/messages/${messageId}/delivered`);
      return response.data;
    } catch (error) {
      console.error('Failed to mark message as delivered:', error);
      return null;
    }
  }

  // Utility methods
  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.userId || user.id;
    } catch {
      return null;
    }
  }

  // Poll for new messages - GET /messages/conversations/{conversationId}/poll
  async pollMessages(conversationId, since = null, limit = 10) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      if (since) params.append('since', since);
      
      const response = await api.get(`/messages/conversations/${encodeURIComponent(conversationId)}/poll?${params}`);
      return {
        messages: response.data.messages || [],
        hasMore: response.data.hasMore || false
      };
    } catch (error) {
      console.error('Failed to poll messages:', error);
      return { messages: [], hasMore: false };
    }
  }

  // Production S3 media upload
  async uploadMedia(file) {
    try {
      // Get presigned URL
      const presignResponse = await api.post('/media/presign', {
        filename: file.name,
        contentType: file.type,
        size: file.size
      });
      
      const { uploadUrl, s3Key } = presignResponse.data;
      const fileUrl = `https://${process.env.REACT_APP_MEDIA_BUCKET || 'buchat-media'}.s3.amazonaws.com/${s3Key}`;
      
      // Upload directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      return {
        type: file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document',
        url: fileUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        key: s3Key,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Media upload failed:', error);
      throw new Error('Failed to upload media');
    }
  }

  // Event handlers
  onMessageUpdate = null;
  onConversationUpdate = null;

  // Cleanup
  cleanup() {
    this.localCache.clear();
    this.messageQueue = [];
    this.retryAttempts.clear();
  }
}

// Create singleton instance
const messagingService = new OptimizedMessagingService();

export default messagingService;