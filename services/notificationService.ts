import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  
  // Track currently viewed chat to avoid showing notifications for active chat
  private currentChatId: string | null = null;

  // Initialize notification permissions and listeners
  async initialize(): Promise<void> {
    console.log('🔔 Initializing notification service...');
    
    // Request permissions
    const permissionGranted = await this.requestPermissions();
    if (!permissionGranted) {
      console.log('⚠️ Notification permissions not granted');
      return;
    }

    // Get push token (for potential future push notification support)
    await this.registerForPushNotifications();

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
      });
    }

    console.log('✅ Notification service initialized');
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('📱 Must use physical device for push notifications');
      // Still allow local notifications in simulator/emulator
      return true;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }

    console.log('✅ Notification permission granted');
    return true;
  }

  // Register for push notifications (for future use with backend)
  private async registerForPushNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.log('📱 Skipping push token registration (not a physical device)');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '1708b933-6a0c-41fe-986a-d74cef94aad9', // From app.json
      });
      
      this.expoPushToken = token.data;
      console.log('🎫 Expo push token:', this.expoPushToken);

      // Store token for later use
      await AsyncStorage.setItem('expoPushToken', this.expoPushToken);
    } catch (error) {
      console.log('⚠️ Could not get push token:', error);
    }
  }

  // Set currently viewed chat (to avoid notifications for messages in active chat)
  setCurrentChatId(chatId: string | null): void {
    this.currentChatId = chatId;
    console.log('📍 Current chat ID set to:', chatId);
  }

  // Show local notification for incoming chat message
  async showChatNotification(
    senderName: string,
    message: string,
    chatId: string,
    chatName?: string
  ): Promise<void> {
    // Don't show notification if user is viewing this chat
    if (this.currentChatId === chatId) {
      console.log('⏭️ Skipping notification - user is viewing this chat');
      return;
    }

    const title = chatName ? `${senderName} in ${chatName}` : senderName;
    const body = message.length > 100 ? message.substring(0, 100) + '...' : message;

    console.log('🔔 Showing notification:', { title, body, chatId });

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { chatId, type: 'chat_message' },
          sound: 'default',
          badge: 1,
          ...(Platform.OS === 'android' && { channelId: 'chat-messages' }),
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
    }
  }

  // Set up listener for notification responses (when user taps notification)
  onNotificationResponse(callback: (chatId: string) => void): void {
    // Remove existing listener if any
    if (this.responseListener) {
      this.responseListener.remove();
    }

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('📲 Notification tapped:', data);

      if (data?.chatId && data?.type === 'chat_message') {
        callback(data.chatId as string);
      }
    });
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  // Clean up listeners
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export default new NotificationService();
