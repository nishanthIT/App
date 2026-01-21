# Socket.IO Real-Time Messaging Debug Guide

## Issue Summary
Two devices showing same user data and messages not appearing in real-time.

## What We've Added

### Frontend Logging (chat.tsx)
- **Device Identity**: Now shows which user ID each device is logged in as
- **Message Reception**: Shows which device receives messages and from whom

### Backend Logging (server.js & chat.js)
- **Room Membership**: Shows which sockets are in which rooms
- **User Identification**: Maps socket IDs to user IDs
- **Message Broadcasting**: Shows exactly which sockets will receive each message

## How to Debug

### Step 1: Check Device Identity
When you open the chat screen on each device, you should see:
```
🆔 DEVICE IDENTITY: This device is user ID: 4
👤 User name: Test Customer
```

**Expected:**
- iOS device: User ID 4 (Test Customer)
- Android device: User ID 5 (Alice)

**If both show same user ID:** Clear app data/cache and login again

### Step 2: Check Room Joining
Watch the backend logs when devices connect. You should see:
```
✅ User 4 joined their personal room (Socket: ABC123)
📊 Current userSockets map: [ [ 4, 'ABC123' ], [ 5, 'XYZ789' ] ]
✅ Socket ABC123 joined chat room: chat_1
👤 This is user 4's socket
```

**Expected:**
- Two different socket IDs in userSockets map
- Each user in their own personal room
- Both sockets in shared chat rooms

### Step 3: Send a Message
When Alice (user 5) sends a message, backend should log:
```
🔍 Looking for sender socket: { userId: 5, userType: 'number' }
📊 Available sockets: [ [ 4, 'ABC123' ], [ 5, 'XYZ789' ] ]
🎯 Found sender socket: XYZ789
🏠 Sockets in room chat_1: Set { 'ABC123', 'XYZ789' }
📡 Broadcasted message to chat room (excluding sender): 1
📡 Message will be sent to sockets: [ 'ABC123' ]
```

**Expected:**
- Sender socket found (XYZ789 for Alice)
- Message sent to Test Customer's socket (ABC123)
- NOT sent back to sender

### Step 4: Check Message Reception
On Test Customer's device (iOS), you should see:
```
📩 Real-time message received: { content: "Hello", senderId: 5, ... }
🆔 MESSAGE RECEIVED ON DEVICE USER ID: 4
📨 MESSAGE SENT FROM USER ID: 5
```

**Expected:**
- Message appears immediately without reload
- Device correctly identifies itself as user 4
- Message correctly identified as from user 5

## Common Issues and Solutions

### Issue 1: Both Devices Show Same User
**Symptom:** Both devices log same user ID

**Solution:**
1. Completely close both apps (kill from background)
2. Clear app data:
   - iOS: Delete and reinstall app
   - Android: Settings → Apps → Clear Data
3. Login again with correct credentials

### Issue 2: Messages Don't Appear in Real-Time
**Symptom:** Messages save to DB but don't broadcast

**Possible Causes:**
1. **Not in chat room**: Check backend logs for "joined chat room"
   - Fix: Ensure `socketService.joinChat(chatId)` is called
   
2. **Socket disconnected**: Check for "Socket.IO is not connected" alert
   - Fix: Restart app, check network connection
   
3. **Wrong room name**: Check if room names match
   - Backend: `chat_${chatId}`
   - Frontend: Must use same format

### Issue 3: AsyncStorage Caching Wrong User
**Symptom:** Logout/login still shows old user

**Solution:**
```bash
# In the app, add this to logout:
await AsyncStorage.clear();
# Or specifically:
await AsyncStorage.removeItem('user');
await AsyncStorage.removeItem('token');
```

## Quick Test Procedure

1. **Restart Backend**
   ```bash
   # Kill current process (Ctrl+C)
   node server.js
   ```

2. **Clear Both Devices**
   - iOS: Delete app → Reinstall → Login as Test Customer
   - Android: Clear data → Reopen → Login as Alice

3. **Watch Logs**
   - Backend: Should show 2 users with different socket IDs
   - iOS: Should identify as user 4
   - Android: Should identify as user 5

4. **Send Test Message**
   - Android (Alice): Send "Test from Alice"
   - iOS (Test Customer): Should receive immediately
   - Check backend logs for broadcast confirmation

5. **Verify Room Membership**
   - Backend logs should show both sockets in chat room
   - Message should be broadcasted to 1 socket (the other user)

## Next Steps If Still Not Working

1. **Check if messages are in correct chat**
   - Both users must be in same chat room
   - Check chatId matches on both devices

2. **Verify network**
   - Both devices on same WiFi
   - Can reach backend (10.221.245.43:3000)
   - No firewall blocking WebSocket connections

3. **Check Socket.IO transport**
   - Should use 'websocket' (fastest)
   - Falls back to 'polling' if needed
   - Check browser/app console for connection type

4. **Database verification**
   ```sql
   -- Check if users are in same chat
   SELECT * FROM ChatParticipant WHERE chatId = 1;
   
   -- Should show both user 4 and user 5
   ```

## Debug Commands

### Clear All App Data (React Native)
```javascript
// Add to a debug button in your app
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAllData = async () => {
  await AsyncStorage.clear();
  console.log('All data cleared!');
  // Restart app
};
```

### Force Socket Reconnection
```javascript
// Add to a debug button
socketService.disconnect();
setTimeout(() => {
  socketService.connect();
}, 1000);
```

### View Current User
```javascript
// Add to chat screen temporarily
console.log('Current user from state:', state.user);
console.log('Current user from ref:', currentUserIdRef.current);
const stored = await AsyncStorage.getItem('user');
console.log('Current user from AsyncStorage:', stored);
```

## Success Criteria

✅ Backend logs show 2 different users with 2 different socket IDs
✅ Frontend logs show each device identifies as different user
✅ Messages appear immediately on other device (no reload needed)
✅ Messages are NOT duplicated on sender's device
✅ Unread counts work correctly
✅ Both devices can send and receive simultaneously

## If Nothing Works

Last resort - check if it's a caching issue:
1. Stop both apps
2. Stop backend
3. Clear Redis/cache if you have it
4. Restart backend
5. Reinstall apps on both devices
6. Login fresh on both
7. Test again

The new logging will help identify exactly where the problem is!
