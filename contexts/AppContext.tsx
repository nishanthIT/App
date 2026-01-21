import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  shopName: string;
  earnings?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Store {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // in miles
  address: string;
  phone?: string;
  website?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  image?: string;
  description?: string;
}

export interface ProductPrice {
  productId: string;
  storeId: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  inStock: boolean;
  lastUpdated: string;
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  notes?: string;
  isPurchased: boolean;
  addedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
  totalSavings?: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  image: string;
  storeId: string;
  store: Store;
  productIds: string[];
  isActive: boolean;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  shoppingLists: ShoppingList[];
  currentListId: string | null;
  stores: Store[];
  products: Product[];
  productPrices: ProductPrice[];
  promotions: Promotion[];
  isLoading: boolean;
  error: string | null;
}

// Action types
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_PRODUCT_PRICES'; payload: ProductPrice[] }
  | { type: 'SET_PROMOTIONS'; payload: Promotion[] }
  | { type: 'CREATE_SHOPPING_LIST'; payload: ShoppingList }
  | { type: 'UPDATE_SHOPPING_LIST'; payload: ShoppingList }
  | { type: 'DELETE_SHOPPING_LIST'; payload: string }
  | { type: 'SET_CURRENT_LIST'; payload: string | null }
  | { type: 'ADD_ITEM_TO_LIST'; payload: { listId: string; item: ShoppingListItem } }
  | { type: 'UPDATE_LIST_ITEM'; payload: { listId: string; itemId: string; updates: Partial<ShoppingListItem> } }
  | { type: 'REMOVE_ITEM_FROM_LIST'; payload: { listId: string; itemId: string } }
  | { type: 'TOGGLE_ITEM_PURCHASED'; payload: { listId: string; itemId: string } };

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  shoppingLists: [
    // Sample list for testing quantity controls
    {
      id: 'sample-list-1',
      name: 'Weekly Shopping',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          product: {
            id: 'prod-1',
            name: 'Organic Milk',
            barcode: '123456789',
            category: 'Dairy',
            image: 'milk.jpg',
            description: 'Fresh organic whole milk'
          },
          quantity: 2,
          notes: '',
          isPurchased: false,
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          product: {
            id: 'prod-2',
            name: 'Whole Wheat Bread',
            barcode: '987654321',
            category: 'Bakery',
            image: 'bread.jpg',
            description: 'Fresh whole wheat bread'
          },
          quantity: 1,
          notes: '',
          isPurchased: false,
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-3',
          productId: 'prod-3',
          product: {
            id: 'prod-3',
            name: 'Free Range Eggs',
            barcode: '456789123',
            category: 'Dairy',
            image: 'eggs.jpg',
            description: 'Fresh free range eggs'
          },
          quantity: 3,
          notes: '',
          isPurchased: false,
          addedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSavings: 0
    }
  ],
  currentListId: null,
  stores: [],
  products: [],
  productPrices: [],
  promotions: [],
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        error: null,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        shoppingLists: [],
        currentListId: null,
      };
    
    case 'SET_STORES':
      return { ...state, stores: action.payload };
    
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    
    case 'SET_PRODUCT_PRICES':
      return { ...state, productPrices: action.payload };
    
    case 'SET_PROMOTIONS':
      return { ...state, promotions: action.payload };
    
    case 'CREATE_SHOPPING_LIST':
      return {
        ...state,
        shoppingLists: [...state.shoppingLists, action.payload],
        currentListId: action.payload.id,
      };
    
    case 'UPDATE_SHOPPING_LIST':
      return {
        ...state,
        shoppingLists: state.shoppingLists.map(list =>
          list.id === action.payload.id ? action.payload : list
        ),
      };
    
    case 'DELETE_SHOPPING_LIST':
      return {
        ...state,
        shoppingLists: state.shoppingLists.filter(list => list.id !== action.payload),
        currentListId: state.currentListId === action.payload ? null : state.currentListId,
      };
    
    case 'SET_CURRENT_LIST':
      return { ...state, currentListId: action.payload };
    
    case 'ADD_ITEM_TO_LIST':
      return {
        ...state,
        shoppingLists: state.shoppingLists.map(list =>
          list.id === action.payload.listId
            ? { ...list, items: [...list.items, action.payload.item] }
            : list
        ),
      };
    
    case 'UPDATE_LIST_ITEM':
      return {
        ...state,
        shoppingLists: state.shoppingLists.map(list =>
          list.id === action.payload.listId
            ? {
                ...list,
                items: list.items.map(item =>
                  item.id === action.payload.itemId
                    ? { ...item, ...action.payload.updates }
                    : item
                ),
              }
            : list
        ),
      };
    
    case 'REMOVE_ITEM_FROM_LIST':
      return {
        ...state,
        shoppingLists: state.shoppingLists.map(list =>
          list.id === action.payload.listId
            ? {
                ...list,
                items: list.items.filter(item => item.id !== action.payload.itemId),
              }
            : list
        ),
      };
    
    case 'TOGGLE_ITEM_PURCHASED':
      return {
        ...state,
        shoppingLists: state.shoppingLists.map(list =>
          list.id === action.payload.listId
            ? {
                ...list,
                items: list.items.map(item =>
                  item.id === action.payload.itemId
                    ? { ...item, isPurchased: !item.isPurchased }
                    : item
                ),
              }
            : list
        ),
      };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isLoading: boolean;
} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore authentication state from AsyncStorage on app start
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        console.log('Restoring auth state...');
        const token = await AsyncStorage.getItem('auth_token');
        const userStr = await AsyncStorage.getItem('user');
        
        console.log('Token found:', !!token);
        console.log('User found:', !!userStr);
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          console.log('Restoring user:', user.email);
          
          // Restore user to context
          dispatch({ 
            type: 'LOGIN', 
            payload: {
              id: user.id,
              email: user.email,
              name: user.name || 'User',
              shopName: user.shopName || 'My Shop',
              location: user.location || {
                latitude: 51.5074,
                longitude: -0.1278,
              },
            }
          });
        } else {
          console.log('No stored auth data found');
        }
      } catch (error) {
        console.error('Error restoring auth state:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreAuthState();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, isLoading: isRestoring }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Logout helper function
export async function performLogout(dispatch: React.Dispatch<AppAction>) {
  try {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Helper functions
export function getProductPrices(productId: string, productPrices: ProductPrice[]): ProductPrice[] {
  return productPrices.filter(price => price.productId === productId);
}

export function getBestPrice(productId: string, productPrices: ProductPrice[]): ProductPrice | null {
  const prices = getProductPrices(productId, productPrices);
  if (prices.length === 0) return null;
  
  return prices.reduce((best, current) => 
    current.price < best.price ? current : best
  );
}

export function calculateSavings(originalPrice: number, bestPrice: number): number {
  return originalPrice - bestPrice;
}

export function calculateTotalSavings(list: ShoppingList, productPrices: ProductPrice[]): number {
  return list.items.reduce((total, item) => {
    const prices = getProductPrices(item.productId, productPrices);
    if (prices.length < 2) return total;
    
    const bestPrice = getBestPrice(item.productId, productPrices);
    const highestPrice = prices.reduce((highest, current) => 
      current.price > highest.price ? current : highest
    );
    
    if (bestPrice && highestPrice) {
      const savings = calculateSavings(highestPrice.price, bestPrice.price);
      return total + (savings * item.quantity);
    }
    
    return total;
  }, 0);
}

export function sortListByMoneySaving(list: ShoppingList, productPrices: ProductPrice[], stores: Store[]): ShoppingList {
  // Group items by store with best prices
  const storeGroups: { [storeId: string]: ShoppingListItem[] } = {};
  
  list.items.forEach(item => {
    const bestPrice = getBestPrice(item.productId, productPrices);
    if (bestPrice) {
      if (!storeGroups[bestPrice.storeId]) {
        storeGroups[bestPrice.storeId] = [];
      }
      storeGroups[bestPrice.storeId].push(item);
    }
  });
  
  // Create new list with items grouped by store
  const sortedItems: ShoppingListItem[] = [];
  Object.keys(storeGroups).forEach(storeId => {
    sortedItems.push(...storeGroups[storeId]);
  });
  
  return {
    ...list,
    items: sortedItems,
  };
}

export function sortListByNearestStore(list: ShoppingList, stores: Store[]): ShoppingList {
  // Sort stores by distance
  const sortedStores = [...stores].sort((a, b) => (a.distance || 0) - (b.distance || 0));
  
  // Reorder items based on store proximity
  const sortedItems: ShoppingListItem[] = [];
  
  sortedStores.forEach(store => {
    const storeItems = list.items.filter(item => {
      // This would need to be implemented based on your product-store mapping
      return true; // Placeholder
    });
    sortedItems.push(...storeItems);
  });
  
  return {
    ...list,
    items: sortedItems,
  };
}

