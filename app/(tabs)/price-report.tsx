import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { priceReportsAPI } from '@/services/api';
import { getProductImageUrl } from '@/utils/imageUtils';

interface PriceReport {
  id: string;
  reporterId: number;
  productId: string;
  shopId: string;
  currentPrice: number;
  reportedPrice: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  pointsAwarded: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  product: {
    id: string;
    title: string;
    barcode?: string;
  };
  shop: {
    id: string;
    name: string;
    address: string;
  };
}

export default function PriceReportScreen() {
  const { state } = useApp();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [reportedPrice, setReportedPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [userEarnings, setUserEarnings] = useState(0);
  
  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [showProductResults, setShowProductResults] = useState(false);
  
  // Shop search states
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [shopResults, setShopResults] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [showShopResults, setShowShopResults] = useState(false);
  
  useEffect(() => {
    fetchUserReports();
  }, []);

  useEffect(() => {
    if (selectedProduct && selectedShop) {
      fetchCurrentPrice();
    }
  }, [selectedProduct, selectedShop]);

  // Debounced product search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (productSearchQuery.trim().length > 1) {
        searchProducts(productSearchQuery);
      } else {
        setProductResults([]);
        setShowProductResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [productSearchQuery]);

  // Load all shops when product is selected
  useEffect(() => {
    if (selectedProduct) {
      loadAllShopsForProduct();
    } else {
      setShopResults([]);
      setShowShopResults(false);
    }
  }, [selectedProduct]);

  // Debounced shop search (for filtering)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shopSearchQuery.trim().length > 1 && selectedProduct) {
        searchShops(shopSearchQuery);
      } else if (selectedProduct) {
        loadAllShopsForProduct(); // Show all shops if no search query
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [shopSearchQuery, selectedProduct]);

  const searchProducts = async (query: string) => {
    if (!query.trim()) return;
    
    setProductLoading(true);
    try {
      const data = await priceReportsAPI.searchProducts(query, 10);
      setProductResults(data.products || []);
      setShowProductResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
      setProductResults([]);
    } finally {
      setProductLoading(false);
    }
  };

  const loadAllShopsForProduct = async () => {
    if (!selectedProduct) return;
    
    setShopLoading(true);
    try {
      const data = await priceReportsAPI.getShopsForProduct(selectedProduct.id, 50);
      setShopResults(data.shops || []);
      setShowShopResults(true);
    } catch (error) {
      console.error('Error loading shops for product:', error);
      setShopResults([]);
    } finally {
      setShopLoading(false);
    }
  };

  const searchShops = async (query: string) => {
    if (!query.trim() || !selectedProduct) return;
    
    setShopLoading(true);
    try {
      const data = await priceReportsAPI.searchShopsForProduct(selectedProduct.id, query, 10);
      setShopResults(data.shops || []);
      setShowShopResults(true);
    } catch (error) {
      console.error('Error searching shops:', error);
      setShopResults([]);
    } finally {
      setShopLoading(false);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      const data = await priceReportsAPI.getCurrentPrice(selectedProduct.id, selectedShop.id);
      setCurrentPrice(data.price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      setCurrentPrice(null);
    }
  };

  const fetchUserReports = async () => {
    try {
      const data = await priceReportsAPI.getUserReports();
      setReports(data.reports);
      setUserEarnings(data.earnings);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const submitReport = async () => {
    if (!selectedProduct || !selectedShop || !reportedPrice) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const price = parseFloat(reportedPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setLoading(true);

    try {
      await priceReportsAPI.submitReport({
        productId: selectedProduct.id,
        shopId: selectedShop.id,
        reportedPrice: price,
        currentPrice: currentPrice || undefined
      });

      Alert.alert(
        'Success!', 
        'Price report submitted successfully. You will earn 1 point when approved by admin.',
        [{ text: 'OK', onPress: () => {
          setSelectedProduct(null);
          setSelectedShop(null);
          setProductSearchQuery('');
          setShopSearchQuery('');
          setReportedPrice('');
          setCurrentPrice(null);
          setShowProductResults(false);
          setShowShopResults(false);
          fetchUserReports();
        }}]
      );
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Network error. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return Colors.light.success;
      case 'REJECTED': return Colors.light.error;
      default: return Colors.light.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'checkmark-circle';
      case 'REJECTED': return 'close-circle';
      default: return 'time';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(item) => item.key}
          renderItem={() => (
            <View>
              {/* Header */}
              <ThemedView style={styles.header}>
                <ThemedText style={styles.title}>Report Wrong Price</ThemedText>
                <ThemedText style={styles.subtitle}>
                  Help improve price accuracy and earn points
                </ThemedText>
              </ThemedView>

        {/* Earnings Card */}
        <ThemedView style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="star" size={24} color={Colors.light.primary} />
            <ThemedText style={styles.earningsTitle}>Your Points</ThemedText>
          </View>
          <ThemedText style={styles.earningsValue}>{userEarnings}</ThemedText>
          <ThemedText style={styles.earningsSubtext}>
            Earn 1 point for each approved report
          </ThemedText>
        </ThemedView>

        {/* Report Form */}
        <ThemedView style={styles.formCard}>
          <ThemedText style={styles.formTitle}>Submit New Report</ThemedText>

          {/* Product Search */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Search Product</ThemedText>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
                placeholder="Search products..."
                placeholderTextColor={Colors.dark.textSecondary}
              />
              <Ionicons 
                name="search" 
                size={20} 
                color={Colors.dark.textSecondary} 
                style={styles.searchIcon}
              />
              {productLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={Colors.light.primary} 
                  style={styles.loadingIcon}
                />
              )}
            </View>
            
            {/* Selected Product Display */}
            {selectedProduct && (
              <TouchableOpacity 
                style={styles.selectedItem}
                onPress={() => {
                  setSelectedProduct(null);
                  setSelectedShop(null);
                  setProductSearchQuery('');
                  setShopSearchQuery('');
                  setCurrentPrice(null);
                }}
              >
                <View style={styles.selectedItemContent}>
                  <ThemedText style={styles.selectedItemText}>{selectedProduct.title}</ThemedText>
                  {selectedProduct.barcode && (
                    <ThemedText style={styles.selectedItemSubtext}>
                      Barcode: {selectedProduct.barcode}
                    </ThemedText>
                  )}
                </View>
                <Ionicons name="close-circle" size={20} color={Colors.light.error} />
              </TouchableOpacity>
            )}
            
            {/* Product Search Results */}
            {showProductResults && productResults.length > 0 && (
              <View style={styles.dropdownContainer}>
                <FlatList
                  data={productResults}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEnabled={true}
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.dropdownList}
                  renderItem={({ item: product }) => {
                    const imageUrl = getProductImageUrl(product.img, product.barcode);
                    return (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedProduct(product);
                          setProductSearchQuery('');
                          setShowProductResults(false);
                          setSelectedShop(null);
                          setShopSearchQuery('');
                          setCurrentPrice(null);
                        }}
                      >
                        {/* Product Image */}
                        <View style={styles.dropdownImageContainer}>
                          {imageUrl ? (
                            <Image 
                              source={{ uri: imageUrl }}
                              style={styles.dropdownImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.dropdownImagePlaceholder}>
                              <Ionicons name="cube-outline" size={20} color={Colors.dark.textLight} />
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.dropdownItemContent}>
                          <ThemedText style={styles.dropdownTitle} numberOfLines={2}>
                            {product.title}
                          </ThemedText>
                          {product.barcode && (
                            <ThemedText style={styles.dropdownSubtitle}>
                              Barcode: {product.barcode}
                            </ThemedText>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}
          </View>

          {/* Shop Selection - Only show if product is selected */}
          {selectedProduct && (
            <View style={styles.inputGroup}>
              <View style={styles.shopSectionHeader}>
                <ThemedText style={styles.label}>Select Shop</ThemedText>
                <ThemedText style={styles.shopCount}>
                  {shopResults.length} shops available
                </ThemedText>
              </View>
              
              {/* Optional search to filter shops */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={shopSearchQuery}
                  onChangeText={setShopSearchQuery}
                  placeholder="Filter shops..."
                  placeholderTextColor={Colors.dark.textSecondary}
                />
                <Ionicons 
                  name="search" 
                  size={20} 
                  color={Colors.dark.textSecondary} 
                  style={styles.searchIcon}
                />
                {shopLoading && (
                  <ActivityIndicator 
                    size="small" 
                    color={Colors.light.primary} 
                    style={styles.loadingIcon}
                  />
                )}
              </View>
              
              {/* Selected Shop Display */}
              {selectedShop && (
                <TouchableOpacity 
                  style={styles.selectedItem}
                  onPress={() => {
                    setSelectedShop(null);
                    setShopSearchQuery('');
                    setCurrentPrice(null);
                  }}
                >
                  <View style={styles.selectedItemContent}>
                    <ThemedText style={styles.selectedItemText}>{selectedShop.name}</ThemedText>
                    <ThemedText style={styles.selectedItemSubtext}>{selectedShop.address}</ThemedText>
                  </View>
                  <Ionicons name="close-circle" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              )}
              
              {/* Shop List - Show all available shops */}
              {!selectedShop && shopResults.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <View style={styles.dropdownContent}>
                    {shopResults.map((shop, index) => (
                      <View key={shop.id}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedShop(shop);
                            setShopSearchQuery('');
                            setShowShopResults(false);
                          }}
                        >
                          <View style={styles.dropdownItemContent}>
                            <ThemedText style={styles.dropdownTitle} numberOfLines={2}>
                              {shop.name}
                            </ThemedText>
                            <ThemedText style={styles.dropdownSubtitle} numberOfLines={1}>
                              {shop.address}
                            </ThemedText>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
                        </TouchableOpacity>
                        {index < shopResults.length - 1 && <View style={styles.separator} />}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Current Price Display */}
          {currentPrice !== null && currentPrice !== undefined && (
            <View style={styles.priceInfo}>
              <ThemedText style={styles.priceLabel}>Current Price:</ThemedText>
              <ThemedText style={styles.priceValue}>£{Number(currentPrice).toFixed(2)}</ThemedText>
            </View>
          )}

          {/* Reported Price Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Correct Price (£)</ThemedText>
            <TextInput
              style={styles.priceInput}
              value={reportedPrice}
              onChangeText={setReportedPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={submitReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.background} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={Colors.light.background} />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </ThemedView>

        {/* Reports History */}
        <ThemedView style={styles.historyCard}>
          <ThemedText style={styles.historyTitle}>Your Reports</ThemedText>
          
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.emptyText}>No reports yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Submit your first price report to help improve price accuracy
              </ThemedText>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportStatus}>
                    <Ionicons
                      name={getStatusIcon(report.status)}
                      size={16}
                      color={getStatusColor(report.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                      {report.status}
                    </Text>
                  </View>
                  <Text style={styles.reportDate}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <ThemedText style={styles.reportProduct}>{report.product.title}</ThemedText>
                <ThemedText style={styles.reportShop}>{report.shop.name}</ThemedText>

                <View style={styles.priceComparison}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceItemLabel}>Current:</Text>
                    <Text style={styles.priceItemValue}>
                      £{report.currentPrice ? Number(report.currentPrice).toFixed(2) : 'N/A'}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.dark.textSecondary} />
                  <View style={styles.priceItem}>
                    <Text style={styles.priceItemLabel}>Reported:</Text>
                    <Text style={styles.priceItemValue}>£{Number(report.reportedPrice).toFixed(2)}</Text>
                  </View>
                </View>

                {report.adminNotes && (
                  <View style={styles.adminNotes}>
                    <ThemedText style={styles.adminNotesLabel}>Admin Notes:</ThemedText>
                    <ThemedText style={styles.adminNotesText}>{report.adminNotes}</ThemedText>
                  </View>
                )}

                {report.pointsAwarded && (
                  <View style={styles.pointsAwarded}>
                    <Ionicons name="star" size={16} color={Colors.light.primary} />
                    <Text style={styles.pointsText}>+1 point earned</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ThemedView>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  earningsCard: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  earningsTitle: {
    ...Typography.bodyBold,
    marginLeft: Spacing.sm,
  },
  earningsValue: {
    ...Typography.h1,
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  earningsSubtext: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  formTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.bodyBold,
    marginBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.background,
    paddingRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.dark.text,
    fontSize: Typography.body.fontSize,
  },
  searchIcon: {
    marginLeft: Spacing.sm,
  },
  loadingIcon: {
    marginLeft: Spacing.sm,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.primary + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.primary + '50',
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemText: {
    ...Typography.bodyBold,
    color: Colors.dark.text,
  },
  selectedItemSubtext: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  shopSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shopCount: {
    ...Typography.caption,
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    maxHeight: 300,
    ...Shadows.md,
  },
  dropdownContent: {
    maxHeight: 298,
  },
  dropdownList: {
    flexGrow: 1,
    maxHeight: 298,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.dark.background,
  },
  dropdownImageContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    marginRight: Spacing.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownImage: {
    width: '100%',
    height: '100%',
  },
  dropdownImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  dropdownItemContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  dropdownTitle: {
    ...Typography.body,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  dropdownSubtitle: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.sm,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  priceLabel: {
    ...Typography.body,
  },
  priceValue: {
    ...Typography.bodyBold,
    color: Colors.light.primary,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    fontSize: Typography.body.fontSize,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.light.background,
  },
  historyCard: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  historyTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyBold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  reportItem: {
    backgroundColor: Colors.dark.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: 'bold',
  },
  reportDate: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  reportProduct: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  reportShop: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceItemLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  priceItemValue: {
    ...Typography.bodyBold,
    color: Colors.dark.text,
  },
  adminNotes: {
    backgroundColor: Colors.dark.backgroundCard,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  adminNotesLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  adminNotesText: {
    ...Typography.body,
  },
  pointsAwarded: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  pointsText: {
    ...Typography.body,
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
});