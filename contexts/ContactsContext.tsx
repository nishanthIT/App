import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserChats, getAllUsers } from '@/services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';
import { useApp } from './AppContext';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  userType?: 'CUSTOMER' | 'EMPLOYEE'; // Add userType from backend
  avatar?: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  participants: Contact[];
  admins: string[]; // Contact IDs
  createdBy: string;
  createdAt: Date;
  type: 'GROUP';
}

export interface PersonalChat {
  id: string;
  contact: Contact;
  type: 'PERSONAL';
}

export type ChatType = GroupChat | PersonalChat;

export interface ContactsContextType {
  contacts: Contact[];
  chats: ChatType[];
  addContact: (contact: Contact) => void;
  createGroup: (name: string, description: string, participants: Contact[]) => GroupChat;
  addParticipantToGroup: (groupId: string, contactId: string) => void;
  removeParticipantFromGroup: (groupId: string, contactId: string) => void;
  updateGroupInfo: (groupId: string, name?: string, description?: string, avatar?: string) => void;
  createPersonalChat: (contact: Contact) => PersonalChat;
  loadChatsFromBackend: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  initializeAfterLogin: () => Promise<void>;
  isLoadingChats: boolean;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const useContacts = (): ContactsContextType => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};

interface ContactsProviderProps {
  children: ReactNode;
}

