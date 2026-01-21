import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';

// Use centralized API config
const SOCKET_URL = API_CONFIG.SOCKET_URL;

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  // Initialize socket connection
  async connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true, // Force new connection
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('❌ Socket connection timeout');
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket connected! ID:', this.socket?.id);
        this.isConnected = true;
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Socket connection error:', error.message);
        reject(error);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join user to their personal room
  joinUserRoom(userId: number) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_user_room', userId);
      console.log(`👤 Joined user room: ${userId}`);
      
      // Verify by emitting again after a short delay (ensures backend received it)
      setTimeout(() => {
        if (this.socket && this.isConnected) {
          this.socket.emit('join_user_room', userId);
          console.log(`👤 Re-confirmed user room: ${userId}`);
        }
      }, 1000);
    } else {
      console.error(`❌ Cannot join user room - socket not connected. Connected: ${this.isConnected}`);
    }
  }

  // Join a specific chat room
  joinChat(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_chat', chatId);
      console.log(`💬 Joined chat: ${chatId}`);
      
      // Verify by emitting again after a short delay
      setTimeout(() => {
        if (this.socket && this.isConnected) {
          this.socket.emit('join_chat', chatId);
          console.log(`💬 Re-confirmed chat: ${chatId}`);
        }
      }, 1000);
    } else {
      console.error(`❌ Cannot join chat - socket not connected. Connected: ${this.isConnected}`);
    }
  }

  // Leave a chat room
  leaveChat(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_chat', chatId);
      console.log(`👋 Left chat: ${chatId}`);
    }
  }

  // Listen for new messages
  onMessageReceived(callback: (message: any) => void) {
    if (this.socket) {
      console.log('📡 Setting up message_received listener');
      this.socket.on('message_received', (message) => {
        console.log('🔔 message_received event fired!', message);
        callback(message);
      });
    } else {
      console.error('❌ Cannot set up listener - socket is null');
    }
  }

  // Remove message listener
  offMessageReceived() {
    if (this.socket) {
      this.socket.off('message_received');
    }
  }

  // Emit typing indicator
  startTyping(chatId: string, userInfo: { id: number; name: string }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { chatId, userInfo });
    }
  }

  stopTyping(chatId: string, userInfo: { id: number; name: string }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { chatId, userInfo });
    }
  }

  // Listen for typing indicators
  onUserTyping(callback: (userInfo: any) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStoppedTyping(callback: (userInfo: any) => void) {
    if (this.socket) {
      this.socket.on('user_stopped_typing', callback);
    }
  }

  // Listen for new chat creation
  onNewChatCreated(callback: (data: any) => void) {
    if (this.socket) {
      console.log('📡 Setting up new_chat_created listener');
      this.socket.on('new_chat_created', callback);
    }
  }

  // Remove new chat listener
  offNewChatCreated() {
    if (this.socket) {
      this.socket.off('new_chat_created');
    }
  }

  // Listen for chat deletion
  onChatDeleted(callback: (data: any) => void) {
    if (this.socket) {
      console.log('📡 Setting up chat_deleted listener');
      this.socket.on('chat_deleted', callback);
    }
  }

  // Remove chat deleted listener
  offChatDeleted() {
    if (this.socket) {
      this.socket.off('chat_deleted');
    }
  }

  // Listen for message deletion
  onMessageDeleted(callback: (data: { messageId: string; chatId: string }) => void) {
    if (this.socket) {
      console.log('📡 Setting up message_deleted listener');
      this.socket.on('message_deleted', callback);
    }
  }

  // Remove message deleted listener
  offMessageDeleted() {
    if (this.socket) {
      this.socket.off('message_deleted');
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
