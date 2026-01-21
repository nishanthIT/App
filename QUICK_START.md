# 🚀 QUICK START GUIDE

## Start Testing in 3 Steps

### Step 1: Start React Native App (Already have backend running ✅)
```bash
cd c:\Users\anish\N1sh\application\Paymi_app\app\my-app
npm start
```

### Step 2: Open on Device
- Press **a** for Android
- Press **i** for iOS
- Or scan QR code

### Step 3: Click "Quick Test Login"
Done! You're logged in.

---

## Test Credentials
```
Email: customer1@example.com
Password: securepassword
Type: CUSTOMER
```

---

## Your Backend URL
```
http://172.20.10.2:3000/api
```

Change in: `config/api.ts` if needed

---

## Troubleshooting One-Liners

**Can't connect?**
```bash
# Check backend is running
netstat -ano | findstr ":3000"

# Get your IP again
ipconfig | findstr "IPv4"
```

**Need to restart backend?**
```bash
cd c:\Users\anish\N1sh\application\Paymi_app\app\product-A-backend
node server.js
```

**Reset test data?**
```bash
cd c:\Users\anish\N1sh\application\Paymi_app\app\product-A-backend
node test-setup.js
```

---

## What's Working ✅
- ✅ Login authentication
- ✅ JWT tokens
- ✅ Persistent sessions
- ✅ Backend connected
- ✅ Test data ready

---

## Next: Connect Lists Screen?
Want to make the lists screen fetch real data from the backend? Let me know!

---

**Files to Read:**
- `READY_TO_TEST.md` - Full setup guide
- `CONNECTION_STATUS.md` - Technical details  
- `SETUP_GUIDE.md` - Configuration help
