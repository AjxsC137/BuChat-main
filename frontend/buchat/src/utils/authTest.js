import api from '../services/api';

export const testAuthentication = async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  console.log('=== Authentication Test ===');
  console.log('Token exists:', !!token);
  console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
  console.log('User exists:', !!user.userId);
  console.log('User ID:', user.userId);
  console.log('Username:', user.username);
  
  if (!token) {
    console.error('❌ No authentication token found');
    return false;
  }
  
  if (!user.userId) {
    console.error('❌ No user ID found');
    return false;
  }
  
  try {
    // Test a simple authenticated endpoint
    console.log('Testing API call...');
    const response = await api.get(`/messages/requests?userId=${user.userId}`);
    console.log('✅ API call successful:', response.status);
    return true;
  } catch (error) {
    console.error('❌ API call failed:', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
};

export const debugMessageSend = async (recipientId, message) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  console.log('=== Message Send Debug ===');
  console.log('Sender ID:', user.userId);
  console.log('Recipient ID:', recipientId);
  console.log('Message:', message);
  console.log('Token exists:', !!token);
  
  if (!token || !user.userId) {
    console.error('❌ Missing authentication');
    return false;
  }
  
  try {
    const response = await api.post('/messages', {
      senderId: user.userId,
      recipientId,
      encryptedMessage: message,
      media: []
    });
    console.log('✅ Message sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Message send failed:', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.authTest = testAuthentication;
  window.debugMessageSend = debugMessageSend;
}