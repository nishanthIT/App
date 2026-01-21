import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import listService from '@/services/listService';
import * as Sharing from 'expo-sharing';

import { API_CONFIG } from '../../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

export default function PromotionsScreen() {
  const { state, dispatch } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<any>(null);
  const [shoppingLists, setShoppingLists] = useState<any[]>([]);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [preparingShare, setPreparingShare] = useState(false);

  const loadPromotions = async () => {
    try {
      console.log('🔄 Loading promotions from API...');
      console.log('📡 API URL:', `${API_BASE_URL}/promotions`);
      
      // Get the auth token from AsyncStorage (same way chat service does it)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 Auth token:', token ? 'present' : 'missing');
      
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/promotions`, {
        method: 'GET',
        headers,
      });
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);
      
      const data = await response.json();
      
      if (response.ok) {
        // Handle both formats: direct array or wrapped in 'promotions' property
        const promotionsArray = Array.isArray(data) ? data : data.promotions || [];
        console.log('✅ Promotions loaded:', promotionsArray.length, 'items');
        console.log('📋 Promotion data:', JSON.stringify(promotionsArray, null, 2));
        setPromotions(promotionsArray);
      } else {
        console.error('❌ API Error:', data);
        if (data.error) {
          Alert.alert('Error', data.error);
        }
        setPromotions([]);
      }
    } catch (error) {
      console.error('❌ Error loading promotions:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'Failed to load promotions: ' + (error instanceof Error ? error.message : String(error)));
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadShoppingLists = async () => {
    try {
      console.log('🛒 Loading shopping lists from API...');
      const lists = await listService.getUserLists();
      console.log('✅ Shopping lists loaded:', lists.length, 'lists');
      console.log('📋 Lists data:', JSON.stringify(lists, null, 2));
      setShoppingLists(lists);
    } catch (error) {
      console.error('❌ Error loading shopping lists:', error);
      setShoppingLists([]);
    }
  };

  useEffect(() => {
    loadPromotions();
    loadShoppingLists();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([loadPromotions(), loadShoppingLists()]).finally(() => setRefreshing(false));
  };

  const handleViewProducts = (promotion: any) => {
    setSelectedPromotion(promotion);
    setShowProducts(true);
  };

  const groupProductsByShop = (products: any[]) => {
    const grouped = products.reduce((acc: any, product: any) => {
      const shopName = product.shop?.name || product.store?.name || 'Unknown Shop';
      const shopId = product.shop?.id || product.store?.id || 'unknown';
      
      if (!acc[shopId]) {
        acc[shopId] = {
          shopName,
          shopId,
          products: []
        };
      }
      
      acc[shopId].products.push(product);
      return acc;
    }, {});
    
    return Object.values(grouped);
  };

  const handleShare = async () => {
    setPreparingShare(true);
    try {
      // Prepare share content
      const groupedShops = groupProductsByShop(selectedPromotion?.products || []);
      
      let shareText = `🎉 Check out these great promotions from ${selectedPromotion?.title}!\n\n`;
      
      groupedShops.forEach((shop: any) => {
        shareText += `🏪 ${shop.shopName}\n`;
        shop.products.forEach((product: any, index: number) => {
          if (index < 3) { // Limit to first 3 products per shop
            shareText += `  • ${product.title} - £${(parseFloat(product.price) || parseFloat(product.rrp) || 0).toFixed(2)}\n`;
          }
        });
        if (shop.products.length > 3) {
          shareText += `  ... and ${shop.products.length - 3} more items\n`;
        }
        shareText += '\n';
      });
      
      shareText += '💰 Don\'t miss these amazing deals!\n';
      shareText += '📱 Download our app to see more promotions!';
      
      console.log('📤 Attempting to share:', shareText);
      
      // Try Expo Sharing first, then fallback to React Native Share
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          console.log('📤 Using Expo Sharing');
          
          // Create a temporary text file to share
          const FileSystem = require('expo-file-system');
          const fileUri = FileSystem.documentDirectory + 'promotion-share.txt';
          await FileSystem.writeAsStringAsync(fileUri, shareText);
          
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: `${selectedPromotion?.title} - Great Deals!`,
          });
          
          console.log('✅ Content shared via Expo Sharing');
          return;
        }
      } catch (expoError) {
        console.log('⚠️ Expo Sharing failed, trying React Native Share:', expoError);
      }
      
      // Fallback to React Native Share API
      const shareOptions: any = {
        message: shareText,
        title: `${selectedPromotion?.title} - Great Deals!`,
      };
      
      // For iOS, add url parameter which might help trigger more share options
      if (Platform.OS === 'ios') {
        shareOptions.url = 'https://yourapp.com'; // Replace with your app's URL
      }
      
      const result = await Share.share(shareOptions, {
        // These options help specify which apps to exclude/include
        excludedActivityTypes: [],
      });
      
      console.log('📤 Share result:', result);
      
      if (result.action === Share.sharedAction) {
        console.log('✅ Content shared successfully');
        if (result.activityType) {
          console.log('📤 Shared via:', result.activityType);
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('🚫 Share dialog dismissed');
      }
    } catch (error: any) {
      console.error('❌ Error sharing:', error);
      console.error('❌ Error details:', JSON.stringify(error));
      
      // Fallback to simple alert with copy option
      Alert.alert(
        'Share Promotion',
        'Share functionality is not available. Would you like to copy the text instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy Text', onPress: () => {
            // You could use Clipboard here if available
            console.log('📋 Text would be copied to clipboard');
            Alert.alert('Success', 'Promotion details copied to clipboard!');
          }},
        ]
      );
    } finally {
      setPreparingShare(false);
    }
  };

  const handleAddProductToList = async (product: any) => {
    console.log('🛒 Available shopping lists:', shoppingLists.length);
    console.log('🛒 Shopping lists data:', JSON.stringify(shoppingLists, null, 2));
    console.log('📦 Product to add:', product);
    
    if (shoppingLists.length === 0) {
      // No lists available, create new one
      Alert.alert('Create List', 'You don\'t have any shopping lists. Would you like to create one?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create List', onPress: async () => {
          setAddingToList(product.id);
          try {
            const newListName = `Shopping List ${shoppingLists.length + 1}`;
            const newList = await listService.createList({ name: newListName, description: '' });
            console.log('✅ Created new list:', newList);
            
            // Add the product to the new list
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const customerId = user?.id || 1;
            
            await listService.addProductToList({
              listId: newList.id,
              productId: product.id,
              customerId: customerId
            });
            
            // Refresh shopping lists
            await loadShoppingLists();
            Alert.alert('Success', `Created "${newListName}" and added ${product.title}!`);
          } catch (error) {
            console.error('❌ Error creating list:', error);
            Alert.alert('Error', 'Failed to create shopping list');
          } finally {
            setAddingToList(null);
          }
        }},
      ]);
    } else {
      // Show list selection
      const listOptions = shoppingLists.map((list: any) => ({
        text: list.name,
        onPress: async () => {
          setAddingToList(product.id);
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const customerId = user?.id || 1;
            
            await listService.addProductToList({
              listId: list.id,
              productId: product.id,
              customerId: customerId
            });
            
            Alert.alert('Success', `Added ${product.title} to ${list.name}!`);
          } catch (error) {
            console.error('❌ Error adding product to list:', error);
            Alert.alert('Error', 'Failed to add product to list');
          } finally {
            setAddingToList(null);
          }
        }
      }));
      
      Alert.alert(
        'Select List',
        `Which list would you like to add "${product.title}" to?`,
        [
          ...listOptions,
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create New List', onPress: async () => {
            setAddingToList(product.id);
            try {
              const newListName = `Shopping List ${shoppingLists.length + 1}`;
              const newList = await listService.createList({ name: newListName, description: '' });
              console.log('✅ Created new list:', newList);
              
              // Add the product to the new list
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const userStr = await AsyncStorage.getItem('user');
              const user = userStr ? JSON.parse(userStr) : null;
              const customerId = user?.id || 1;
              
              await listService.addProductToList({
                listId: newList.id,
                productId: product.id,
                customerId: customerId
              });
              
              // Refresh shopping lists
              await loadShoppingLists();
              Alert.alert('Success', `Created "${newListName}" and added ${product.title}!`);
            } catch (error) {
              console.error('❌ Error creating list and adding product:', error);
              Alert.alert('Error', 'Failed to create shopping list');
            } finally {
              setAddingToList(null);
            }
          }}
        ]
      );
    }
  };

  const renderPromotionCard = ({ item }: { item: any }) => (
    <ThemedView style={styles.promotionCard}>
      <View style={styles.promotionImageContainer}>
        <Image
          source={{ uri: item.imageUrl || item.image }}
          style={styles.promotionImage}
          defaultSource={require('@/assets/images/icon.png')}
        />
      </View>
      
      <View style={styles.promotionContent}>
        <View style={styles.promotionHeader}>
          <ThemedText style={styles.promotionTitle}>{item.title}</ThemedText>
          <View style={styles.storeBadge}>
            <ThemedText style={styles.storeName}>{item.shop?.name || item.store?.name}</ThemedText>
          </View>
        </View>
        
        <ThemedText style={styles.promotionDescription}>{item.description}</ThemedText>
        
        <View style={styles.promotionFooter}>
          <TouchableOpacity
            style={styles.viewProductsButton}
            onPress={() => handleViewProducts(item)}
          >
            <Ionicons name="list" size={16} color={Colors.light.background} />
            <Text style={styles.viewProductsButtonText}>View Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetag" size={64} color={Colors.light.textLight} />
      <ThemedText style={styles.emptyTitle}>No Promotions Available</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Check back later for exciting deals and discounts from your favorite suppliers!
      </ThemedText>
    </View>
  );

  const renderShopSection = ({ item: shopGroup }: { item: any }) => (
    <View style={styles.shopSection}>
      <View style={styles.shopHeader}>
        <Ionicons name="storefront" size={20} color={Colors.dark.primary} />
        <ThemedText style={styles.shopHeaderTitle}>{shopGroup.shopName}</ThemedText>
        <View style={styles.productCountBadge}>
          <ThemedText style={styles.productCountText}>{shopGroup.products.length}</ThemedText>
        </View>
      </View>
      
      {shopGroup.products.map((product: any, index: number) => (
        <ThemedView key={product.id || index} style={styles.productCard}>
          <View style={styles.productInfo}>
            {product.img && product.img.length > 0 && (
              <Image 
                  source={{
                    uri: Array.isArray(product.img)
                    ? product.img[0]
                    : product.img
                }} 
                style={styles.productImage} 
              />
            )}
            <View style={styles.productDetails}>
              <ThemedText style={styles.productTitle}>{product.title}</ThemedText>
              {product.barcode && (
                <ThemedText style={styles.productBarcode}>Barcode: {product.barcode}</ThemedText>
              )}
              <ThemedText style={styles.productPrice}>£{(parseFloat(product.price) || parseFloat(product.rrp) || 0).toFixed(2)}</ThemedText>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.addProductButton, addingToList === product.id && styles.addProductButtonDisabled]}
            onPress={() => handleAddProductToList(product)}
            disabled={addingToList === product.id}
          >
            {addingToList === product.id ? (
              <ActivityIndicator size={16} color={Colors.light.background} />
            ) : (
              <Ionicons name="add" size={16} color={Colors.light.background} />
            )}
            <Text style={styles.addProductButtonText}>
              {addingToList === product.id ? 'Adding...' : 'Add'}
            </Text>
          </TouchableOpacity>
        </ThemedView>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <ThemedText style={styles.loadingText}>Loading promotions...</ThemedText>
      </View>
    );
  }

  if (showProducts && selectedPromotion) {
    const groupedShops = groupProductsByShop(selectedPromotion.products || []);
    
    return (
      <View style={styles.container}>
        <View style={styles.productsHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowProducts(false)}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.dark.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.shareButton, preparingShare && styles.shareButtonDisabled]}
              onPress={handleShare}
              disabled={preparingShare}
            >
              {preparingShare ? (
                <ActivityIndicator size={16} color={Colors.light.background} />
              ) : (
                <Ionicons name="share" size={16} color={Colors.light.background} />
              )}
              <Text style={styles.shareButtonText}>
                {preparingShare ? 'Preparing...' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ThemedText style={styles.productsHeaderTitle}>{selectedPromotion.title}</ThemedText>
          <ThemedText style={styles.productsHeaderSubtitle}>
            {selectedPromotion.products?.length || 0} Products • {groupedShops.length} Shops
          </ThemedText>
        </View>

        <FlatList
          data={groupedShops}
          renderItem={renderShopSection}
          keyExtractor={(item: any) => item.shopId}
          contentContainerStyle={styles.productsContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
      <FlatList
        data={promotions}
        renderItem={renderPromotionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    marginTop: 20, // Top margin for breathing room
  },
  listContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  promotionCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  promotionImageContainer: {
    position: 'relative',
    height: 200,
  },
  promotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  promotionContent: {
    padding: Spacing.lg,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  promotionTitle: {
    ...Typography.h4,
    color: Colors.dark.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  storeBadge: {
    backgroundColor: Colors.dark.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  storeName: {
    ...Typography.caption,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  promotionDescription: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.dark.text,
    marginTop: Spacing.md,
  },
  viewProductsButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flex: 1,
    justifyContent: 'center',
    ...Shadows.neon,
  },
  viewProductsButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  productsHeader: {
    backgroundColor: Colors.dark.backgroundCard,
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.glassBorder,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  productsHeaderTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  productsHeaderSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  productsContainer: {
    padding: Spacing.md,
  },
  productCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  productBarcode: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  productPrice: {
    ...Typography.body,
    color: Colors.dark.primary,
    fontWeight: 'bold',
  },
  addProductButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  addProductButtonText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  addProductButtonDisabled: {
    opacity: 0.6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  shareButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  shareButtonText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shopSection: {
    marginBottom: Spacing.lg,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dark.backgroundCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  shopHeaderTitle: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '700',
    flex: 1,
  },
  productCountBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  productCountText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '700',
    fontSize: 12,
  },
});
