import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextInputModal } from '@/components/ui/text-input-modal';
import listService from '@/services/listService';

export default function ListsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Animation values
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Fetch lists when component mounts and user is authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      // Delay to ensure token is stored after login
      const timer = setTimeout(() => {
        fetchListsWithRetry();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.isAuthenticated]);

  // Retry logic for initial fetch
  const fetchListsWithRetry = async (attempt = 0) => {
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries
    
    try {
      setLoading(true);
      const fetchedLists = await listService.getUserLists();
      setLists(fetchedLists);
      setLoading(false); // Success - stop loading
    } catch (error: any) {
      console.error(`Error fetching lists (attempt ${attempt + 1}):`, error);
      
      // If we haven't exhausted retries, retry
      if (attempt < maxRetries) {
        console.log(`Retrying fetch in ${retryDelay}ms...`);
        setTimeout(() => {
          fetchListsWithRetry(attempt + 1);
        }, retryDelay);
        return; // Don't set loading false yet, we're retrying
      }
      
      // All retries exhausted - stop loading
      setLoading(false);
    }
  };

  const fetchLists = async (showErrorAlert = true) => {
    try {
      setLoading(true);
      const fetchedLists = await listService.getUserLists();
      setLists(fetchedLists);
    } catch (error: any) {
      console.error('Error fetching lists:', error);
      // Only show alert if explicitly requested (not on initial load)
      if (showErrorAlert && state.isAuthenticated) {
        Alert.alert('Error', error.message || 'Failed to load shopping lists');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLists(true); // Show error on manual refresh
    setRefreshing(false);
  };

  const handleCreateList = () => {
    setShowCreateModal(true);
  };

  // Show success animation
  const showSuccessAnimation = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    
    // Reset animations
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    
    // Animate in
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
    
    // Auto hide after 2 seconds
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

  const handleCreateListSubmit = async (name: string) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    try {
      // Close modal first for better UX
      setShowCreateModal(false);
      setIsCreating(true);
      
      // Create list via API
      const newList = await listService.createList({
        name: name.trim(),
        description: '',
      });
      
      // Add the new list to the existing lists immediately for instant feedback
      setLists(prevLists => [newList, ...prevLists]);
      
      // Show success animation
      showSuccessAnimation(`"${name.trim()}" created!`);
      
      // Optionally refresh in background to ensure sync
      fetchLists().catch(err => console.error('Background refresh error:', err));
    } catch (error: any) {
      console.error('Error creating list:', error);
      Alert.alert('Error', error.message || 'Failed to create shopping list');
      
      // Refresh to show current state
      fetchLists();
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await listService.deleteList(listId);
              await fetchLists(); // Refresh the list
              Alert.alert('Success', 'List deleted successfully');
            } catch (error: any) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', error.message || 'Failed to delete list');
            }
          },
        },
      ]
    );
  };

  const renderListCard = ({ item }: { item: any }) => (
    <ThemedView style={styles.listCard}>
      <TouchableOpacity
        style={styles.listContent}
        onPress={() => {
          router.push({
            pathname: '/list-details',
            params: { listId: item.id, listName: item.name },
          } as any);
        }}
      >
        <View style={styles.listHeader}>
          <ThemedText style={styles.listName}>{item.name}</ThemedText>
          <TouchableOpacity
            onPress={() => handleDeleteList(item.id, item.name)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash" size={20} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.listStats}>
          <View style={styles.statItem}>
            <Ionicons name="list" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.statText}>
              {item.itemCount || 0} items
            </ThemedText>
          </View>
        </View>
        
        <ThemedText style={styles.lastUpdated}>
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <ThemedText style={styles.loadingText}>Loading lists...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <ThemedText style={styles.screenTitle}>Shopping Lists</ThemedText>
          <ThemedText style={styles.screenSubtitle}>
            Manage your shopping lists
          </ThemedText>
        </View>

        {lists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={80} color={Colors.dark.textLight} />
            <ThemedText style={styles.emptyStateTitle}>No Lists Yet</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Create your first shopping list to start comparing prices
            </ThemedText>
            <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateList}>
              <Ionicons name="add" size={20} color={Colors.dark.background} />
              <ThemedText style={styles.createFirstButtonText}>Create List</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={lists}
            renderItem={renderListCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.primary}
              />
            }
          />
        )}

        {/* FAB Button */}
        {lists.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={handleCreateList}>
            <Ionicons name="add" size={28} color={Colors.dark.background} />
          </TouchableOpacity>
        )}

        {/* Create List Modal */}
        <TextInputModal
          visible={showCreateModal}
          title="Create Shopping List"
          placeholder="Enter list name (e.g., Weekly Shopping)"
          onSubmit={handleCreateListSubmit}
          onClose={() => setShowCreateModal(false)}
        />

        {/* Creating Loading Overlay */}
        {isCreating && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.dark.primary} />
              <Text style={styles.loadingText}>Creating your list...</Text>
            </View>
          </View>
        )}

        {/* Success Prompt */}
        <Modal
          transparent
          visible={showSuccess}
          animationType="none"
          onRequestClose={() => setShowSuccess(false)}
        >
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
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color={Colors.dark.success} />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    marginTop: 20,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  screenSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
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
    padding: Spacing.md,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    backgroundColor: Colors.dark.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
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
    marginBottom: Spacing.xl,
  },
  createFirstButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.neon,
  },
  createFirstButtonText: {
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
  successIconContainer: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  successMessage: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
