# Paymi App - Wholesale Price Comparison for UK Shop Owners

A modern, minimal, and lovable React Native Expo app designed specifically for UK shop owners to compare wholesale product prices across multiple suppliers and generate shareable shopping lists.

## 🎯 Core Features

### Authentication
- **Login & Register** pages with comprehensive form validation
- Clean inputs with password visibility toggle
- Stylish CTA buttons and professional UI
- Secure authentication flow

### Promotions Page
- Attractive card layouts showcasing current promotions
- High-quality product images with discount tags
- Quick "Add to List" functionality
- Store information and validity dates

### Shopping Lists
- **Create multiple lists** for different shopping needs
- **Barcode scanner** for easy item addition
- **Manual search** option for products
- **Price comparison** with store-by-store breakdown
- **Savings calculation** highlighting best deals

### Sorting Options
- **Money Saving**: Groups items by store showing only cheapest options
- **Nearest Store**: Reorders list based on location proximity
- Real-time savings calculations

### PDF Export & Sharing
- **Professional PDF generation** with shop-by-shop format
- Each store gets its own section with:
  - Item name and quantity
  - Price in that specific shop
  - Savings compared to other stores
  - Checkbox for shop owners to mark as purchased
- **Multiple sharing options**: WhatsApp, Email, AirDrop, etc.

## 🎨 Design Philosophy

- **Clean & Professional**: Designed specifically for shopkeepers
- **Card-based layouts** with rounded corners and soft shadows
- **Clear typography** with bold shop names and medium prices
- **Green accents** for savings and money-related elements
- **Warm, lovable design** for daily use
- **Intuitive navigation** with bottom tab bar

## 🛠 Technical Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Context API** for state management
- **Expo Camera** for barcode scanning
- **Expo Print** for PDF generation
- **Expo Sharing** for file sharing
- **React Native Paper** for UI components

## 📱 App Structure

```
app/
├── auth/                 # Authentication screens
│   ├── login.tsx        # Login screen
│   ├── register.tsx     # Registration screen
│   └── _layout.tsx      # Auth layout
├── (tabs)/              # Main app tabs
│   ├── promotions.tsx   # Promotions page
│   ├── lists.tsx        # Shopping lists page
│   ├── profile.tsx      # User profile page
│   └── _layout.tsx      # Tab navigation
├── list/
│   └── [id].tsx         # Individual list detail screen
├── scanner.tsx          # Barcode scanner screen
└── _layout.tsx          # Root layout with auth flow

contexts/
└── AppContext.tsx       # Global state management

utils/
└── pdfExport.ts         # PDF generation utilities

constants/
└── theme.ts             # Colors, typography, and styling
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Installation

1. **Install dependencies:**
   ```bash
   cd my-app
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on specific platform:**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

### Camera Permissions
The app requires camera permissions for barcode scanning. These will be requested automatically when you first try to scan a barcode.

## 📋 Usage Guide

### 1. Authentication
- Launch the app and create a new account or sign in
- Provide your shop name and contact information
- The app will remember your login for future sessions

### 2. Creating Shopping Lists
- Navigate to the "Lists" tab
- Tap the "+" button to create a new list
- Give your list a descriptive name

### 3. Adding Items
- Open a shopping list
- Tap "Add Item" and choose your method:
  - **Scan Barcode**: Use your camera to scan product barcodes
  - **Search Manually**: Search for products by name (coming soon)

### 4. Comparing Prices
- View all available prices for each item
- See savings compared to other stores
- Items are automatically sorted by best deals

### 5. Exporting Lists
- Tap "Export PDF" in any list
- Choose sorting method (Money Saving or Nearest Store)
- Share the PDF via your preferred method

## 🎨 Customization

### Theme Colors
The app uses a professional color scheme optimized for shopkeepers:
- **Primary Green**: #2E7D32 (trust and money)
- **Accent Green**: #4CAF50 (savings highlights)
- **Professional Blue**: #1976D2 (primary actions)
- **Warm Orange**: #FF8A65 (promotions)

### Typography
- Clear, readable fonts optimized for mobile
- Bold headers for shop names
- Medium weights for prices
- Consistent sizing scale

## 🔧 Development

### Adding New Features
1. Update the `AppContext.tsx` for new state management
2. Create new screens in the appropriate directory
3. Update navigation in `_layout.tsx` files
4. Add new utilities in the `utils/` directory

### State Management
The app uses React Context for state management with the following key areas:
- User authentication and profile
- Shopping lists and items
- Store and product data
- Promotions and pricing

## 📱 Platform Support

- **iOS**: Full support with native camera integration
- **Android**: Full support with camera permissions
- **Web**: Limited functionality (no camera access)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Open an issue on GitHub

## 🎯 Future Enhancements

- Real-time price updates
- Store location integration
- Push notifications for deals
- Inventory management
- Multi-language support
- Advanced analytics

---

**Built with ❤️ for UK shop owners who want to save money and make smarter purchasing decisions.**