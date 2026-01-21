import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import listService from '@/services/listService';
import { ListProduct } from '@/services/productService';
import api from '@/services/api';

interface CollectableProduct extends ListProduct {
  isCollected: boolean;
  priceCorrection?: string;
  animValue: Animated.Value;
}

export default function CollectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const listName = params.listName as string;

  const [products, setProducts] = useState<CollectableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListProducts();
  }, [listId]);

  const fetchListProducts = async () => {
    try {
      setLoading(true);
      const list = await listService.getListById(listId);
      const productsWithState: CollectableProduct[] = (list.products || []).map((p: ListProduct) => ({
        ...p,
        isCollected: p.isPurchased || false, // Use persisted isPurchased from backend
        priceCorrection: '',
        animValue: new Animated.Value(p.isPurchased ? 1 : 0), // Set initial animation state based on isPurchased
      }));
      
      // Sort: uncollected items first, collected items at bottom
      const sortedProducts = productsWithState.sort((a, b) => {
        if (a.isCollected === b.isCollected) return 0;
        return a.isCollected ? 1 : -1;
      });
      
      setProducts(sortedProducts);
    } catch (error: any) {
      console.error('Error fetching list products:', error);
      Alert.alert('Error', error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollected = useCallback(async (productId: string) => {
    // First, optimistically update the UI
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p => {
        if (p.id === productId) {
          const newIsCollected = !p.isCollected;
          
          // Animate the strike-through and movement
          Animated.timing(p.animValue, {
            toValue: newIsCollected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
          }).start();
          
          return { ...p, isCollected: newIsCollected };
        }
        return p;
      });
      
      // Sort: uncollected items first, collected items at bottom
      return updatedProducts.sort((a, b) => {
        if (a.isCollected === b.isCollected) return 0;
        return a.isCollected ? 1 : -1;
      });
    });

    // Then, persist to backend
    try {
      await listService.togglePurchased(listId, productId);
      console.log('✅ Saved collected status for product:', productId);
    } catch (error) {
      console.error('❌ Failed to save collected status:', error);
      // Optionally revert the UI change on error
      // For now, we'll just log the error - the UI state might be out of sync
    }
  }, [listId]);

  const handlePriceCorrection = useCallback((productId: string, price: string) => {
    // Only allow numbers and decimal point
    const sanitizedPrice = price.replace(/[^0-9.]/g, '');
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, priceCorrection: sanitizedPrice } : p
    ));
  }, []);

  const handleSubmitCorrections = async () => {
    const corrections = products.filter(p => p.priceCorrection && parseFloat(p.priceCorrection) > 0);
    
    if (corrections.length === 0) {
      Alert.alert('No Corrections', 'No price corrections to submit.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Submit each price correction as a report
      for (const product of corrections) {
        await api.post('/price-reports', {
          productAtShopId: product.productAtShopId, // Backend will look up product and shop from this
          reportedPrice: parseFloat(product.priceCorrection!),
          currentPrice: product.lowestPrice || product.originalPrice || 0,
          notes: `Price correction from collect mode for ${product.productName}`,
        });
      }
      
      Alert.alert(
        'Success',
        `${corrections.length} price correction(s) submitted for review.`,
        [{ text: 'OK' }]
      );
      
      // Clear the corrections
      setProducts(prev => prev.map(p => ({ ...p, priceCorrection: '' })));
    } catch (error: any) {
      console.error('Error submitting corrections:', error);
      Alert.alert('Error', error.message || 'Failed to submit corrections');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishCollecting = () => {
    const uncollectedCount = products.filter(p => !p.isCollected).length;
    const correctionsCount = products.filter(p => p.priceCorrection && parseFloat(p.priceCorrection) > 0).length;
    
    if (uncollectedCount > 0 || correctionsCount > 0) {
      Alert.alert(
        'Finish Collecting?',
        `${uncollectedCount > 0 ? `You have ${uncollectedCount} uncollected item(s). ` : ''}${correctionsCount > 0 ? `You have ${correctionsCount} price correction(s) to submit.` : ''}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: correctionsCount > 0 ? 'Submit & Finish' : 'Finish Anyway',
            onPress: async () => {
              if (correctionsCount > 0) {
                await handleSubmitCorrections();
              }
              router.back();
            }
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const renderProductItem = ({ item }: { item: CollectableProduct }) => {
    const strikeWidth = item.animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    
    const opacity = item.animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.5],
    });

    return (
      <Animated.View style={[styles.productCard, { opacity }]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleToggleCollected(item.id)}
        >
          <View style={[
            styles.checkbox,
            item.isCollected && styles.checkboxChecked
          ]}>
            {item.isCollected && (
              <Ionicons name="checkmark" size={18} color={Colors.dark.background} />
            )}
          </View>
        </TouchableOpacity>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Product Name with strike-through */}
          <View style={styles.productNameContainer}>
            <Text style={[
              styles.productName,
              item.isCollected && styles.productNameCollected
            ]}>
              {item.productName}
            </Text>
            <Animated.View style={[styles.strikeThrough, { width: strikeWidth }]} />
          </View>

          {/* Barcode & Aisle Row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="barcode-outline" size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.detailText}>{item.barcode || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color={Colors.dark.primary} />
              <Text style={[styles.detailText, styles.aielNumber]}>
                Aile: {item.aielNumber || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Quantity & Price Row */}
          <View style={styles.quantityPriceRow}>
            <View style={styles.quantityBadge}>
              <Ionicons name="layers-outline" size={14} color={Colors.dark.primary} />
              <Text style={styles.quantityText}>Qty: {item.quantity || 1}</Text>
            </View>
            <Text style={styles.priceText}>
              £{(item.lowestPrice || item.originalPrice || 0).toFixed(2)}
            </Text>
          </View>

          {/* Price Correction Input */}
          {!item.isCollected && (
            <View style={styles.priceCorrectionContainer}>
              <Text style={styles.correctionLabel}>Price wrong?</Text>
              <View style={styles.correctionInputWrapper}>
                <Text style={styles.currencySymbol}>£</Text>
                <TextInput
                  style={styles.correctionInput}
                  placeholder="Enter correct price"
                  placeholderTextColor={Colors.dark.textSecondary}
                  keyboardType="decimal-pad"
                  value={item.priceCorrection}
                  onChangeText={(text) => handlePriceCorrection(item.id, text)}
                />
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const collectedCount = products.filter(p => p.isCollected).length;
  const totalCount = products.length;
  const correctionsCount = products.filter(p => p.priceCorrection && parseFloat(p.priceCorrection) > 0).length;

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Collect Mode</Text>
          <Text style={styles.headerSubtitle}>{listName}</Text>
        </View>
        <TouchableOpacity onPress={handleFinishCollecting} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${totalCount > 0 ? (collectedCount / totalCount) * 100 : 0}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {collectedCount} / {totalCount} collected
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.dark.primary} />
        <Text style={styles.instructionsText}>
          Enter an incorrect price to extend your premium subscription
        </Text>
      </View>

      {/* Product List */}
      <KeyboardAvoidingView 
        style={styles.listContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={64} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>No products in this list</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      {correctionsCount > 0 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitCorrections}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.dark.background} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.dark.background} />
                <Text style={styles.submitButtonText}>
                  Submit {correctionsCount} Price Correction{correctionsCount > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  doneButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  doneButtonText: {
    color: Colors.dark.background,
    fontWeight: '600',
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.dark.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.success,
    borderRadius: 4,
  },
  progressText: {
    marginTop: Spacing.xs,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primaryLight,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  instructionsText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.dark.text,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  checkboxContainer: {
    justifyContent: 'flex-start',
    paddingTop: Spacing.xs,
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success,
  },
  productInfo: {
    flex: 1,
  },
  productNameContainer: {
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  productNameCollected: {
    color: Colors.dark.textSecondary,
  },
  strikeThrough: {
    position: 'absolute',
    top: '50%',
    left: 0,
    height: 2,
    backgroundColor: Colors.dark.error,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  detailText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  aielNumber: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  quantityPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  quantityText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.success,
  },
  priceCorrectionContainer: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  correctionLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  correctionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.sm,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginRight: 4,
  },
  correctionInput: {
    flex: 1,
    paddingVertical: Spacing.xs,
    fontSize: 16,
    color: Colors.dark.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  bottomActions: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    marginLeft: Spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
});
