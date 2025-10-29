import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const { state, dispatch } = useApp();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch({ type: 'LOGOUT' }),
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings feature coming soon!');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Help feature coming soon!');
  };

  const handleAbout = () => {
    Alert.alert('About', 'Paymi App v1.0.0\n\nBuilt for UK shop owners to compare wholesale prices and save money.');
  };

  const renderProfileSection = () => (
    <ThemedView style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <IconSymbol name="person.fill" size={40} color={Colors.light.background} />
        </View>
      </View>
      
      <View style={styles.profileInfo}>
        <ThemedText style={styles.userName}>
          {state.user?.name || 'Shop Owner'}
        </ThemedText>
        <ThemedText style={styles.shopName}>
          {state.user?.shopName || 'Your Shop'}
        </ThemedText>
        <ThemedText style={styles.userEmail}>
          {state.user?.email || 'user@example.com'}
        </ThemedText>
      </View>
      
      <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
        <IconSymbol name="pencil" size={16} color={Colors.light.primary} />
      </TouchableOpacity>
    </ThemedView>
  );

  const renderStatsSection = () => (
    <ThemedView style={styles.statsSection}>
      <ThemedText style={styles.sectionTitle}>Your Savings</ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <IconSymbol name="list.bullet.rectangle" size={24} color={Colors.light.primary} />
          <ThemedText style={styles.statNumber}>{state.shoppingLists.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Shopping Lists</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <IconSymbol name="pound.circle" size={24} color={Colors.light.success} />
          <ThemedText style={styles.statNumber}>
            £{state.shoppingLists.reduce((total, list) => total + (list.totalSavings || 0), 0).toFixed(0)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Total Saved</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <IconSymbol name="building.2" size={24} color={Colors.light.secondary} />
          <ThemedText style={styles.statNumber}>{state.stores.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Suppliers</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <IconSymbol name="tag" size={24} color={Colors.light.warning} />
          <ThemedText style={styles.statNumber}>{state.promotions.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Promotions</ThemedText>
        </View>
      </View>
    </ThemedView>
  );

  const renderMenuSection = () => (
    <ThemedView style={styles.menuSection}>
      <ThemedText style={styles.sectionTitle}>Account</ThemedText>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
        <View style={styles.menuItemLeft}>
          <IconSymbol name="gearshape" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>Settings</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
        <View style={styles.menuItemLeft}>
          <IconSymbol name="questionmark.circle" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>Help & Support</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
        <View style={styles.menuItemLeft}>
          <IconSymbol name="info.circle" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>About</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
        <View style={styles.menuItemLeft}>
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Colors.light.error} />
          <ThemedText style={[styles.menuItemText, styles.logoutText]}>Logout</ThemedText>
        </View>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Profile</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderStatsSection()}
        {renderMenuSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
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
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.neon,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.h4,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  shopName: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.bodySmall,
    color: Colors.dark.textLight,
  },
  editButton: {
    padding: Spacing.sm,
  },
  statsSection: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.dark.glass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  statNumber: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: Colors.dark.backgroundCard,
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: Colors.dark.error,
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
  },
});
