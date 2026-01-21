import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import listService from '@/services/listService';
import productService, { ListProduct, ProductAtShop, Product } from '@/services/productService';
import { generateShoppingListPDF, sharePDF } from '@/utils/pdfExport';
import { getProductImageUrl } from '@/utils/imageUtils';

export default function ListDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const listName = params.listName as string;

  console.log('List Details Screen - Route params:', { listId, listName });

  const [products, setProducts] = useState<ListProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchMode, setSearchMode] = useState<'barcode' | 'name'>('barcode');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isOpeningScanner, setIsOpeningScanner] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [isAddingByBarcode, setIsAddingByBarcode] = useState(false);
  const [isAddingById, setIsAddingById] = useState(false);
  const [isAddingFromScanner, setIsAddingFromScanner] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<ListProduct[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSharingPDF, setIsSharingPDF] = useState(false);

  // Animation values
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchListProducts();
  }, [listId]);

  // Refresh list when screen comes into focus (e.g., returning from scanner)
  useFocusEffect(
    React.useCallback(() => {
      console.log('List details screen focused - refreshing products');
      fetchListProducts();
    }, [listId])
  );

  const fetchListProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching list from API...');
      const list = await listService.getListById(listId);
      console.log('📦 Full API response:', JSON.stringify(list, null, 2));
      console.log('📦 Products with quantities:', list.products?.map((p: any) => ({ name: p.productName, quantity: p.quantity })));
      setProducts(list.products || []);
      setFilteredProducts(list.products || []);
    } catch (error: any) {
      console.error('Error fetching list products:', error);
      Alert.alert('Error', error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchListProducts();
    setRefreshing(false);
  };

  const showSuccessAnimation = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
      });
    }, 2000);
  };

  const handleAddProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    try {
      setIsAddingByBarcode(true);

      // Search for product by barcode
      const product = await productService.searchByBarcode(barcode.trim());
      
      if (!product) {
        Alert.alert('Error', 'Product not found');
        return;
      }
      
      // Add product to list
      const result = await productService.addProductToList(listId, product.id);
      
      // Direct update: construct ListProduct from API response and product data
      const addedProduct: ListProduct = {
        id: `temp-${Date.now()}`, // Temporary ID until refresh
        productId: product.id,
        productAtShopId: '', // We don't have this from the API
        productName: result.data.productName,
        barcode: product.barcode || '',
        aielNumber: product.aielNumber || '',
        lowestPrice: result.data.lowestPrice,
        originalPrice: result.data.originalPrice,
        offerPrice: result.data.offerPrice,
        hasActiveOffer: result.data.hasActiveOffer,
        shopName: result.data.shopName,
        availableInShops: result.data.availableInShops,
        quantity: 1, // Default quantity
      };
      
      // Add to local state
      setProducts(prevProducts => [...prevProducts, addedProduct]);
      setFilteredProducts(prevProducts => [...prevProducts, addedProduct]);
      
      // Clear search for next product
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error adding product:', error);
      Alert.alert('Error', error.message || 'Failed to add product. Please check the barcode.');
    } finally {
      setIsAddingByBarcode(false);
    }
  };

  const handleSearchProducts = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoadingResults(true);
      console.log('Searching for:', query.trim());
      const results = await productService.searchProducts(query.trim());
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Error searching products:', error);
      Alert.alert('Error', error.message || 'Failed to search products');
      setSearchResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleAddProductById = async (product: Product) => {
    try {
      setIsAddingById(true);
      setAddingProductId(product.id);
      
      console.log('Adding product to list:', { listId, productId: product.id });
      
      // Add product to list
      const result = await productService.addProductToList(listId, product.id);
      
      // Direct update: construct ListProduct from API response and product data
      const addedProduct: ListProduct = {
        id: `temp-${Date.now()}`, // Temporary ID until refresh
        productId: product.id,
        productAtShopId: '', // We don't have this from the API
        productName: result.data.productName,
        barcode: product.barcode || '',
        aielNumber: product.aielNumber || '',
        lowestPrice: result.data.lowestPrice,
        originalPrice: result.data.originalPrice,
        offerPrice: result.data.offerPrice,
        hasActiveOffer: result.data.hasActiveOffer,
        shopName: result.data.shopName,
        availableInShops: result.data.availableInShops,
        quantity: 1, // Default quantity
      };
      
      // Add to local state
      setProducts(prevProducts => [...prevProducts, addedProduct]);
      setFilteredProducts(prevProducts => [...prevProducts, addedProduct]);
      
      // Clear search for next product
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error adding product:', error);
      // Show the specific error message from backend
      const errorMsg = error.message || 'Failed to add product';
      Alert.alert('Cannot Add Product', errorMsg);
    } finally {
      setIsAddingById(false);
      setAddingProductId(null);
    }
  };

  // Debounce search
  useEffect(() => {
    if (searchMode === 'name' && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        handleSearchProducts(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchMode]);

  // Filter products in the list
  useEffect(() => {
    if (listSearchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = listSearchQuery.toLowerCase();
      const filtered = products.filter(
        (item) =>
          item.productName.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query) ||
          item.shopName?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [listSearchQuery, products]);

  const handleOpenScanner = () => {
    // Close any open modals/popups
    setShowAddModal(false);
    setShowScanner(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // Navigate to barcode scanner screen
    console.log('Navigating to barcode scanner...');
    router.push({
      pathname: '/(tabs)/barcode-scanner',
      params: {
        listId,
        listName,
      },
    });
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    console.log(`Barcode scanned: ${data} (Type: ${type})`);
    
    try {
      setShowScanner(false);
      setIsAddingFromScanner(true);
      
      const product = await productService.searchByBarcode(data);
      
      if (product) {
        Alert.alert(
          'Product Found',
          `${product.title}\nBarcode: ${product.barcode}\n\nAdd to list?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add',
              onPress: async () => {
                try {
                  const result = await productService.addProductToList(listId, product.id);
                  
                  // Direct update: construct ListProduct from API response and product data
                  const addedProduct: ListProduct = {
                    id: `temp-${Date.now()}`, // Temporary ID until refresh
                    productId: product.id,
                    productAtShopId: '', // We don't have this from the API
                    productName: result.data.productName,
                    barcode: product.barcode || '',
                    aielNumber: product.aielNumber || '',
                    lowestPrice: result.data.lowestPrice,
                    originalPrice: result.data.originalPrice,
                    offerPrice: result.data.offerPrice,
                    hasActiveOffer: result.data.hasActiveOffer,
                    shopName: result.data.shopName,
                    availableInShops: result.data.availableInShops,
                    quantity: 1, // Default quantity
                  };
                  
                  // Add to local state
                  setProducts(prevProducts => [...prevProducts, addedProduct]);
                  setFilteredProducts(prevProducts => [...prevProducts, addedProduct]);
                  // Product added successfully - no popup needed
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to add product');
                }
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error with scanned barcode:', error);
      Alert.alert('Error', error.message || 'Product not found');
    } finally {
      setIsAddingFromScanner(false);
    }
  };

  const handleRemoveProduct = async (productId: string, productName: string) => {
    console.log('handleRemoveProduct called with:', { listId, productId, productName });
    
    Alert.alert(
      'Remove Product',
      `Remove "${productName}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to remove product:', { listId, productId });
              await productService.removeProductFromList(listId, productId);
              await fetchListProducts();
              showSuccessAnimation('Product removed');
            } catch (error: any) {
              console.error('Error removing product:', error);
              Alert.alert('Error', error.message || 'Failed to remove product');
            }
          },
        },
      ]
    );
  };

  const handleQuantityChange = async (product: ListProduct, change: number) => {
    const currentQuantity = product.quantity || 1;
    const newQuantity = currentQuantity + change;
    
    if (newQuantity < 1) return; // Don't allow quantity below 1

    try {
      // Optimistically update the UI
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.productId === product.productId 
            ? { ...p, quantity: newQuantity }
            : p
        )
      );

      setFilteredProducts(prevProducts => 
        prevProducts.map(p => 
          p.productId === product.productId 
            ? { ...p, quantity: newQuantity }
            : p
        )
      );

      // Call the API to update the backend
      // Use product.id which is the ListProduct id
      console.log('📦 Updating quantity:', { listId, listProductId: product.id, productAtShopId: product.productAtShopId, newQuantity });
      const result = await listService.updateProductQuantity(listId, product.id, newQuantity);
      console.log('✅ Quantity updated in database:', { productId: product.productId, newQuantity, result });
      
    } catch (error) {
      console.error('Failed to update quantity:', error);
      // Revert the optimistic update
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.productId === product.productId 
            ? { ...p, quantity: currentQuantity }
            : p
        )
      );
      setFilteredProducts(prevProducts => 
        prevProducts.map(p => 
          p.productId === product.productId 
            ? { ...p, quantity: currentQuantity }
            : p
        )
      );
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const renderProductItem = ({ item }: { item: ListProduct }) => {
    const currentQuantity = item.quantity || 1;
    const imageUrl = getProductImageUrl(item.img, item.barcode);
    
    return (
      <View style={styles.productCard}>
        {/* Product Image */}
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color={Colors.dark.textLight} />
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.productName}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemoveProduct(item.productId, item.productName)}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.dark.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.compactRow}>
            <View style={styles.priceSection}>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>£{Number(item.lowestPrice).toFixed(2)}</Text>
                {item.hasActiveOffer && (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerBadgeText}>OFFER</Text>
                  </View>
                )}
              </View>
              {item.hasActiveOffer && item.originalPrice && (
                <Text style={styles.originalPrice}>
                  Was £{Number(item.originalPrice).toFixed(2)}
                </Text>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.shopSection}>
              <Ionicons name="storefront-outline" size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.shopName} numberOfLines={1}>
                {item.shopName || 'Unknown Shop'}
              </Text>
            </View>
            
            {item.barcode && (
              <>
                <View style={styles.divider} />
                <View style={styles.barcodeSection}>
                  <Ionicons name="barcode-outline" size={12} color={Colors.dark.textLight} />
                  <Text style={styles.barcodeText} numberOfLines={1}>{item.barcode}</Text>
                </View>
              </>
            )}
          </View>
          
          {/* Quantity Controls */}
          <View style={styles.quantitySection}>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={[styles.quantityButton, currentQuantity <= 1 && { opacity: 0.5 }]}
                onPress={() => handleQuantityChange(item, -1)}
                disabled={currentQuantity <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={16} 
                  color={Colors.dark.background} 
                />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>Qty: {currentQuantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item, 1)}
              >
                <Ionicons 
                  name="add" 
                  size={16} 
                  color={Colors.dark.background} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleExportPDF = async (sortBy: 'money' | 'nearest') => {
    try {
      setShowExportModal(false);
      setIsSharingPDF(true);
      
      // Check if nearby shop option is selected - Coming Soon
      if (sortBy === 'nearest') {
        setIsSharingPDF(false);
        Alert.alert(
          'Coming Soon! 🚀',
          'Sort by nearest shop feature is under development. We\'ll notify you when it\'s ready!',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Group products by shop and create stores
      const productsByShop = products.reduce((acc, product) => {
        const shopName = product.shopName || 'Unknown Shop';
        if (!acc[shopName]) {
          acc[shopName] = [];
        }
        acc[shopName].push(product);
        return acc;
      }, {} as Record<string, typeof products>);

      // Create mock stores for each unique shop
      const mockStores = Object.keys(productsByShop).map((shopName, index) => ({
        id: `store${index}`,
        name: shopName,
        address: 'Address not available',
        location: { latitude: 51.5074, longitude: -0.1278 }
      }));

      // Create store lookup map
      const storeMap = mockStores.reduce((acc, store, index) => {
        acc[store.name] = `store${index}`;
        return acc;
      }, {} as Record<string, string>);

      const listData: any = {
        id: listId,
        name: listName,
        items: products.map(p => {
          const shopName = p.shopName || 'Unknown Shop';
          const storeId = storeMap[shopName];
          return {
            id: p.id,
            productId: p.productId,
            quantity: p.quantity || 1, // Use actual quantity from product
            isPurchased: false,
            product: {
              id: p.productId,
              name: p.productName,
              category: 'General',
              barcode: p.barcode || '',
              aielNumber: p.aielNumber || '',
            },
            bestPrice: {
              price: Number(p.lowestPrice),
              storeId: storeId,
            },
            allPrices: [{
              price: Number(p.lowestPrice),
              storeId: storeId,
            }]
          };
        })
      };

      const mockProductPrices = products.map(p => {
        const shopName = p.shopName || 'Unknown Shop';
        const storeId = storeMap[shopName];
        return {
          productId: p.productId,
          storeId: storeId,
          price: Number(p.lowestPrice),
          inStock: true,
          lastUpdated: new Date().toISOString()
        };
      });

      const uri = await generateShoppingListPDF({
        list: listData,
        stores: mockStores,
        productPrices: mockProductPrices,
        sortBy,
      });

      // Add a small delay to ensure UI is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await sharePDF(uri, `${listName}-shopping-list.pdf`);
      
      setIsSharingPDF(false);
      showSuccessAnimation('PDF shared successfully!');
      
    } catch (error: any) {
      console.error('PDF export error:', error);
      setIsSharingPDF(false);
      
      // More specific error messages
      const errorMessage = error.message?.includes('cancelled') 
        ? 'Share was cancelled' 
        : error.message?.includes('not available')
        ? 'Sharing not available on this device'
        : 'Failed to share PDF. Please try again.';
      
      Alert.alert('Share Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{listName}</Text>
          <Text style={styles.headerSubtitle}>{products.length} items</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collect Button - Prominent at top */}
      {products.length > 0 && (
        <TouchableOpacity
          style={styles.collectButton}
          onPress={() => router.push({
            pathname: '/list/collect',
            params: { listId, listName }
          })}
        >
          <Ionicons name="cart" size={24} color={Colors.dark.background} />
          <View style={styles.collectButtonTextContainer}>
            <Text style={styles.collectButtonTitle}>Start Collecting</Text>
            <Text style={styles.collectButtonSubtitle}>Enter an incorrect price to extend your premium subscription</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.background} />
        </TouchableOpacity>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listSearchContainer}>
            <Ionicons name="search-outline" size={20} color={Colors.dark.textSecondary} style={styles.listSearchIcon} />
            <TextInput
              style={styles.listSearchInput}
              value={listSearchQuery}
              onChangeText={setListSearchQuery}
              placeholder="Search in list..."
              placeholderTextColor={Colors.dark.textLight}
              returnKeyType="search"
            />
            {listSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setListSearchQuery('')} style={styles.listSearchClear}>
                <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        }
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={listSearchQuery ? "search-outline" : "basket-outline"} size={80} color={Colors.dark.textLight} />
            <Text style={styles.emptyStateTitle}>
              {listSearchQuery ? 'No Results Found' : 'No Products Yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {listSearchQuery 
                ? 'Try searching with different keywords'
                : 'Start adding products to your list by tapping the + button above'
              }
            </Text>
          </View>
        }
      />

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => {
              setShowAddModal(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            {/* Search Mode Toggle */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, searchMode === 'barcode' && styles.activeTab]}
                onPress={() => {
                  setSearchMode('barcode');
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons
                  name="barcode-outline"
                  size={20}
                  color={searchMode === 'barcode' ? Colors.dark.primary : Colors.dark.textSecondary}
                />
                <Text style={[
                  styles.tabText,
                  searchMode === 'barcode' && styles.activeTabText
                ]}>
                  Barcode
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tab, searchMode === 'name' && styles.activeTab]}
                onPress={() => {
                  setSearchMode('name');
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={searchMode === 'name' ? Colors.dark.primary : Colors.dark.textSecondary}
                />
                <Text style={[
                  styles.tabText,
                  searchMode === 'name' && styles.activeTabText
                ]}>
                  Search Name
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalLabel}>
                {searchMode === 'barcode' ? 'Enter Barcode' : 'Search Product Name'}
              </Text>
              <View style={styles.searchContainer}>
                <Ionicons
                  name={searchMode === 'barcode' ? 'barcode-outline' : 'search-outline'}
                  size={20}
                  color={Colors.dark.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={searchMode === 'barcode' ? 'Scan or type barcode...' : 'Type product name...'}
                  placeholderTextColor={Colors.dark.textLight}
                  keyboardType={searchMode === 'barcode' ? 'numeric' : 'default'}
                  onSubmitEditing={() => {
                    if (searchMode === 'barcode') {
                      handleAddProductByBarcode(searchQuery);
                    }
                  }}
                  returnKeyType={searchMode === 'barcode' ? 'search' : 'done'}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results for Name Search */}
              {searchMode === 'name' && (
                <>
                  {isLoadingResults && (
                    <View style={styles.loadingResults}>
                      <ActivityIndicator size="small" color={Colors.dark.primary} />
                      <Text style={styles.loadingResultsText}>Searching...</Text>
                    </View>
                  )}
                  
                  {!isLoadingResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <View style={styles.noResults}>
                      <Ionicons name="search-outline" size={40} color={Colors.dark.textLight} />
                      <Text style={styles.noResultsText}>No products found</Text>
                    </View>
                  )}

                  {searchResults.length > 0 && (
                    <View style={styles.resultsContainer}>
                      <Text style={styles.resultsLabel}>
                        {searchResults.length} product{searchResults.length > 1 ? 's' : ''} found
                      </Text>
                      {searchResults.map((product) => {
                        const imageUrl = getProductImageUrl(product.img, product.barcode);
                        return (
                          <TouchableOpacity
                            key={product.id}
                            style={styles.resultItem}
                            onPress={() => handleAddProductById(product)}
                            disabled={isAddingById && addingProductId === product.id}
                          >
                            {/* Product Image */}
                            <View style={styles.resultImageContainer}>
                              {imageUrl ? (
                                <Image 
                                  source={{ uri: imageUrl }}
                                  style={styles.resultImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <View style={styles.resultImagePlaceholder}>
                                  <Ionicons name="cube-outline" size={28} color={Colors.dark.textLight} />
                                </View>
                              )}
                            </View>
                            
                            <View style={styles.resultInfo}>
                              <Text style={styles.resultTitle} numberOfLines={2}>
                                {product.title}
                              </Text>
                              {product.barcode && (
                                <Text style={styles.resultBarcode}>
                                  Barcode: {product.barcode}
                                </Text>
                              )}
                              <View style={styles.resultMeta}>
                                <Ionicons name="storefront" size={14} color={Colors.dark.textSecondary} />
                                <Text style={styles.resultMetaText}>
                                  {product.availableInShops} shop{product.availableInShops !== 1 ? 's' : ''}
                                </Text>
                                {product.lowestPrice && (
                                  <>
                                    <Text style={styles.resultMetaDot}>•</Text>
                                    <Text style={styles.resultPrice}>
                                      £{product.lowestPrice.toFixed(2)}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                            {isAddingById && addingProductId === product.id ? (
                              <ActivityIndicator size="small" color={Colors.dark.primary} />
                            ) : (
                              <Ionicons name="add-circle" size={32} color={Colors.dark.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Scan Button - Only for Barcode Mode */}
              {searchMode === 'barcode' && (
                <>
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={handleOpenScanner}
                    disabled={isAddingFromScanner}
                  >
                    {isAddingFromScanner ? (
                      <ActivityIndicator size="small" color={Colors.dark.primary} />
                    ) : (
                      <Ionicons name="scan" size={24} color={Colors.dark.primary} />
                    )}
                    <Text style={styles.scanButtonText}>
                      {isAddingFromScanner ? 'Processing...' : 'Scan Barcode'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => handleAddProductByBarcode(searchQuery)}
                    disabled={!searchQuery.trim() || isAddingByBarcode}
                  >
                    {isAddingByBarcode ? (
                      <ActivityIndicator size="small" color={Colors.dark.background} />
                    ) : (
                      <Text style={styles.submitButtonText}>Add Product</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Overlay */}
      {isSharingPDF && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>
              Preparing PDF for sharing...
            </Text>
          </View>
        </View>
      )}

      {/* Success Animation */}
      <Modal transparent visible={showSuccess} animationType="none">
        <View style={styles.successOverlay}>
          <Animated.View
            style={[
              styles.successCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={60} color={Colors.dark.success} />
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
          />
          
          {/* Overlay on top of camera */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                style={styles.scannerCloseButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Barcode</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <Text style={styles.scannerInstruction}>
              Position the barcode within the frame
            </Text>
          </View>
        </View>
      </Modal>

      {/* Export PDF Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity 
          style={styles.exportModalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <View style={styles.exportModalContent}>
            <Text style={styles.exportModalTitle}>Share Shopping List</Text>
            <Text style={styles.exportModalSubtitle}>Choose how to organize your PDF:</Text>
            
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExportPDF('money')}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: Colors.dark.success + '20' }]}>
                <Ionicons name="cash-outline" size={28} color={Colors.dark.success} />
              </View>
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>By Money Saving</Text>
                <Text style={styles.exportOptionDescription}>Sort by best deals and savings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExportPDF('nearest')}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: Colors.dark.info + '20' }]}>
                <Ionicons name="location-outline" size={28} color={Colors.dark.info} />
              </View>
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>By Nearest Store</Text>
                <Text style={styles.exportOptionDescription}>Sort by closest store locations</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportCancelButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.exportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  addButton: {
    padding: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shareButton: {
    backgroundColor: Colors.dark.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    elevation: 4,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  collectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.success || '#4CAF50',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.lg,
  },
  collectButtonTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  collectButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  collectButtonSubtitle: {
    fontSize: 12,
    color: Colors.dark.background,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
  },
  listContainer: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  listSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  listSearchIcon: {
    marginRight: Spacing.xs,
  },
  listSearchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    color: Colors.dark.text,
    ...Typography.body,
    fontSize: 14,
  },
  listSearchClear: {
    padding: Spacing.xs / 2,
  },
  productCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadows.md,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  productInfo: {
    flex: 1,
    padding: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  productName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  removeButton: {
    padding: Spacing.xs / 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.dark.border,
  },
  shopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 70,
  },
  barcodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 80,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  shopName: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    flexShrink: 1,
  },
  lowestPriceLabel: {
    ...Typography.caption,
    color: Colors.dark.success,
    fontWeight: '600',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  barcodeText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.dark.textLight,
    fontFamily: 'monospace',
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  originalPrice: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.dark.textLight,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  price: {
    ...Typography.h4,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  oldPrice: {
    ...Typography.body,
    color: Colors.dark.textLight,
    textDecorationLine: 'line-through',
  },
  offerPrice: {
    ...Typography.h3,
    color: Colors.dark.success,
  },
  offerBadge: {
    backgroundColor: Colors.dark.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  offerBadgeText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl * 2,
  },
  emptyStateTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: Colors.dark.backgroundCard,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  modalContent: {
    padding: Spacing.lg,
    maxHeight: 500,
  },
  modalLabel: {
    ...Typography.label,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.lg,
  },
  searchIcon: {
    marginLeft: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: Colors.dark.text,
    ...Typography.body,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dark.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    marginBottom: Spacing.lg,
  },
  scanButtonText: {
    ...Typography.label,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.dark.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.neon,
  },
  submitButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
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
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl * 1.5,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.dark.success,
    ...Shadows.neon,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  successMessage: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.dark.primary,
  },
  tabText: {
    ...Typography.label,
    color: Colors.dark.textSecondary,
  },
  activeTabText: {
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  clearButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  loadingResults: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  loadingResultsText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  noResultsText: {
    ...Typography.body,
    color: Colors.dark.textLight,
    marginTop: Spacing.md,
  },
  resultsContainer: {
    marginTop: Spacing.md,
  },
  resultsLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  resultImageContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    marginRight: Spacing.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  resultInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  resultTitle: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  resultBarcode: {
    ...Typography.caption,
    color: Colors.dark.textLight,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultMetaText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  resultMetaDot: {
    ...Typography.caption,
    color: Colors.dark.textLight,
  },
  resultPrice: {
    ...Typography.caption,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  // Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  scannerTitle: {
    ...Typography.h3,
    color: '#fff',
    textAlign: 'center',
  },
  scannerFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: Colors.dark.primary,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: '30%',
    left: '15%',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: '30%',
    right: '15%',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: '30%',
    left: '15%',
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: '30%',
    right: '15%',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scannerInstruction: {
    ...Typography.body,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 20,
  },
  // Export Modal Styles
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  exportModalContent: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  exportModalTitle: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  exportModalSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.glass,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  exportOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportOptionDescription: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  exportCancelButton: {
    backgroundColor: Colors.dark.glass,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  exportCancelText: {
    ...Typography.body,
    color: Colors.dark.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Quantity Control Styles
  quantitySection: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  quantityButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.primary,
    borderWidth: 0,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  quantityText: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 14,
  },
});