export const ContactsProvider: React.FC<ContactsProviderProps> = ({ children }) => {
  const { state: appState } = useApp(); // Get auth state from AppContext
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  // Contacts will be populated from chats
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [chats, setChats] = useState<ChatType[]>([]);

  // Load chats from backend
  const loadChatsFromBackend = async () => {
    setIsLoadingChats(true);
    try {
      console.log('📥 Loading chats from backend...');
      const backendChats = await getUserChats();
      
      // Filter to show only ONE group chat (the first one)
      let groupChatAdded = false;
      
      // Convert backend chats to frontend format
      const formattedChats: ChatType[] = backendChats
        .filter((chat: any) => {
          // For GROUP chats, only include the first one
          if (chat.type === 'GROUP') {
            if (groupChatAdded) {
              return false; // Skip additional group chats
            }
            groupChatAdded = true;
            return true;
          }
          // Include all PERSONAL chats (even if otherParticipants is empty - might be newly created)
          if (chat.type === 'PERSONAL') {
            // Don't filter out if otherParticipants is missing - might be a new chat
            if (chat.otherParticipants && chat.otherParticipants.length === 0) {
              console.warn('⚠️ Personal chat has empty otherParticipants array:', chat.id);
              // Still include it - might be newly created
            }
            return true;
          }
          return true;
        })
        .map((chat: any) => {
          if (chat.type === 'GROUP') {
            return {
              id: chat.id,
              name: chat.name,
              description: '',
              participants: chat.participants.map((p: any) => ({
                id: p.id.toString(),
                name: p.name,
                phone: p.email,
                userType: p.userType, // Capture userType from backend
                isOnline: false,
              })),
              admins: chat.participants.filter((p: any) => p.isAdmin).map((p: any) => p.id.toString()),
              createdBy: chat.participants.find((p: any) => p.isAdmin)?.id.toString() || '',
              createdAt: new Date(),
              type: 'GROUP' as const,
            };
          } else {
            // Personal chat
            const otherParticipant = chat.otherParticipants?.[0];
            
            // Handle newly created chats that might not have otherParticipants yet
            if (!otherParticipant) {
              console.warn('⚠️ Personal chat missing otherParticipants, using placeholder:', chat.id);
              return {
                id: chat.id,
                contact: {
                  id: 'unknown',
                  name: 'Loading...',
                  phone: '',
                  userType: 'CUSTOMER',
                  isOnline: false,
                },
                type: 'PERSONAL' as const,
              };
            }
            
            return {
              id: chat.id,
              contact: {
                id: otherParticipant.id.toString(),
                name: otherParticipant.name,
                phone: otherParticipant.email,
                userType: otherParticipant.userType, // Capture userType from backend
                isOnline: false,
              },
              type: 'PERSONAL' as const,
            };
          }
        });
      
      console.log('📊 Backend returned:', backendChats.length, 'chats');
      console.log('📊 After filtering:', formattedChats.length, 'chats');
      
      setChats(formattedChats);
      
      // Extract unique contacts from all chats
      const uniqueContacts = new Map<string, Contact>();
      formattedChats.forEach((chat) => {
        if (chat.type === 'GROUP') {
          chat.participants.forEach((participant) => {
            if (!uniqueContacts.has(participant.id)) {
              uniqueContacts.set(participant.id, participant);
            }
          });
        } else if (chat.type === 'PERSONAL') {
          if (!uniqueContacts.has(chat.contact.id)) {
            uniqueContacts.set(chat.contact.id, chat.contact);
          }
        }
      });
      
      setContacts(Array.from(uniqueContacts.values()));
      console.log('✅ Loaded', formattedChats.length, 'chats from backend (1 group chat + personal chats)');
      console.log('✅ Loaded', uniqueContacts.size, 'contacts from chats');
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
      // Keep existing mock data on error
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Load all users as contacts
  const loadAllUsersAsContacts = async () => {
    try {
      console.log('👥 Loading all users as contacts...');
      const users = await getAllUsers();
      
      // Convert users to contacts format
      const userContacts: Contact[] = users.map((user: any) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        isOnline: user.isOnline || false
      }));
      
      setContacts(userContacts);
      console.log(`✅ Loaded ${userContacts.length} contacts from all users`);
      
    } catch (error) {
      console.error('❌ Failed to load users as contacts:', error);
    }
  };

  // Check authentication status and load data accordingly
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if user is authenticated both from AppContext and AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        const authToken = await AsyncStorage.getItem('auth_token');
        
        if (appState.isAuthenticated && userData && authToken) {
          console.log('✅ User authenticated, loading chats and contacts...');
          loadChatsFromBackend();
          loadAllUsersAsContacts();
        } else {
          console.log('❌ User not authenticated, skipping chat/contact loading');
          // Clear chats and contacts if user is not authenticated
          setChats([]);
          setContacts([]);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuthAndLoadData();
  }, [appState.isAuthenticated]); // React to authentication state changes

  const addContact = (contact: Contact) => {
    setContacts(prev => [...prev, contact]);
  };

  const createGroup = (name: string, description: string, participants: Contact[]): GroupChat => {
    const newGroup: GroupChat = {
      id: `group-${Date.now()}`,
      name,
      description,
      participants,
      admins: ['current-user-id'], // In real app, use actual current user ID
      createdBy: 'current-user-id',
      createdAt: new Date(),
      type: 'GROUP',
    };

    setChats(prev => [...prev, newGroup]);
    return newGroup;
  };

  const addParticipantToGroup = (groupId: string, contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    setChats(prev => prev.map(chat => {
      if (chat.id === groupId && chat.type === 'GROUP') {
        return {
          ...chat,
          participants: [...chat.participants, contact],
        };
      }
      return chat;
    }));
  };

  const removeParticipantFromGroup = (groupId: string, contactId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === groupId && chat.type === 'GROUP') {
        return {
          ...chat,
          participants: chat.participants.filter(p => p.id !== contactId),
        };
      }
      return chat;
    }));
  };

  const updateGroupInfo = (groupId: string, name?: string, description?: string, avatar?: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === groupId && chat.type === 'GROUP') {
        return {
          ...chat,
          ...(name && { name }),
          ...(description && { description }),
          ...(avatar && { avatar }),
        };
      }
      return chat;
    }));
  };

  const createPersonalChat = (contact: Contact): PersonalChat => {
    const newChat: PersonalChat = {
      id: `personal-${contact.id}`,
      contact,
      type: 'PERSONAL',
    };

    setChats(prev => {
      const exists = prev.find(c => c.type === 'PERSONAL' && c.id === newChat.id);
      if (exists) return prev;
      return [...prev, newChat];
    });

    return newChat;
  };

  const deleteChat = async (chatId: string): Promise<void> => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      
      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('🔑 Token found, making DELETE request...');
      
      // Call backend API using centralized config
      const response = await fetch(`${API_CONFIG.BASE_URL}/chat/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Delete response status:', response.status);
      
      // Get response text first to see what we're dealing with
      const responseText = await response.text();
      console.log('📄 Response text:', responseText.substring(0, 200));

      if (!response.ok) {
        let errorMessage = 'Failed to delete chat';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Response is not JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Try to parse JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // If it's not JSON but status is OK, consider it successful
        console.log('⚠️ Response is not JSON but status is OK');
      }

      // Remove chat from local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      console.log('✅ Chat deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete chat:', error);
      throw error;
    }
  };

  // Function to initialize data after successful login
  const initializeAfterLogin = async () => {
    console.log('🔄 Initializing chat data after login...');
    try {
      await loadChatsFromBackend();
      await loadAllUsersAsContacts();
      console.log('✅ Chat data initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize chat data after login:', error);
    }
  };

  const value: ContactsContextType = {
    contacts,
    chats,
    addContact,
    createGroup,
    addParticipantToGroup,
    removeParticipantFromGroup,
    updateGroupInfo,
    createPersonalChat,
    loadChatsFromBackend,
    deleteChat,
    initializeAfterLogin,
    isLoadingChats,
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};