import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  StatusBar,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useContacts, ChatType, Contact } from '@/contexts/ContactsContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { sendMessage as sendMessageAPI, getChatMessages, createChat as createChatAPI, uploadChatFile, deleteMessage as deleteMessageAPI } from '@/services/chatService';
import socketService from '@/services/socketService';
import notificationService from '@/services/notificationService';
import { API_CONFIG } from '@/config/api';

// Helper to get full URL for chat attachments
const getChatAttachmentUrl = (uri: string): string => {
  if (!uri) return '';
  // If already a full URL, return as is
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  // If it's a local file URI (file:// or content://), return as is
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  // Otherwise, prepend the socket URL (base URL without /api)
  // API_CONFIG.SOCKET_URL is the base without /api
  return `${API_CONFIG.SOCKET_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
};

interface Chat {
  id: string;
  name: string;
  type: 'PERSONAL' | 'GROUP';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  participantCount?: number;
}

interface Message {
  id: string;
  content: string;
  senderId: number;
  senderName: string;
  senderType?: 'CUSTOMER' | 'EMPLOYEE'; // Add sender type
  timestamp: string;
  isOwnMessage: boolean;
  isSending?: boolean; // New: indicates message is being sent
  sendFailed?: boolean; // New: indicates message failed to send
  attachment?: {
    type: 'image' | 'document';
    uri: string;
    name: string;
    size?: number;
  };
}

export default function ChatScreen() {
  const { state } = useApp();
  const { chats, isLoadingChats, contacts, loadChatsFromBackend, deleteChat } = useContacts();
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [creatingChatText, setCreatingChatText] = useState('Creating chat...');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  
  // Pagination state for messages
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const MESSAGES_PER_PAGE = 20;
  
  // Store current user ID in a ref (persists across renders, set once from AsyncStorage)
  const currentUserIdRef = useRef<number | null>(null);
  
  // Track when we're creating a chat to prevent socket event interference
  const creatingChatIdRef = useRef<string | null>(null);
  
  // Keep latest chats in ref for callbacks
  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);
  
  // Socket connection status
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Store messages organized by chat ID
  const [messagesByChat, setMessagesByChat] = useState<{ [chatId: string]: Message[] }>({});
  
  // Store chat metadata (last message, time, unread count)
  const [chatMetadata, setChatMetadata] = useState<{
    [chatId: string]: {
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
    };
  }>({});

  // Get messages for the currently selected chat
  const currentMessages = selectedChat ? (messagesByChat[selectedChat.id] || []) : [];
  
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  


  // Filter chats based on search query and sort (GROUP chats first)
  const filteredChats = chats
    .filter(chat => {
      const chatName = chat.type === 'GROUP' ? chat.name : chat.contact.name;
      return chatName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Group chats always come first
      if (a.type === 'GROUP' && b.type !== 'GROUP') return -1;
      if (a.type !== 'GROUP' && b.type === 'GROUP') return 1;
      
      // For same type, maintain order (or sort by name if needed)
      return 0;
    });

  // Initialize Socket.IO connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        console.log('🔌 Initializing Socket.IO...');
        const socket = await socketService.connect();
        console.log('✅ Socket connection established, socket exists:', !!socket);
        
        // Initialize notification service
        await notificationService.initialize();
        console.log('🔔 Notification service initialized');
        
        // Get and store current user ID once (from multiple sources)
        let userId: number | null = null;
        
        // Try state.user first (most reliable in Expo Go)
        if (state.user?.id) {
          userId = typeof state.user.id === 'number' ? state.user.id : parseInt(String(state.user.id));
          console.log('👤 Got user ID from state.user:', userId);
        }
        
        // Fallback to AsyncStorage if needed
        if (!userId) {
          try {
            const userDataStr = await AsyncStorage.getItem('user');
            console.log('🔑 AsyncStorage raw:', userDataStr);
            const userData = userDataStr ? JSON.parse(userDataStr) : null;
            if (userData?.id) {
              userId = typeof userData.id === 'number' ? userData.id : parseInt(String(userData.id));
              console.log('👤 Got user ID from AsyncStorage:', userId);
            }
          } catch (e) {
            console.error('❌ AsyncStorage error:', e);
          }
        }

        // Wait a bit for connection to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isConnected = socketService.isSocketConnected();
        console.log('🔍 Socket connected status:', isConnected);
        setSocketConnected(!!isConnected);
        
        if (!isConnected) {
          Alert.alert(
            'Connection Issue', 
            `Socket.IO is not connected for user ${userId || 'unknown'}. Messages may not appear in real-time. Please close and reopen the app.`,
            [{ text: 'OK' }]
          );
        }
        
        if (userId) {
          currentUserIdRef.current = userId;
          console.log('✅ Stored user ID in ref:', currentUserIdRef.current);
          console.log('🆔 DEVICE IDENTITY: This device is user ID:', userId);
          console.log('👤 User name:', state.user?.name || 'Unknown');
          
          // Join user room with retry logic
          const joinUserRoom = () => {
            socketService.joinUserRoom(userId);
            console.log(`🔄 Attempting to join user room: ${userId}`);
          };
          
          // Join immediately
          joinUserRoom();
          
          // Retry after 2 seconds to ensure it's registered
          setTimeout(joinUserRoom, 2000);
          
          // Retry after 4 seconds as final backup
          setTimeout(joinUserRoom, 4000);
        } else {
          console.error('❌ No user ID found! state.user:', state.user);
        }

        // Listen for incoming messages
        socketService.onMessageReceived(async (receivedMessage) => {
          try {
            console.log('📩 Real-time message received:', receivedMessage);
            
            // Use the ref for currentUserId
            const currentUserIdNum = currentUserIdRef.current || 0;
            const receivedSenderIdNum = typeof receivedMessage.senderId === 'number' 
              ? receivedMessage.senderId 
              : parseInt(String(receivedMessage.senderId || '0'));
            
            console.log('🆔 MESSAGE RECEIVED ON DEVICE USER ID:', currentUserIdNum);
            console.log('📨 MESSAGE SENT FROM USER ID:', receivedSenderIdNum);
            console.log('🔍 Checking sender:', {
              receivedSenderId: receivedMessage.senderId,
              currentUserId: currentUserIdNum,
              areEqual: receivedSenderIdNum === currentUserIdNum,
              refValue: currentUserIdRef.current
            });
          
          const isOwnMessage = receivedSenderIdNum === currentUserIdNum && currentUserIdNum !== 0;
          
          console.log('🏷️ Badge logic:', {
            isOwnMessage,
            willUpdateMetadata: !isOwnMessage,
            chatId: receivedMessage.chatId,
            selectedChatId: selectedChat?.id,
            isCurrentChat: selectedChat?.id === receivedMessage.chatId
          });
          
          // Update chat metadata for list view (Instagram-style)
          // BUT: Don't update metadata if it's our own message (already updated in handleSendMessage)
          if (!isOwnMessage) {
            setChatMetadata(prev => {
              const existing = prev[receivedMessage.chatId] || { lastMessage: '', lastMessageTime: '', unreadCount: 0 };
              const isCurrentChat = selectedChat?.id === receivedMessage.chatId;
              const newUnreadCount = isCurrentChat ? 0 : existing.unreadCount + 1;
              
              console.log('📊 Updating metadata (INCLUDING ALL CHAT):', {
                chatId: receivedMessage.chatId,
                isCurrentChat,
                existingUnread: existing.unreadCount,
                newUnreadCount,
                willShowBadge: newUnreadCount > 0
              });
              
              return {
                ...prev,
                [receivedMessage.chatId]: {
                  lastMessage: receivedMessage.content,
                  lastMessageTime: new Date(receivedMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  // Only increment unread if we're NOT currently viewing this chat
                  unreadCount: newUnreadCount
                }
              };
            });
          } else {
            console.log('⏭️ Skipping metadata update (own message)');
          }
          
          // Skip adding to messagesByChat if it's our own message (already handled by optimistic UI)
          if (isOwnMessage) {
            console.log('⏭️ Skipping own message from Socket.IO (already in optimistic UI)');
            return;
          }
          
          // Show notification for incoming message
          const chatForNotification = chatsRef.current.find(c => c.id === receivedMessage.chatId);
          const chatName = chatForNotification?.type === 'GROUP' ? chatForNotification.name : undefined;
          await notificationService.showChatNotification(
            receivedMessage.senderName || 'Someone',
            receivedMessage.content,
            receivedMessage.chatId,
            chatName
          );
          
          // Add message to the appropriate chat
          setMessagesByChat(prev => {
            const chatMessages = prev[receivedMessage.chatId] || [];
            
            // Check if message already exists by ID (avoid duplicates from Socket.IO)
            const messageExistsById = chatMessages.some(msg => msg.id === receivedMessage.id);
            if (messageExistsById) {
              console.log('⚠️ Message already exists by ID, skipping');
              return prev;
            }
            
            // Check if this is a duplicate of our optimistic message
            // (same content, same sender, within last 5 seconds)
            const recentOwnMessage = chatMessages.find(msg => 
              msg.isOwnMessage && 
              msg.content === receivedMessage.content &&
              msg.id.startsWith('temp-')
            );
            
            if (recentOwnMessage) {
              console.log('⚠️ This is our own optimistic message, skipping Socket.IO version');
              return prev;
            }

            // Format the message
            const formattedMessage: Message = {
              id: receivedMessage.id,
              content: receivedMessage.content,
              senderId: receivedMessage.senderId,
              senderName: receivedMessage.senderName,
              senderType: receivedMessage.senderType, // Capture senderType from Socket.IO
              timestamp: new Date(receivedMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOwnMessage: false, // It's from another user
              isSending: false,
              sendFailed: false,
            };

            return {
              ...prev,
              [receivedMessage.chatId]: [...chatMessages, formattedMessage]
            };
          });

          // Auto-scroll to newest message if we're viewing this chat (inverted list)
          if (selectedChat?.id === receivedMessage.chatId) {
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 300); // Increased timeout to ensure render completes
          }
          } catch (error) {
            console.error('❌ Error processing message:', error);
          }
        });

        // Listen for new chat creation
        socketService.onNewChatCreated(async (data) => {
          console.log('🆕 New chat created event received:', data);
          
          // If we're manually creating this chat, skip this handler
          if (creatingChatIdRef.current === data.chatId) {
            console.log('⏭️ Skipping socket handler - manually creating this chat');
            return;
          }
          
          // Reload chats from backend to include the new chat
          await loadChatsFromBackend();
          
          // Join the new chat room
          socketService.joinChat(data.chatId);
          console.log('💬 Joined newly created chat room:', data.chatId);
        });

        // Listen for chat deletion
        socketService.onChatDeleted(async (data) => {
          console.log('🗑️ Chat deleted event received:', data.chatId);
          
          // If the deleted chat is currently selected, close it
          if (selectedChat?.id === data.chatId) {
            setSelectedChat(null);
            notificationService.setCurrentChatId(null);
            Alert.alert(
              'Chat Deleted',
              'This chat has been deleted by the other user.'
            );
          }
          
          // Reload chats from backend to remove the deleted chat
          await loadChatsFromBackend();
          
          // Clear messages and metadata
          setMessagesByChat(prev => {
            const newState = { ...prev };
            delete newState[data.chatId];
            return newState;
          });
          
          setChatMetadata(prev => {
            const newState = { ...prev };
            delete newState[data.chatId];
            return newState;
          });
        });

        // Listen for message deletion
        socketService.onMessageDeleted((data) => {
          console.log('🗑️ Message deleted event received:', data);
          
          // Remove message from the chat
          setMessagesByChat(prev => ({
            ...prev,
            [data.chatId]: (prev[data.chatId] || []).filter(msg => msg.id !== data.messageId)
          }));
        });

      } catch (error) {
        console.error('Socket initialization failed:', error);
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up Socket.IO...');
      socketService.offMessageReceived();
      socketService.offNewChatCreated();
      socketService.offChatDeleted();
      socketService.offMessageDeleted();
      socketService.disconnect();
      notificationService.cleanup(); // Cleanup notification listeners
    };
  }, [state.user]);



  // Join ALL chat rooms AFTER socket is connected (Instagram-style: receive messages from all chats)
  useEffect(() => {
    // Only join if socket is connected AND we have chats
    if (socketConnected && chats.length > 0) {
      console.log('🌐 Joining all chat rooms for real-time updates...');
      
      // Small delay to ensure socket is fully ready
      setTimeout(() => {
        chats.forEach(chat => {
          socketService.joinChat(chat.id);
          const chatName = chat.type === 'GROUP' ? (chat as any).name : 'Personal Chat';
          console.log(`  ✅ Joined: ${chatName} (${chat.id})`);
        });
      }, 500);

      // Initialize metadata for existing chats
      const initialMetadata: { [key: string]: { lastMessage: string; lastMessageTime: string; unreadCount: number } } = {};
      chats.forEach(chat => {
        // Check if chat has messages property (from backend response)
        const chatWithMessages = chat as any;
        if (chatWithMessages.messages && chatWithMessages.messages.length > 0) {
          const lastMsg = chatWithMessages.messages[0];
          initialMetadata[chat.id] = {
            lastMessage: lastMsg.content,
            lastMessageTime: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: 0 // Will be updated by backend unread count
          };
        }
      });
      setChatMetadata(prev => ({ ...initialMetadata, ...prev }));

      return () => {
        console.log('🌐 Leaving all chat rooms...');
        chats.forEach(chat => {
          socketService.leaveChat(chat.id);
        });
      };
    }
  }, [chats.length, socketConnected]); // Re-run when socket connects OR chats change

  // Auto-scroll when messages change for the selected chat (inverted list)
  useEffect(() => {
    if (selectedChat && messagesByChat[selectedChat.id]?.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 200);
    }
  }, [messagesByChat, selectedChat]);

  // Auto-select first chat and load messages
  useEffect(() => {
    if (chats.length > 0 && !selectedChat) {
      handleChatSelect(chats[0]);
    }
  }, [chats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload current chat messages
      if (selectedChat) {
        await handleChatSelect(selectedChat);
      }
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    // Create optimistic message (shown immediately)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: typeof state.user?.id === 'number' ? state.user.id : parseInt(state.user?.id || '0'),
      senderName: state.user?.name || 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwnMessage: true,
      isSending: true, // Show "sending" indicator
      sendFailed: false,
    };

    // Add optimistic message immediately
    setMessagesByChat(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), optimisticMessage]
    }));

    // Update chatMetadata for list view
    console.log('📤 handleSendMessage: Updating metadata with unreadCount: 0');
    setChatMetadata(prev => ({
      ...prev,
      [selectedChat.id]: {
        lastMessage: messageContent,
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0 // Our own messages don't count as unread
      }
    }));

    // Scroll to newest message (inverted list)
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);

    try {
      console.log('📤 Sending message:', { chatId: selectedChat.id, content: messageContent });
      
      // Send message to backend
      const sentMessage = await sendMessageAPI(selectedChat.id, messageContent);
      
      console.log('✅ Message sent successfully:', sentMessage);

      // Replace optimistic message with real message
      setMessagesByChat(prev => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map(msg => 
          msg.id === tempId ? {
            id: sentMessage.id,
            content: sentMessage.content,
            senderId: sentMessage.senderId,
            senderName: sentMessage.senderName,
            senderType: sentMessage.senderType, // Capture senderType from backend
            timestamp: new Date(sentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwnMessage: sentMessage.isOwnMessage,
            isSending: false,
            sendFailed: false,
          } : msg
        )
      }));
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      
      // Check if chat was deleted
      if (error?.status === 403 || error?.status === 404 ||
          error?.message?.includes('not found') || error?.message?.includes('not a participant')) {
        console.log('⚠️ Chat was deleted, removing from list');
        
        // Remove failed message
        setMessagesByChat(prev => ({
          ...prev,
          [selectedChat.id]: (prev[selectedChat.id] || []).filter(msg => msg.id !== tempId)
        }));
        
        Alert.alert(
          'Chat Unavailable',
          'This chat has been deleted or is no longer available.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Reload chats to get updated list
                await loadChatsFromBackend();
                setSelectedChat(null);
                notificationService.setCurrentChatId(null);
              }
            }
          ]
        );
        return;
      }
      
      // Mark message as failed
      setMessagesByChat(prev => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map(msg => 
          msg.id === tempId ? {
            ...msg,
            isSending: false,
            sendFailed: true,
          } : msg
        )
      }));
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    if (!selectedChat) return;

    const failedMessage = messagesByChat[selectedChat.id]?.find(msg => msg.id === messageId);
    if (!failedMessage) return;

    // Mark as sending again
    setMessagesByChat(prev => ({
      ...prev,
      [selectedChat.id]: (prev[selectedChat.id] || []).map(msg => 
        msg.id === messageId ? { ...msg, isSending: true, sendFailed: false } : msg
      )
    }));

    try {
      console.log('🔄 Retrying message:', failedMessage.content);
      const sentMessage = await sendMessageAPI(selectedChat.id, failedMessage.content);
      
      // Replace with successful message
      setMessagesByChat(prev => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map(msg => 
          msg.id === messageId ? {
            id: sentMessage.id,
            content: sentMessage.content,
            senderId: sentMessage.senderId,
            senderName: sentMessage.senderName,
            timestamp: new Date(sentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwnMessage: sentMessage.isOwnMessage,
            isSending: false,
            sendFailed: false,
          } : msg
        )
      }));
    } catch (error) {
      console.error('❌ Retry failed:', error);
      // Mark as failed again
      setMessagesByChat(prev => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map(msg => 
          msg.id === messageId ? { ...msg, isSending: false, sendFailed: true } : msg
        )
      }));
    }
  };

  const handleChatSelect = async (chat: ChatType) => {
    setSelectedChat(chat);
    notificationService.setCurrentChatId(chat.id); // Track current chat for notifications
    setLoadingMessages(true);
    
    // Reset pagination state for new chat
    setCurrentPage(1);
    setHasMoreMessages(true);
    
    // Clear unread count for this chat (Instagram-style)
    setChatMetadata(prev => ({
      ...prev,
      [chat.id]: {
        ...prev[chat.id],
        unreadCount: 0
      }
    }));
    
    // Load messages from backend (first page)
    try {
      console.log('📥 Loading messages for chat:', chat.id);
      const chatData = await getChatMessages(chat.id, 1, MESSAGES_PER_PAGE);
      
      // Convert backend messages to frontend format
      const messages: Message[] = chatData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderType: msg.senderType, // Capture senderType from backend
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwnMessage: msg.isOwnMessage,
        isSending: false,
        sendFailed: false,
        attachment: msg.attachmentUrl ? {
          type: msg.messageType === 'IMAGE' ? 'image' : 'document',
          uri: msg.attachmentUrl,
          name: msg.attachmentName,
          size: msg.attachmentSize,
        } : undefined,
      }));

      setMessagesByChat(prev => ({
        ...prev,
        [chat.id]: messages
      }));
      
      // Check if there are more messages to load
      setHasMoreMessages(messages.length >= MESSAGES_PER_PAGE);
      
      console.log('✅ Messages loaded:', messages.length, 'hasMore:', messages.length >= MESSAGES_PER_PAGE);
    } catch (error: any) {
      console.error('❌ Failed to load messages:', error);
      
      // Check if chat was deleted (403 or 404 error)
      if (error?.status === 403 || error?.status === 404 || 
          error?.message?.includes('not found') || error?.message?.includes('not a participant')) {
        console.log('⚠️ Chat was deleted by other user, removing from list');
        Alert.alert(
          'Chat Unavailable',
          'This chat has been deleted or is no longer available.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Reload chats to get updated list
                await loadChatsFromBackend();
                setSelectedChat(null);
                notificationService.setCurrentChatId(null);
              }
            }
          ]
        );
      } else {
        // Initialize with empty array for other errors
        setMessagesByChat(prev => ({
          ...prev,
          [chat.id]: []
        }));
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load more messages when scrolling up (pagination)
  const loadMoreMessages = async () => {
    if (!selectedChat || loadingMoreMessages || !hasMoreMessages) {
      return;
    }

    setLoadingMoreMessages(true);
    const nextPage = currentPage + 1;

    try {
      console.log('📥 Loading more messages, page:', nextPage);
      const chatData = await getChatMessages(selectedChat.id, nextPage, MESSAGES_PER_PAGE);
      
      const newMessages: Message[] = chatData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderType: msg.senderType,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwnMessage: msg.isOwnMessage,
        isSending: false,
        sendFailed: false,
        attachment: msg.attachmentUrl ? {
          type: msg.messageType === 'IMAGE' ? 'image' : 'document',
          uri: msg.attachmentUrl,
          name: msg.attachmentName,
          size: msg.attachmentSize,
        } : undefined,
      }));

      if (newMessages.length > 0) {
        // Prepend older messages to the beginning
        setMessagesByChat(prev => ({
          ...prev,
          [selectedChat.id]: [...newMessages, ...(prev[selectedChat.id] || [])]
        }));
        setCurrentPage(nextPage);
      }

      // Check if there are more messages
      setHasMoreMessages(newMessages.length >= MESSAGES_PER_PAGE);
      console.log('✅ Loaded', newMessages.length, 'more messages, hasMore:', newMessages.length >= MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('❌ Failed to load more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  const handleCreatePersonalChat = async (contact: Contact) => {
    setCreatingChat(true);
    setCreatingChatText('Creating chat...');
    try {
      console.log('📤 Creating personal chat with:', contact.name, 'ID:', contact.id);
      
      // Check if chat already exists
      const existingChat = chats.find(
        chat => chat.type === 'PERSONAL' && chat.contact.id === contact.id
      );
      
      if (existingChat) {
        console.log('✅ Chat already exists, opening...');
        setShowNewChatModal(false);
        setNewChatSearchQuery('');
        setCreatingChat(false);
        setSelectedChat(existingChat);
        return;
      }
      
      // Use contact's userType if available, otherwise determine from email
      const userType = contact.userType || 
        (contact.phone?.includes('@gmail.com') || contact.phone?.includes('@test.com') ? 'CUSTOMER' : 'EMPLOYEE');
      
      // Convert contact ID to number
      const contactIdNum = parseInt(contact.id, 10);
      
      console.log('🔑 Creating chat with userId:', contactIdNum, 'userType:', userType);
      
      // Create new personal chat
      const newChat = await createChatAPI('PERSONAL', [
        { userId: contactIdNum.toString(), userType: userType as 'CUSTOMER' | 'EMPLOYEE' }
      ]);
      
      console.log('✅ Personal chat created:', newChat);
      
      // Mark this chat ID to prevent socket event interference
      creatingChatIdRef.current = newChat.id;
      
      // Update loading text
      setCreatingChatText(`Opening chat with ${contact.name}...`);
      
      // Reload chats to get the new chat with full details
      await loadChatsFromBackend();
      
      // Wait briefly for React to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Find and open the newly created chat
      let latestChats = chatsRef.current;
      let createdChat = latestChats.find(c => c.id === newChat.id);
      
      if (!createdChat) {
        console.warn('⚠️ Created chat not found in list, trying again...');
        setCreatingChatText('Loading chat details...');
        // Retry loading
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadChatsFromBackend();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        latestChats = chatsRef.current;
        createdChat = latestChats.find(c => c.id === newChat.id);
      }
      
      // Close modal and navigate
      setShowNewChatModal(false);
      setNewChatSearchQuery('');
      setCreatingChat(false);
      
      if (createdChat) {
        console.log('✅ Opening newly created chat with:', createdChat.type === 'PERSONAL' ? createdChat.contact.name : createdChat.name);
        setSelectedChat(createdChat);
      } else {
        Alert.alert('Success', `Chat created with ${contact.name}. Tap on the chat to open it.`);
      }
      
      // Clear the ref after done
      setTimeout(() => {
        creatingChatIdRef.current = null;
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to create personal chat:', error);
      setCreatingChat(false);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    }
  };

  // Handle long press to delete message
  const handleMessageLongPress = (message: Message) => {
    // Only allow deletion of own messages
    if (!message.isOwnMessage) {
      return;
    }

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteMessage(message.id),
        },
      ]
    );
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat) return;

    try {
      console.log('🗑️ Deleting message:', messageId);
      
      // Optimistically remove from UI
      setMessagesByChat(prev => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).filter(msg => msg.id !== messageId)
      }));

      // Call API to delete
      await deleteMessageAPI(messageId);
      
      console.log('✅ Message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      
      // Restore message on error - reload messages
      try {
        const chatData = await getChatMessages(selectedChat.id);
        const messages: Message[] = chatData.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderType: msg.senderType,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwnMessage: msg.isOwnMessage,
          attachment: msg.attachmentUrl ? {
            type: msg.messageType === 'IMAGE' ? 'image' : 'document',
            uri: msg.attachmentUrl,
            name: msg.attachmentName,
            size: msg.attachmentSize,
          } : undefined,
        }));
        setMessagesByChat(prev => ({
          ...prev,
          [selectedChat.id]: messages
        }));
      } catch (reloadError) {
        console.error('Failed to reload messages:', reloadError);
      }
      
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    }
  };

  const handleSenderNameClick = async (senderId: number, senderName: string, senderType?: 'CUSTOMER' | 'EMPLOYEE') => {
    try {
      // Don't create chat with yourself
      const currentUserId = typeof state.user?.id === 'number' ? state.user.id : parseInt(state.user?.id || '0');
      if (senderId === currentUserId) {
        console.log('⚠️ Cannot create chat with yourself');
        return;
      }

      console.log('📤 Creating personal chat with:', senderName, 'ID:', senderId);
      console.log('🔍 Current user ID:', currentUserId);
      console.log('🔍 Target user ID:', senderId);
      console.log('🔍 Sender type from message:', senderType);
      
      // Check if chat already exists
      const existingChat = chats.find(
        chat => chat.type === 'PERSONAL' && parseInt(chat.contact.id) === senderId
      );
      
      if (existingChat) {
        console.log('✅ Chat already exists, opening...');
        setSelectedChat(existingChat);
        return;
      }
      
      // Find contact in the contacts list
      const contact = contacts.find(c => parseInt(c.id) === senderId);
      if (!contact) {
        console.error('❌ User not found in contacts. senderId:', senderId);
        console.log('📋 Available contacts:', contacts.map(c => ({ id: c.id, name: c.name })));
        Alert.alert('Error', 'User not found in contacts');
        return;
      }
      
      console.log('✅ Found contact:', { 
        id: contact.id, 
        name: contact.name, 
        phone: contact.phone,
        userType: contact.userType 
      });
      
      // Priority order for determining userType:
      // 1. contact.userType (from participant data - most reliable)
      // 2. senderType from message
      // 3. Email pattern as last resort
      let userType: 'CUSTOMER' | 'EMPLOYEE';
      
      if (contact.userType) {
        userType = contact.userType;
        console.log('✅ Using userType from contact (participant data):', contact.userType);
      } else if (senderType) {
        userType = senderType;
        console.log('✅ Using senderType from message:', senderType);
      } else if (contact.phone?.includes('@example.com') || contact.phone?.includes('@gmail.com') || contact.phone?.includes('@test.com')) {
        userType = 'CUSTOMER';
        console.log('⚠️ No userType from backend, using email pattern -> CUSTOMER:', contact.phone);
      } else {
        // Default to CUSTOMER for unknown cases (safer than EMPLOYEE)
        userType = 'CUSTOMER';
        console.warn('⚠️ No userType available, defaulting to CUSTOMER:', contact.phone);
      }
      
      console.log('🎯 Creating chat with params:', {
        targetUserId: senderId,
        targetUserName: senderName,
        targetUserType: userType,
        contactUserType: contact.userType,
        senderTypeFromMessage: senderType,
        contactEmail: contact.phone,
        currentUserId: currentUserId
      });
      
      // Create new personal chat
      setCreatingChat(true);
      const newChat = await createChatAPI('PERSONAL', [
        { userId: senderId.toString(), userType: userType as 'CUSTOMER' | 'EMPLOYEE' }
      ]);
      
      console.log('✅ Personal chat created:', newChat);
      
      // Mark this chat ID to prevent socket event interference
      creatingChatIdRef.current = newChat.id;
      
      // Join the new chat room immediately
      socketService.joinChat(newChat.id);
      console.log('💬 Joined new chat room:', newChat.id);
      
      // Wait longer for backend to fully commit the chat with participants to database
      console.log('⏳ Waiting for backend to process chat...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reload chats to get the full chat data with participants
      console.log('📥 First attempt to load chat...');
      await loadChatsFromBackend();
      
      // Wait for React to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let latestChats = chatsRef.current;
      console.log('🔍 Looking for chat with ID:', newChat.id);
      console.log('📋 Latest chats count:', latestChats.length);
      
      let createdChat = latestChats.find(c => c.id === newChat.id);
      if (createdChat && createdChat.type === 'PERSONAL' && createdChat.contact.name !== 'Loading...') {
        const chatName = createdChat.contact.name;
        console.log('✅ Found chat in list, opening:', chatName);
        setSelectedChat(createdChat);
      } else {
        console.warn('⚠️ Chat not ready yet or showing Loading..., retrying...');
        // Retry with longer delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('📥 Second attempt to load chat...');
        await loadChatsFromBackend();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        latestChats = chatsRef.current;
        createdChat = latestChats.find(c => c.id === newChat.id);
        if (createdChat && createdChat.type === 'PERSONAL' && createdChat.contact.name !== 'Loading...') {
          console.log('✅ Found chat on retry:', createdChat.contact.name);
          setSelectedChat(createdChat);
        } else {
          console.error('❌ Chat still not ready after retries');
          console.error('Chat data:', createdChat);
          Alert.alert(
            'Chat Created',
            'Chat created successfully but participant data is still loading. Please refresh.',
            [{ text: 'OK' }]
          );
        }
      }
      
      // Clear the ref after navigation
      setTimeout(() => {
        creatingChatIdRef.current = null;
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to create personal chat:', error);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 
                       extension === 'gif' ? 'image/gif' : 
                       extension === 'webp' ? 'image/webp' : 'image/jpeg';
      sendFileMessage({
        type: 'image',
        uri: asset.uri,
        name: `image_${Date.now()}.${extension}`,
        size: asset.fileSize,
        mimeType: mimeType,
      });
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        sendFileMessage({
          type: 'document',
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const sendFileMessage = async (attachment: {
    type: 'image' | 'document';
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  }) => {
    if (!selectedChat) return;

    // Create a temporary message to show immediately (with sending state)
    const tempId = Date.now().toString();
    const tempMessage: Message = {
      id: tempId,
      content: attachment.type === 'image' ? '📷 Sending image...' : `📄 Sending ${attachment.name}...`,
      senderId: state.user?.id ? parseInt(state.user.id) : 2,
      senderName: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwnMessage: true,
      isSending: true,
      attachment,
    };

    // Add temporary message to the specific chat
    setMessagesByChat(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), tempMessage]
    }));

    // Scroll to newest message (inverted list)
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);

    try {
      // Upload file to server
      console.log('📤 Uploading file to server...');
      const uploadedFile = await uploadChatFile(
        attachment.uri, 
        attachment.name, 
        attachment.mimeType || (attachment.type === 'image' ? 'image/jpeg' : 'application/octet-stream')
      );
      console.log('✅ File uploaded:', uploadedFile);

      // Send message with attachment info via API
      const messageType = uploadedFile.type === 'IMAGE' ? 'IMAGE' : 'DOCUMENT';
      const messageContent = attachment.type === 'image' ? '📷 Image' : `📄 ${attachment.name}`;
      
      const sentMessage = await sendMessageAPI(
        selectedChat.id,
        messageContent,
        messageType,
        uploadedFile.url,
        uploadedFile.name,
        uploadedFile.size
      );
      console.log('✅ Message sent with attachment:', sentMessage);

      // Update the temporary message with the real message data
      setMessagesByChat(prev => {
        const chatMessages = prev[selectedChat.id] || [];
        return {
          ...prev,
          [selectedChat.id]: chatMessages.map(msg => 
            msg.id === tempId ? {
              ...msg,
              id: sentMessage.id,
              content: messageContent,
              isSending: false,
              sendFailed: false,
              attachment: {
                ...attachment,
                uri: uploadedFile.url, // Use server URL
              }
            } : msg
          )
        };
      });

    } catch (error) {
      console.error('❌ Failed to send file message:', error);
      
      // Mark message as failed
      setMessagesByChat(prev => {
        const chatMessages = prev[selectedChat.id] || [];
        return {
          ...prev,
          [selectedChat.id]: chatMessages.map(msg => 
            msg.id === tempId ? {
              ...msg,
              content: attachment.type === 'image' ? '📷 Image (failed)' : `📄 ${attachment.name} (failed)`,
              isSending: false,
              sendFailed: true,
            } : msg
          )
        };
      });
      
      Alert.alert('Error', 'Failed to send file. Please try again.');
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Share File',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: handleCameraPicker,
        },
        {
          text: 'Photo Library',
          onPress: handleImagePicker,
        },
        {
          text: 'Document',
          onPress: handleDocumentPicker,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDownloadImage = async () => {
    if (!fullScreenImage) return;

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save images to your device.');
        return;
      }

      let imageUri = fullScreenImage;

      // If it's a remote URL (starts with http/https), download it first
      if (fullScreenImage.startsWith('http://') || fullScreenImage.startsWith('https://')) {
        const filename = `image_${Date.now()}.jpg`;
        const downloadPath = LegacyFileSystem.documentDirectory + filename;
        
        console.log('📥 Downloading image from:', fullScreenImage);
        console.log('📥 Saving to:', downloadPath);
        
        const downloadResult = await LegacyFileSystem.downloadAsync(fullScreenImage, downloadPath);
        console.log('📥 Download result:', downloadResult);
        imageUri = downloadResult.uri;
      }
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      console.log('✅ Image saved to gallery:', asset.uri);
      
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    }
  };

  const handleDownloadDocument = async (uri: string, filename: string) => {
    try {
      const fullUrl = getChatAttachmentUrl(uri);
      console.log('📄 Downloading document:', fullUrl);
      console.log('📄 Filename:', filename);

      const downloadPath = LegacyFileSystem.documentDirectory + filename;
      
      console.log('📄 Saving to:', downloadPath);
      
      const downloadResult = await LegacyFileSystem.downloadAsync(fullUrl, downloadPath);
      console.log('📄 Download result:', downloadResult);

      if (downloadResult.status === 200) {
        // Try to share the file so user can open it
        const Sharing = await import('expo-sharing');
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: getMimeType(filename),
            dialogTitle: `Open ${filename}`,
          });
        } else {
          Alert.alert('Downloaded', `File saved to: ${downloadPath}`);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      
      // Fallback: try opening in browser
      try {
        const fullUrl = getChatAttachmentUrl(uri);
        const { Linking } = await import('react-native');
        await Linking.openURL(fullUrl);
      } catch (linkError) {
        Alert.alert('Error', 'Failed to download document. Please try again.');
      }
    }
  };

  // Helper to get mime type from filename
  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const handleCameraPicker = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      sendFileMessage({
        type: 'image',
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        size: asset.fileSize,
        mimeType: 'image/jpeg',
      });
    }
  };

  const handleDeleteChat = (chatId: string, chatName: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete the conversation with ${chatName}? This will permanently delete all messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chatId);
              
              // If deleted chat was selected, clear selection
              if (selectedChat?.id === chatId) {
                setSelectedChat(null);
                notificationService.setCurrentChatId(null);
              }
              
              // Clear messages for deleted chat
              setMessagesByChat(prev => {
                const newState = { ...prev };
                delete newState[chatId];
                return newState;
              });
              
              // Clear metadata for deleted chat
              setChatMetadata(prev => {
                const newState = { ...prev };
                delete newState[chatId];
                return newState;
              });
              
              Alert.alert('Success', 'Chat deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete chat');
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (chatId: string, chatName: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteChat(chatId, chatName)}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: { item: ChatType }) => {
    const chatName = item.type === 'GROUP' ? item.name : item.contact.name;
    const chatInitial = chatName?.charAt(0)?.toUpperCase() || '?';
    
    // Use chatMetadata for Instagram-style preview (real-time updates)
    const metadata = chatMetadata[item.id];
    const lastMessage = metadata?.lastMessage || messagesByChat[item.id]?.slice(-1)[0]?.content || 'Start a conversation';
    const lastMessageTime = metadata?.lastMessageTime || messagesByChat[item.id]?.slice(-1)[0]?.timestamp || '';
    const unreadCount = metadata?.unreadCount || 0;
    
    // Debug: Log when rendering chat with unread
    if (unreadCount > 0) {
      console.log('🔴 Rendering chat with unread badge:', {
        chatId: item.id,
        chatName,
        unreadCount,
        metadata
      });
    }
    
    const participantCount = item.type === 'GROUP' ? item.participants.length : 2;
    
    // Green color for all avatars
    const avatarColor = '#22C55E';
    
    const chatItemContent = (
      <TouchableOpacity
        style={[
          styles.chatItem,
          selectedChat?.id === item.id && styles.selectedChatItem,
          unreadCount > 0 && styles.unreadChatItem
        ]}
        onPress={() => handleChatSelect(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with green background */}
        <View style={styles.chatAvatarContainer}>
          <View style={[
            styles.chatAvatar,
            { backgroundColor: avatarColor }
          ]}>
            {item.type === 'GROUP' ? (
              <Ionicons name="people" size={22} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarInitial}>{chatInitial}</Text>
            )}
          </View>
          {/* Online indicator for personal chats */}
          {item.type === 'PERSONAL' && item.contact?.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
          {/* Unread badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        {/* Chat info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.chatNameRow}>
              {item.type === 'GROUP' && (
                <Ionicons name="people-circle" size={16} color={Colors.dark.tint} style={styles.groupIcon} />
              )}
              <Text 
                style={[
                  styles.chatName,
                  unreadCount > 0 && styles.unreadChatName
                ]}
                numberOfLines={1}
              >
                {chatName}
              </Text>
            </View>
            <Text style={[
              styles.chatTime,
              unreadCount > 0 && styles.unreadChatTime
            ]}>
              {lastMessageTime}
            </Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text 
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadLastMessage
              ]} 
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {item.type === 'GROUP' && (
              <View style={styles.membersBadge}>
                <Ionicons name="person" size={10} color={Colors.dark.textSecondary} />
                <Text style={styles.participantCount}>{participantCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Chevron indicator */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.tabIconDefault} />
        </View>
      </TouchableOpacity>
    );

    // Only enable swipe-to-delete for PERSONAL chats
    if (item.type === 'PERSONAL') {
      return (
        <Swipeable
          renderRightActions={() => renderRightActions(item.id, chatName)}
          overshootRight={false}
        >
          {chatItemContent}
        </Swipeable>
      );
    }

    // For GROUP chats, return without swipe functionality
    return chatItemContent;
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isConsecutive = index > 0 && 
      currentMessages[index - 1]?.senderId === item.senderId &&
      new Date(item.timestamp).getTime() - new Date(currentMessages[index - 1]?.timestamp).getTime() < 300000; // 5 minutes
    
    const showTime = !isConsecutive || index === currentMessages.length - 1;
    
    return (
      <View style={[
        styles.messageContainer,
        item.isOwnMessage ? styles.ownMessage : styles.otherMessage,
        isConsecutive && styles.consecutiveMessage
      ]}>
        {!item.isOwnMessage && selectedChat?.type === 'GROUP' && !isConsecutive && (
          <TouchableOpacity onPress={() => handleSenderNameClick(item.senderId, item.senderName, item.senderType)}>
            <ThemedText style={[styles.senderName, styles.clickableSenderName]}>
              {item.senderName}
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => item.sendFailed ? handleRetryMessage(item.id) : null}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          disabled={!item.sendFailed && !item.isOwnMessage}
          activeOpacity={item.sendFailed ? 0.7 : 0.8}
        >
          <View style={[
            styles.messageBubble,
            item.isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            isConsecutive && (item.isOwnMessage ? styles.consecutiveOwnBubble : styles.consecutiveOtherBubble),
            item.attachment && item.attachment.type === 'image' && styles.imageBubble,
            item.sendFailed && styles.failedMessageBubble
          ]}>
            {item.attachment && item.attachment.type === 'image' ? (
              <View>
                <TouchableOpacity 
                  onPress={() => {
                    const fullUrl = getChatAttachmentUrl(item.attachment!.uri);
                    console.log('🖼️ Opening full screen image:', fullUrl);
                    setFullScreenImage(fullUrl);
                  }}
                  onLongPress={() => handleMessageLongPress(item)}
                  delayLongPress={500}
                >
                  <Image
                    source={{ uri: getChatAttachmentUrl(item.attachment.uri) }}
                    style={[styles.imageAttachment, { backgroundColor: '#f0f0f0' }]}
                    resizeMode="cover"
                    onError={(e) => console.log('❌ Image load error:', e.nativeEvent.error, 'URL:', getChatAttachmentUrl(item.attachment!.uri))}
                    onLoad={() => console.log('✅ Image loaded successfully:', getChatAttachmentUrl(item.attachment!.uri))}
                  />
                </TouchableOpacity>
                {item.content !== '📷 Image' && (
                  <Text style={[
                    styles.messageText,
                    item.isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                    styles.imageCaption
                  ]}>
                    {item.content}
                  </Text>
                )}
              </View>
            ) : item.attachment && item.attachment.type === 'document' ? (
              <TouchableOpacity 
                style={styles.documentAttachment}
                onPress={() => handleDownloadDocument(item.attachment!.uri, item.attachment!.name)}
                onLongPress={() => handleMessageLongPress(item)}
                delayLongPress={500}
              >
                <Ionicons
                  name="document"
                  size={24}
                  color={item.isOwnMessage ? Colors.dark.background : Colors.dark.tint}
                />
                <View style={styles.documentInfo}>
                  <Text style={[
                    styles.documentName,
                    item.isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                  ]}>
                    {item.attachment.name}
                  </Text>
                  {item.attachment.size && (
                    <Text style={[
                      styles.documentSize,
                      item.isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                    ]}>
                      {(item.attachment.size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={item.isOwnMessage ? Colors.dark.background : Colors.dark.tint}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.textMessageContainer}>
                <Text style={[
                  styles.messageText,
                  item.isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {item.content}
                </Text>
                {/* Status indicators for own messages */}
                {item.isOwnMessage && (
                  <View style={styles.messageStatusContainer}>
                    {item.isSending ? (
                      <Ionicons name="time-outline" size={14} color={Colors.dark.textSecondary} />
                    ) : item.sendFailed ? (
                      <Ionicons name="close-circle" size={14} color="#ff4444" />
                    ) : (
                      <Ionicons name="checkmark-done" size={14} color={Colors.dark.textSecondary} />
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
        {showTime && (
          <ThemedText style={[
            styles.messageTime,
            item.isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {item.timestamp}
            {item.sendFailed && <Text style={styles.failedText}> • Tap to retry</Text>}
          </ThemedText>
        )}
      </View>
    );
  };

  if (!selectedChat) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
        
        <SafeAreaView style={styles.safeArea} edges={['top']} />

        {/* Socket Status Indicator */}
        {!socketConnected && (
          <View style={styles.socketStatus}>
            <Ionicons name="warning" size={16} color="#ff6b6b" />
            <Text style={styles.socketStatusText}>Real-time messaging disabled</Text>
          </View>
        )}
        
        {/* Header */}
        <View style={styles.chatListHeader}>
          <Text style={styles.chatListTitle}>Messages</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.dark.tabIconDefault} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.dark.tabIconDefault} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item, index) => item.id || `chat-${index}`}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={Colors.dark.tint}
              colors={[Colors.dark.tint]}
            />
          }
          ListEmptyComponent={
            isLoadingChats ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Colors.dark.tint} />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : searchQuery ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="search" size={40} color={Colors.dark.tint} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try a different search term</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubbles-outline" size={40} color={Colors.dark.tint} />
                </View>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySubtitle}>Start a new chat to begin messaging</Text>
              </View>
            )
          }
        />
        
        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewChatModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* New Chat Modal */}
        <Modal
          visible={showNewChatModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNewChatModal(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Start New Chat</ThemedText>
                <TouchableOpacity onPress={() => {
                  setShowNewChatModal(false);
                  setNewChatSearchQuery('');
                }}>
                  <Ionicons name="close" size={24} color={Colors.dark.tint} />
                </TouchableOpacity>
              </View>
              
              {/* Search Bar */}
              <View style={styles.modalSearchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color={Colors.dark.tabIconDefault} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    placeholderTextColor={Colors.dark.tabIconDefault}
                    value={newChatSearchQuery}
                    onChangeText={setNewChatSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {newChatSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setNewChatSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color={Colors.dark.tabIconDefault} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <FlatList
                data={contacts.filter(c => {
                  // Exclude current user
                  if (c.id === state.user?.id?.toString()) return false;
                  // If no search query, show all
                  if (!newChatSearchQuery.trim()) return true;
                  // Filter by name or email/phone
                  const query = newChatSearchQuery.toLowerCase().trim();
                  const nameMatch = c.name?.toLowerCase().includes(query);
                  const emailMatch = c.phone?.toLowerCase().includes(query); // phone field contains email
                  return nameMatch || emailMatch;
                })}
                keyExtractor={(item, index) => item.id || `contact-${index}`}
                contentContainerStyle={styles.contactListContent}
                keyboardShouldPersistTaps="handled"
                style={styles.contactList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => handleCreatePersonalChat(item)}
                    disabled={creatingChat}
                  >
                    <View style={styles.contactAvatar}>
                      <ThemedText style={styles.contactAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.contactInfo}>
                      <ThemedText style={styles.contactName}>{item.name}</ThemedText>
                      <ThemedText style={styles.contactPhone}>{item.phone}</ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>No contacts available</ThemedText>
                  </View>
                }
              />
              
              {creatingChat && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.dark.tint} />
                  <Text style={styles.loadingText}>{creatingChatText}</Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
      
      {/* Chat Header */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setSelectedChat(null);
              notificationService.setCurrentChatId(null); // Clear current chat tracking
            }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.dark.tint} />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <ThemedText style={styles.chatHeaderTitle}>
              {selectedChat.type === 'GROUP' ? selectedChat.name : selectedChat.contact.name}
            </ThemedText>
            <ThemedText style={styles.chatHeaderSubtitle}>
              {selectedChat.type === 'GROUP' 
                ? `${selectedChat.participants.length} members`
                : selectedChat.contact.isOnline ? 'Online' : selectedChat.contact.lastSeen
              }
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 20}
      >
        {/* Loading Messages */}
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <>
            {/* Messages - inverted FlatList for chat (newest at bottom) */}
            <FlatList
              ref={flatListRef}
              data={[...currentMessages].reverse()}
              renderItem={renderMessageItem}
              keyExtractor={(item, index) => item.id || `message-${index}`}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContentInverted}
              showsVerticalScrollIndicator={false}
              inverted
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMoreMessages ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={Colors.dark.tint} />
                    <Text style={styles.loadingMoreText}>Loading older messages...</Text>
                  </View>
                ) : hasMoreMessages ? null : currentMessages.length > MESSAGES_PER_PAGE ? (
                  <View style={styles.noMoreMessagesContainer}>
                    <Text style={styles.noMoreMessagesText}>Beginning of conversation</Text>
                  </View>
                ) : null
              }
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
            />
          </>
        )}

        {/* Message Input */}
        <ThemedView style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={showAttachmentOptions}
          >
            <Ionicons 
              name="attach" 
              size={20} 
              color={Colors.dark.tint} 
            />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={Colors.dark.textSecondary}
            multiline
            maxLength={500}
            onFocus={() => {
              // Scroll to newest when keyboard opens (inverted list)
              setTimeout(() => {
                if (flatListRef.current && currentMessages.length > 0) {
                  flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                }
              }, 100);
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? Colors.dark.background : Colors.dark.textSecondary} 
            />
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <Modal
          visible={true}
          transparent={true}
          onRequestClose={() => setFullScreenImage(null)}
          animationType="fade"
        >
          <View style={styles.fullScreenModal}>
            <TouchableOpacity 
              style={styles.fullScreenClose}
              onPress={() => setFullScreenImage(null)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fullScreenDownload}
              onPress={handleDownloadImage}
            >
              <Ionicons name="download-outline" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    // Removed marginTop to fix white bar issue on Android
  },
  socketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    gap: 8,
  },
  socketStatusText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  safeArea: {
    backgroundColor: Colors.dark.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    ...Glassmorphism,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: Typography.h2.fontWeight,
    color: Colors.dark.text,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.dark.backgroundCard,
    marginHorizontal: Spacing.sm,
    marginVertical: 4,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedChatItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.dark.tint,
  },
  unreadChatItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.tint,
  },
  chatAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  chatAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: Colors.dark.backgroundCard,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.backgroundCard,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unreadChatName: {
    fontWeight: '700',
    color: Colors.dark.text,
  },
  unreadChatTime: {
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  unreadLastMessage: {
    fontWeight: '600',
    color: Colors.dark.text,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  groupIcon: {
    marginRight: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  participantCount: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginLeft: 2,
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
    opacity: 0.5,
  },
  unreadText: {
    color: Colors.dark.background,
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.caption.fontWeight,
  },
  backButton: {
    padding: Spacing.xs,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    color: Colors.dark.text,
  },
  chatHeaderSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.dark.textSecondary,
  },

  messagesList: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  messagesContentInverted: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  noMoreMessagesContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noMoreMessagesText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    color: Colors.dark.tint,
    marginBottom: 2,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  clickableSenderName: {
    textDecorationLine: 'underline',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    marginVertical: 1,
  },
  ownMessageBubble: {
    backgroundColor: Colors.dark.tint,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.dark.background,
  },
  otherMessageText: {
    color: Colors.dark.text,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.dark.tabIconDefault,
    marginTop: 2,
    marginHorizontal: Spacing.xs,
  },
  consecutiveMessage: {
    marginVertical: 1,
  },
  consecutiveOwnBubble: {
    borderBottomRightRadius: 18,
    borderTopRightRadius: 4,
  },
  consecutiveOtherBubble: {
    borderBottomLeftRadius: 18,
    borderTopLeftRadius: 4,
  },
  ownMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
    ...Glassmorphism,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    maxHeight: 100,
    minHeight: Platform.OS === 'android' ? 45 : 40,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundCard,
    fontSize: Typography.body.fontSize,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  imageBubble: {
    padding: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  imageCaption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: 0,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  documentInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  documentName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
  },
  documentSize: {
    fontSize: Typography.caption.fontSize,
    opacity: 0.7,
    marginTop: 2,
  },
  participantCount: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginLeft: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.tint,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.dark.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  chatListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chatListTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundCard,
  },
  chatListContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
    marginLeft: Spacing.sm,
    paddingVertical: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 3,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.dark.tabIconDefault,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
  fullScreenDownload: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  textMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  messageStatusContainer: {
    marginLeft: 4,
    marginBottom: 2,
  },
  failedMessageBubble: {
    borderWidth: 1,
    borderColor: '#ff4444',
    opacity: 0.8,
  },
  failedText: {
    color: '#ff4444',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  contactList: {
    maxHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalSearchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  contactListContent: {
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});