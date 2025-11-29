import api from './api';
import { API_ENDPOINTS } from '../config/api';

export const commentService = {
  // Create comment
  createComment: async (postId, commentData) => {
    const response = await api.post(API_ENDPOINTS.CREATE_COMMENT(postId), commentData);
    return response.data;
  },

  // Get post comments
  getPostComments: async (postId, params = {}) => {
    const response = await api.get(API_ENDPOINTS.POST_COMMENTS(postId), { params });
    return response.data;
  },

  // Get single comment
  getComment: async (commentId) => {
    const response = await api.get(API_ENDPOINTS.COMMENT_BY_ID(commentId));
    return response.data;
  },

  // Update comment
  updateComment: async (commentId, commentData) => {
    const response = await api.put(API_ENDPOINTS.COMMENT_BY_ID(commentId), commentData);
    return response.data;
  },

  // Delete comment
  deleteComment: async (commentId, userId) => {
    const response = await api.delete(API_ENDPOINTS.COMMENT_BY_ID(commentId), {
      data: { userId }
    });
    return response.data;
  },

  // Vote on comment
  voteComment: async (commentId, userId, vote) => {
    const response = await api.post(API_ENDPOINTS.VOTE_COMMENT(commentId), {
      userId,
      vote // 1, -1, or 0
    });
    return response.data;
  },

  // Get comment sentiment (AI)
  getCommentSentiment: async (commentId) => {
    const response = await api.get(API_ENDPOINTS.COMMENT_SENTIMENT(commentId));
    return response.data;
  },

  // Analyze toxicity (AI)
  analyzeToxicity: async (commentId) => {
    const response = await api.post(API_ENDPOINTS.ANALYZE_TOXICITY(commentId));
    return response.data;
  },

  // Report comment
  reportComment: async (commentId, reportData) => {
    const response = await api.post(API_ENDPOINTS.REPORT_COMMENT(commentId), reportData);
    return response.data;
  }
};
