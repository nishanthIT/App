import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PromotionsScreen() {
  const { state, dispatch } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleAddToList = (promotion) => {
    // Add promotion products to current list or create new list
    if (state.currentListId) {
      // Add to current list
      Alert.alert('Added to List', `Added ${promotion.title} to your current list`);
    } else {
      // Create new list
      Alert.alert('Create List', 'Would you like to create a new list for this promotion?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create List', onPress: () => {
          const newList = {
            id: Date.now().toString(),
            name: `Promotion: ${promotion.title}`,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          dispatch({ type: 'CREATE_SHOPPING_LIST', payload: newList });
        }},
      ]);
    }
  };

  const renderPromotionCard = ({ item }) => (
    <ThemedView style={styles.promotionCard}>
      <View style={styles.promotionImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.promotionImage}
          defaultSource={require('@/assets/images/icon.png')}
        />
        <View style={styles.discountBadge}>
          <ThemedText style={styles.discountText}>{item.discount}% OFF</ThemedText>
        </View>
      </View>
      
      <View style={styles.promotionContent}>
        <View style={styles.promotionHeader}>
          <ThemedText style={styles.promotionTitle}>{item.title}</ThemedText>
          <View style={styles.storeBadge}>
            <ThemedText style={styles.storeName}>{item.store.name}</ThemedText>
          </View>
        </View>
        
        <ThemedText style={styles.promotionDescription}>{item.description}</ThemedText>
        
        <View style={styles.promotionFooter}>
          <View style={styles.validUntil}>
            <IconSymbol name="clock" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.validUntilText}>
              Valid until {new Date(item.validUntil).toLocaleDateString()}
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToList(item)}
          >
            <IconSymbol name="plus" size={16} color={Colors.light.background} />
            <Text style={styles.addButtonText}>Add to List</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="tag" size={64} color={Colors.light.textLight} />
      <ThemedText style={styles.emptyTitle}>No Promotions Available</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Check back later for exciting deals and discounts from your favorite suppliers!
      </ThemedText>
    </View>
  );

  // Mock data for demonstration
  const mockPromotions = [
    {
      id: '1',
      title: 'Bulk Coffee Beans Sale',
      description: 'Premium coffee beans at wholesale prices. Perfect for cafes and restaurants.',
      discount: 25,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
      storeId: 'store1',
      store: { name: 'Wholesale Foods Ltd' },
      productIds: ['coffee1', 'coffee2'],
      isActive: true,
    },
    {
      id: '2',
      title: 'Fresh Produce Special',
      description: 'Get the freshest vegetables and fruits at unbeatable prices.',
      discount: 30,
      validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      storeId: 'store2',
      store: { name: 'Fresh Market Co' },
      productIds: ['veg1', 'veg2', 'veg3'],
      isActive: true,
    },
    {
      id: '3',
      title: 'Dairy Products Discount',
      description: 'Milk, cheese, and dairy products with extended shelf life.',
      discount: 20,
      validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
      storeId: 'store3',
      store: { name: 'Dairy Direct' },
      productIds: ['dairy1', 'dairy2'],
      isActive: true,
    },
  ];

  const promotions = state.promotions.length > 0 ? state.promotions : mockPromotions;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Current Promotions</ThemedText>
        <TouchableOpacity style={styles.filterButton}>
          <IconSymbol name="line.3.horizontal.decrease" size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    ...Typography.h2,
    color: Colors.light.text,
  },
  filterButton: {
    padding: Spacing.sm,
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
  discountBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.light.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    ...Typography.label,
    color: Colors.light.background,
    fontWeight: '700',
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
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  validUntilText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.neon,
  },
  addButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
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
});
