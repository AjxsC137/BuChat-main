import api from './api';

class NotificationService {
  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.userId || user.id;
    } catch {
      return null;
    }
  }

  // Get Notifications
  async getNotifications(limit = 50) {
    try {
      const userId = this.getCurrentUserId();
      const response = await api.get(`/notifications?userId=${userId}&limit=${limit}`);
      return {
        notifications: response.data.notifications || [],
        unreadCount: response.data.unreadCount || 0
      };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return { notifications: [], unreadCount: 0 };
    }
  }

  // Mark Notification as Read
  async markNotificationRead(notificationId) {
    try {
      await api.put(`/notifications/${notificationId}/read`, {
        userId: this.getCurrentUserId()
      });
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  // Create Notification
  async createNotification(data) {
    try {
      const response = await api.post('/notifications', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Mark All Notifications as Read
  async markAllRead() {
    try {
      const { notifications } = await this.getNotifications();
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(n => this.markNotificationRead(n.notificationId))
      );
      
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }
}

export default new NotificationService();