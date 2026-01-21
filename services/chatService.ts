import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';

// Use centralized API config
const API_URL = API_CONFIG.BASE_URL;
console.log('🌐 Chat Service API_URL:', API_URL);

// Get auth token from AsyncStorage or cookies
const getAuthToken = async () => {
  try {
    // Try multiple possible token keys
    let token = await AsyncStorage.getItem('auth_token'); // Used by authService
    if (token) {
      console.log('✅ Token found in AsyncStorage (auth_token)');
      return token;
    }
    
    token = await AsyncStorage.getItem('authToken'); // Alternative key
    if (token) {
      console.log('✅ Token found in AsyncStorage (authToken)');
      return token;
    }
    
    // If no token in AsyncStorage, check if we have user data
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.token) {
        console.log('✅ Token found in user data');
        return user.token;
      }
    }
    
    console.warn('⚠️ No auth token found in AsyncStorage');
    return null;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

// Upload file to server
export const uploadChatFile = async (uri: string, fileName: string, mimeType: string) => {
  try {
    const token = await getAuthToken();
    console.log('📎 Uploading file:', { uri, fileName, mimeType });

    // For React Native, we need to ensure the URI is in the correct format
    // On iOS, it might be prefixed with 'file://', on Android it might be 'content://'
    let fileUri = uri;
    
    // If it's a local file path without scheme, add file://
    if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('http')) {
      fileUri = `file://${uri}`;
    }

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType || 'image/jpeg',
    } as any);

    const response = await fetch(`${API_URL}/chat/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // Don't set Content-Type, let fetch set it with the boundary for FormData
      },
      body: formData,
    });

    console.log('📡 Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload error response:', errorText);
      throw new Error(`Failed to upload file (${response.status})`);
    }

    const data = await response.json();
    console.log('✅ File uploaded successfully:', data);

    if (data.success) {
      return {
        url: data.file.url,
        name: data.file.name,
        size: data.file.size,
        type: data.file.type, // 'IMAGE' or 'DOCUMENT'
        mimetype: data.file.mimetype,
      };
    } else {
      throw new Error(data.message || 'Failed to upload file');
    }
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

// Get all users for starting new chats
export const getAllUsers = async () => {
  try {
    const token = await getAuthToken();
    const url = `${API_URL}/chat/users`;
    console.log('🔍 Fetching all users from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear it and redirect to login
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        throw new Error('Token expired, please login again');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📊 Users response:', data);

    if (data.success) {
      console.log(`✅ Loaded ${data.users.length} users for contacts`);
      return data.users;
    } else {
      throw new Error(data.message || 'Failed to fetch users');
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

// Get all chats for the user
export const getUserChats = async () => {
  try {
    // Check if user is logged in first
    const userData = await AsyncStorage.getItem('user');
    if (!userData) {
      console.log('❌ User not logged in, skipping getUserChats');
      return [];
    }

    const token = await getAuthToken();
    if (!token) {
      console.log('❌ No auth token found');
      return [];
    }

    const url = `${API_URL}/chat`;
    console.log('🔍 Fetching chats from:', url);
    console.log('🔑 Token:', token ? 'present' : 'missing');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear it and redirect to login
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        throw new Error('Token expired, please login again');
      }
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error('Failed to fetch chats');
    }

    const data = await response.json();
    return data.chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
};

// Get messages for a specific chat
export const getChatMessages = async (chatId: string, page = 1, limit = 50) => {
  try {
    const token = await getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/chat/${chatId}?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include', // Include cookies
    });

    console.log('📡 getChatMessages response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ getChatMessages error response:', errorText.substring(0, 200));
      
      // Check if it's a deleted chat
      if (response.status === 403 || response.status === 404) {
        const error: any = new Error('Chat not found or access denied');
        error.status = response.status;
        throw error;
      }
      
      throw new Error(`Failed to fetch messages (${response.status})`);
    }

    const data = await response.json();
    return data.chat;
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    // Preserve status code in error
    if (error.status) {
      const enhancedError: any = new Error(error.message);
      enhancedError.status = error.status;
      throw enhancedError;
    }
    throw error;
  }
};

// Send a message
export const sendMessage = async (
  chatId: string,
  content: string,
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' = 'TEXT',
  attachmentUrl?: string,
  attachmentName?: string,
  attachmentSize?: number
) => {
  try {
    const token = await getAuthToken();
    console.log('🚀 Sending message to API:', { 
      url: `${API_URL}/chat/message`,
      chatId, 
      content, 
      messageType,
      hasToken: !!token 
    });
    
    const requestBody = {
      chatId,
      content,
      messageType,
      attachmentUrl,
      attachmentName,
      attachmentSize,
    };
    
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: headers,
      credentials: 'include', // Important: include cookies
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📩 API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ API Error:', data);
      throw new Error(data.message || 'Failed to send message');
    }

    return data.message;
  } catch (error: any) {
    console.error('❌ Error sending message:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (messageIds: string[]) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/chat/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageIds,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Create a new chat
export const createChat = async (
  type: 'PERSONAL' | 'GROUP',
  participantIds: { userId: string; userType: 'CUSTOMER' | 'EMPLOYEE' }[],
  name?: string
) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        participantIds,
        name,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    const data = await response.json();
    return data.chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};
// Delete a message
export const deleteMessage = async (messageId: string) => {
  try {
    const token = await getAuthToken();
    console.log('🗑️ Deleting message:', messageId);
    
    const response = await fetch(`${API_URL}/chat/message/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('🗑️ Delete response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete message');
    }

    return data;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};