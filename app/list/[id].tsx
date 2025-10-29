import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { generateShoppingListPDF, sharePDF } from '@/utils/pdfExport';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SelectionModal } from '@/components/ui/selection-modal';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'money' | 'nearest'>('money');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const currentList = state.shoppingLists.find(list => list.id === id);

  if (!currentList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={64} color={Colors.light.error} />
          <ThemedText style={styles.errorTitle}>List Not Found</ThemedText>
          <ThemedText style={styles.errorDescription}>
            The shopping list you're looking for doesn't exist.
          </ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleAddItem = () => {
    setShowAddModal(true);
  };

  const handleScanBarcode = () => {
    // Set current list and navigate to scanner
    dispatch({ type: 'SET_CURRENT_LIST', payload: currentList.id });
    router.push('/scanner');
  };

  const handleSearchManually = () => {
    // Navigate to search - for now just show coming soon
    Alert.alert('Search', 'Manual search feature coming soon!');
  };

  const handleTogglePurchased = (itemId: string) => {
    dispatch({
      type: 'TOGGLE_ITEM_PURCHASED',
      payload: { listId: currentList.id, itemId },
    });
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setShowDeleteModal(true);
  };

  const confirmRemoveItem = () => {
    if (itemToDelete) {
      dispatch({
        type: 'REMOVE_ITEM_FROM_LIST',
        payload: { listId: currentList.id, itemId: itemToDelete.id },
      });
      setItemToDelete(null);
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleExportPDF = async () => {
    setShowExportModal(true);
  };

  const exportPDF = async (sortBy: 'money' | 'nearest') => {
    try {
      // Mock data for demonstration
      const mockStores = [
        { id: 'store1', name: 'Wholesale Foods Ltd', address: '123 High Street, London', location: { latitude: 51.5074, longitude: -0.1278 } },
        { id: 'store2', name: 'Fresh Market Co', address: '456 Market Road, London', location: { latitude: 51.5074, longitude: -0.1278 } },
        { id: 'store3', name: 'Dairy Direct', address: '789 Dairy Lane, London', location: { latitude: 51.5074, longitude: -0.1278 } },
      ];

      const mockProductPrices = currentList.items.flatMap(item => [
        { productId: item.productId, storeId: 'store1', price: 12.99, inStock: true, lastUpdated: new Date().toISOString() },
        { productId: item.productId, storeId: 'store2', price: 15.50, inStock: true, lastUpdated: new Date().toISOString() },
        { productId: item.productId, storeId: 'store3', price: 14.25, inStock: true, lastUpdated: new Date().toISOString() },
      ]);

      const uri = await generateShoppingListPDF({
        list: currentList,
        stores: mockStores,
        productPrices: mockProductPrices,
        sortBy,
      });

      await sharePDF(uri, `${currentList.name}-shopping-list.pdf`);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleSort = () => {
    Alert.alert(
      'Sort List',
      'Choose sorting option:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'By Money Saving', onPress: () => setSortBy('money') },
        { text: 'By Nearest Store', onPress: () => setSortBy('nearest') },
      ]
    );
  };

  const renderItemCard = ({ item }: { item: any }) => {
    const isExpanded = expandedItems.has(item.id);
    
    // Mock price data - in real app, this would come from the context
    const mockPrices = [
      { storeId: 'store1', storeName: 'Wholesale Foods', price: 12.99, isBest: true },
      { storeId: 'store2', storeName: 'Fresh Market', price: 15.50, isBest: false },
      { storeId: 'store3', storeName: 'Dairy Direct', price: 14.25, isBest: false },
    ];

    const bestPrice = mockPrices.find(p => p.isBest) || mockPrices[0];
    const highestPrice = Math.max(...mockPrices.map(p => p.price));
    const savings = highestPrice - bestPrice.price;

    return (
      <ThemedView style={[styles.compactItemCard, item.isPurchased && styles.itemCardPurchased]}>
        {/* Compact Header - Always Visible */}
        <TouchableOpacity
          style={styles.compactHeader}
          onPress={() => toggleItemExpansion(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.compactLeft}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleTogglePurchased(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol
                name={item.isPurchased ? "checkmark.circle.fill" : "circle"}
                size={20}
                color={item.isPurchased ? Colors.dark.success : Colors.dark.border}
              />
            </TouchableOpacity>
            
            <View style={styles.compactInfo}>
              <ThemedText style={[styles.compactItemName, item.isPurchased && styles.itemNamePurchased]}>
                {item.product.name}
              </ThemedText>
              <View style={styles.compactDetails}>
                <ThemedText style={styles.compactPrice}>£{bestPrice.price.toFixed(2)}</ThemedText>
                <ThemedText style={styles.compactQuantity}>Qty: {item.quantity}</ThemedText>
                {savings > 0 && (
                  <View style={styles.compactSavingsBadge}>
                    <ThemedText style={styles.compactSavingsText}>-£{savings.toFixed(2)}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.compactRight}>
            <TouchableOpacity
              onPress={() => handleRemoveItem(item.id, item.product.name)}
              style={styles.compactRemoveButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="trash" size={16} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            
            <IconSymbol
              name={isExpanded ? "chevron.up" : "chevron.down"}
              size={16}
              color={Colors.dark.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Details - Conditionally Visible */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            <View style={styles.detailSection}>
              <ThemedText style={styles.detailSectionTitle}>Best Deal</ThemedText>
              <View style={styles.bestDealCard}>
                <View style={styles.bestDealInfo}>
                  <ThemedText style={styles.bestDealPrice}>£{bestPrice.price.toFixed(2)}</ThemedText>
                  <ThemedText style={styles.bestDealStore}>{bestPrice.storeName}</ThemedText>
                </View>
                <View style={styles.savingsHighlight}>
                  <ThemedText style={styles.savingsHighlightText}>Save £{savings.toFixed(2)}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <ThemedText style={styles.detailSectionTitle}>All Prices</ThemedText>
              {mockPrices.map((price, index) => (
                <View key={index} style={styles.priceComparisonRow}>
                  <View style={styles.storeInfo}>
                    <ThemedText style={styles.storeName}>{price.storeName}</ThemedText>
                    {price.isBest && (
                      <View style={styles.bestPriceTag}>
                        <ThemedText style={styles.bestPriceTagText}>BEST</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[
                    styles.storePrice,
                    price.isBest && styles.bestStorePrice
                  ]}>
                    £{price.price.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ThemedView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="list.bullet.rectangle" size={64} color={Colors.light.textLight} />
      <ThemedText style={styles.emptyTitle}>No Items Yet</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Add items to your list to start comparing prices and saving money!
      </ThemedText>
      <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
        <IconSymbol name="plus" size={20} color={Colors.light.background} />
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.modernBackButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <ThemedText style={styles.listTitle}>{currentList.name}</ThemedText>
          <ThemedText style={styles.itemCount}>{currentList.items.length} items</ThemedText>
        </View>
        
        <TouchableOpacity style={styles.modernMenuButton} onPress={handleSort}>
          <IconSymbol name="ellipsis" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddItem}>
          <IconSymbol name="plus" size={20} color={Colors.light.primary} />
          <ThemedText style={styles.actionButtonText}>Add Item</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExportPDF}>
          <IconSymbol name="square.and.arrow.up" size={20} color={Colors.light.secondary} />
          <ThemedText style={styles.actionButtonText}>Export PDF</ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentList.items}
        renderItem={renderItemCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Item Modal */}
      <SelectionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Item"
        options={[
          {
            id: 'scan',
            title: 'Scan Barcode',
            description: 'Use camera to scan product barcode',
            icon: 'barcode.viewfinder',
            onPress: handleScanBarcode,
            color: Colors.dark.primary,
          },
          {
            id: 'search',
            title: 'Search Manually',
            description: 'Search for products by name',
            icon: 'magnifyingglass',
            onPress: handleSearchManually,
            color: Colors.dark.secondary,
          },
        ]}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        title="Remove Item"
        message={`Are you sure you want to remove "${itemToDelete?.name}" from this list?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmRemoveItem}
        type="danger"
      />

      {/* Export Modal */}
      <SelectionModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export PDF"
        options={[
          {
            id: 'money',
            title: 'By Money Saving',
            description: 'Sort by best deals and savings',
            icon: 'p.circle',
            onPress: () => exportPDF('money'),
            color: Colors.dark.success,
          },
          {
            id: 'nearest',
            title: 'By Nearest Store',
            description: 'Sort by closest store locations',
            icon: 'location.circle',
            onPress: () => exportPDF('nearest'),
            color: Colors.dark.info,
          },
        ]}
      />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modernBackButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.glass,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.sm,
  },
  modernMenuButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.glass,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.sm,
  },
  headerInfo: {
    flex: 1,
  },
  listTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  itemCount: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
  },
  menuButton: {
    padding: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dark.glass,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.sm,
  },
  actionButtonText: {
    ...Typography.label,
    color: Colors.dark.text,
  },
  listContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  itemCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  itemCardPurchased: {
    opacity: 0.6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Typography.h4,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
  },
  itemQuantity: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    padding: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  priceSection: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  priceLabel: {
    ...Typography.label,
    color: Colors.light.text,
  },
  savingsBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    ...Typography.caption,
    color: Colors.light.background,
    fontWeight: '600',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestPrice: {
    ...Typography.price,
    color: Colors.light.primary,
  },
  storeName: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
  },
  allPrices: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
    paddingTop: Spacing.md,
  },
  allPricesLabel: {
    ...Typography.label,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  priceStoreName: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
  },
  priceValue: {
    ...Typography.bodySmall,
    color: Colors.light.text,
  },
  bestPriceValue: {
    color: Colors.light.success,
    fontWeight: '600',
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
    marginBottom: Spacing.xl,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  addButtonText: {
    ...Typography.label,
    color: Colors.light.background,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorDescription: {
    ...Typography.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  backButtonText: {
    ...Typography.label,
    color: Colors.light.background,
    fontWeight: '600',
  },
  
  // Compact Item Card Styles
  compactItemCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  compactLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  compactItemName: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactPrice: {
    ...Typography.label,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  compactQuantity: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  compactSavingsBadge: {
    backgroundColor: Colors.dark.success + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  compactSavingsText: {
    ...Typography.caption,
    color: Colors.dark.success,
    fontWeight: '700',
    fontSize: 10,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactRemoveButton: {
    padding: Spacing.xs,
  },
  
  // Expanded Content Styles
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginBottom: Spacing.md,
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
  detailSectionTitle: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  bestDealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  bestDealInfo: {
    flex: 1,
  },
  bestDealPrice: {
    ...Typography.h4,
    color: Colors.dark.primary,
    fontWeight: '800',
  },
  bestDealStore: {
    ...Typography.bodySmall,
    color: Colors.dark.text,
    fontWeight: '600',
  },
  savingsHighlight: {
    backgroundColor: Colors.dark.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  savingsHighlightText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  priceComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.glass,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  storeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bestPriceTag: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  bestPriceTagText: {
    ...Typography.caption,
    color: Colors.dark.background,
    fontWeight: '800',
    fontSize: 9,
  },
  storePrice: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  bestStorePrice: {
    color: Colors.dark.primary,
    fontWeight: '700',
  },
});
