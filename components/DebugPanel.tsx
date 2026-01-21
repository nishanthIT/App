// Add this to your app for debugging - creates a hidden debug button
// Add to chat.tsx or create a new debug screen

import { TouchableOpacity, Alert, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '@/services/socketService';

// Add this component anywhere in your app (hidden in corner)
export const DebugPanel = () => {
  const clearAndReconnect = async () => {
    try {
      // 1. Disconnect socket
      socketService.disconnect();
      
      // 2. Get current user info before clearing
      const currentUser = await AsyncStorage.getItem('user');
      console.log('Current user before clear:', currentUser);
      
      // 3. Clear all AsyncStorage
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage cleared');
      
      // 4. Show confirmation
      Alert.alert(
        'Debug: Data Cleared',
        'All app data cleared. Please close and reopen the app, then login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Force app reload
              // Note: This doesn't actually close the app, user must do it manually
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error clearing data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', 'Failed to clear data: ' + errorMessage);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      const userId = user ? JSON.parse(user).id : 'Not found';
      
      Alert.alert(
        'Debug: Current User',
        `User ID: ${userId}\nToken: ${token ? 'Present' : 'Missing'}\n\nFull data:\n${user}`,
        [{ text: 'OK' }]
      );
      
      console.log('Current user:', user);
      console.log('Current token:', token);
    } catch (error) {
      console.error('Error checking user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', 'Failed to check user: ' + errorMessage);
    }
  };

  const forceReconnect = async () => {
    try {
      socketService.disconnect();
      console.log('Socket disconnected');
      
      setTimeout(async () => {
        await socketService.connect();
        console.log('Socket reconnected');
        
        // Rejoin user room
        const user = await AsyncStorage.getItem('user');
        if (user) {
          const userId = JSON.parse(user).id;
          socketService.joinUserRoom(userId);
          console.log('Rejoined user room:', userId);
        }
        
        Alert.alert('Debug', 'Socket reconnected successfully');
      }, 1000);
    } catch (error) {
      console.error('Error reconnecting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', 'Failed to reconnect: ' + errorMessage);
    }
  };

  return (
    <View style={{ position: 'absolute', bottom: 100, right: 10, zIndex: 1000 }}>
      {/* Hidden debug buttons - only visible in dev mode */}
      {__DEV__ && (
        <>
          <TouchableOpacity
            onPress={checkCurrentUser}
            style={{
              backgroundColor: 'blue',
              padding: 8,
              borderRadius: 20,
              marginBottom: 5,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10 }}>👤 Check User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={forceReconnect}
            style={{
              backgroundColor: 'orange',
              padding: 8,
              borderRadius: 20,
              marginBottom: 5,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10 }}>🔄 Reconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearAndReconnect}
            style={{
              backgroundColor: 'red',
              padding: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10 }}>🗑️ Clear Data</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// HOW TO USE:
// 1. Add to your chat.tsx:
//    import { DebugPanel } from './DebugPanel';
//    
//    In your return statement, add:
//    <DebugPanel />
//
// 2. The buttons will only show in development mode
// 3. Use "Check User" to see which user is logged in
// 4. Use "Reconnect" to force socket reconnection
// 5. Use "Clear Data" to logout and clear everything
