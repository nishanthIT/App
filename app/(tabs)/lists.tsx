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
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextInputModal } from '@/components/ui/text-input-modal';

export default function ListsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCreateList = () => {
    setShowCreateModal(true);
  };

  const handleCreateListSubmit = (name: string) => {
    const newList = {
      id: Date.now().toString(),
      name: name,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_SHOPPING_LIST', payload: newList });
    setShowCreateModal(false);
  };

  const handleDeleteList = (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_SHOPPING_LIST', payload: listId }),
        },
      ]
    );
  };

  const renderListCard = ({ item }: { item: any }) => (
    <ThemedView style={styles.listCard}>
      <TouchableOpacity
        style={styles.listContent}
        onPress={() => {
          router.push(`/list/${item.id}`);
        }}
      >
        <View style={styles.listHeader}>
          <ThemedText style={styles.listName}>{item.name}</ThemedText>
          <TouchableOpacity
            onPress={() => handleDeleteList(item.id, item.name)}
            style={styles.deleteButton}
          >
            <IconSymbol name="trash" size={20} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.listStats}>
          <View style={styles.statItem}>
            <IconSymbol name="list.bullet" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.statText}>{item.items.length} items</ThemedText>
          </View>
          
          {item.totalSavings && item.totalSavings > 0 && (
            <View style={styles.statItem}>
              <IconSymbol name="p.circle" size={16} color={Colors.light.success} />
              <ThemedText style={[styles.statText, styles.savingsText]}>
                £{item.totalSavings.toFixed(2)} saved
              </ThemedText>
            </View>
          )}
        </View>
        
        <ThemedText style={styles.lastUpdated}>
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="list.bullet.rectangle" size={64} color={Colors.light.textLight} />
      <ThemedText style={styles.emptyTitle}>No Shopping Lists Yet</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Create your first shopping list to start comparing prices and saving money!
      </ThemedText>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
        <IconSymbol name="plus" size={20} color={Colors.light.background} />
        <Text style={styles.createButtonText}>Create List</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Shopping Lists</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateList}>
          <IconSymbol name="plus" size={24} color={Colors.light.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.shoppingLists}
        renderItem={renderListCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <TextInputModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateListSubmit}
        title="Create New List"
        placeholder="Enter list name (e.g., Weekly Shopping)"
        submitButtonText="Create List"
        cancelButtonText="Cancel"
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
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.neon,
  },
  listContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  listCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  listContent: {
    padding: Spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listName: {
    ...Typography.h4,
    color: Colors.dark.text,
    flex: 1,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  listStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
  },
  savingsText: {
    color: Colors.dark.success,
    fontWeight: '700',
  },
  lastUpdated: {
    ...Typography.caption,
    color: Colors.dark.textLight,
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
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  createButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.neon,
  },
  createButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
});
