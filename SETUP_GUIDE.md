# React Native App - Backend Connection Setup

## Quick Setup Guide

### 1. Find Your Computer's IP Address

#### Windows:
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.100`)

#### Mac/Linux:
```bash
ifconfig
# or
ip addr
```
Look for "inet" address (e.g., `192.168.1.100`)

### 2. Update API Configuration

Open `config/api.ts` and update the `BASE_URL` with your IP address:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_IP_HERE:3000/api', // e.g., http://192.168.1.100:3000/api
  // ...
};
```

### 3. Start the Backend Server

```bash
cd c:\Users\anish\N1sh\application\Paymi_app\app\product-A-backend
node server.js
```

Make sure the backend is running on port 3000.

### 4. Test Login Credentials

The app is configured to use these test credentials:

**Customer Account:**
- Email: `customer1@example.com`
- Password: `securepassword`
- User Type: CUSTOMER

Use the "Quick Test Login" button for instant testing.

### 5. Run the React Native App

```bash
cd c:\Users\anish\N1sh\application\Paymi_app\app\my-app
npm start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Scan QR code for physical device

## Troubleshooting

### Cannot Connect to Backend

1. **Check IP Address**: Make sure you're using the correct IP address
2. **Same Network**: Ensure your phone/emulator and computer are on the same WiFi network
3. **Firewall**: Check if Windows Firewall is blocking port 3000
4. **Backend Running**: Verify backend is running without errors

### Network Timeout

If you get timeout errors:
- Increase timeout in `config/api.ts` (default: 10000ms)
- Check your network connection
- Try using Android emulator with `10.0.2.2` instead of local IP

### 401 Unauthorized

- Check that user credentials exist in the database
- Verify JWT_SECRET in backend `.env` file
- Clear AsyncStorage and try logging in again

## Features Connected

✅ Login with backend authentication
✅ Token-based authorization
✅ Persistent login (AsyncStorage)
✅ User type selection (Customer/Employee/Admin)

## Next Steps

1. Connect Shopping Lists to backend
2. Integrate product search
3. Add shop locations
4. Implement promotions

## API Endpoints Available

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `GET /api/lists` - Get user's shopping lists
- `POST /api/makeList` - Create new list
- `POST /api/addProductToList` - Add product to list
- `GET /api/getLowestPricesInList/:listId` - Get lowest prices

## Need Help?

Check console logs for error messages:
- Metro bundler console for React Native errors
- Backend terminal for server errors
- Browser DevTools for web admin panel
