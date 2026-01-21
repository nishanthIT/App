import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, performLogout } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { priceReportsAPI } from '@/services/api';
import { API_CONFIG } from '@/config/api';

export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [earnings, setEarnings] = useState(0);
  const [approvedReports, setApprovedReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    fetchEarningsData();
    fetchUserInfo();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const data = await priceReportsAPI.getUserReports();
      setEarnings(data.earnings || 0);
      
      // Count approved and pending reports
      const approved = data.reports.filter((report: any) => report.status === 'APPROVED').length;
      const pending = data.reports.filter((report: any) => report.status === 'PENDING').length;
      
      setApprovedReports(approved);
      setPendingReports(pending);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 User data received:', JSON.stringify(data, null, 2));
        console.log('📊 Subscription info:', data.user?.subscriptionInfo);
        console.log('📊 Points:', data.user?.points);
        
        setSubscriptionInfo(data.user.subscriptionInfo);
        setPoints(parseFloat(data.user.points || 0));
      } else {
        console.error('❌ Failed to fetch user info, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await performLogout(dispatch);
            router.replace('/auth/login');
          },
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

  const handleReportPrice = () => {
    router.push('/price-report');
  };

  const handleExtendTrial = () => {
    const availableOptions = [];
    availableOptions.push({ text: 'Cancel', style: 'cancel' as const });
    
    if (points >= 7) {
      availableOptions.push({ 
        text: '7 Days', 
        onPress: () => extendTrialWithPoints(7)
      });
    }
    
    if (points >= 15) {
      availableOptions.push({ 
        text: '15 Days', 
        onPress: () => extendTrialWithPoints(15)
      });
    }
    
    if (points >= 30) {
      availableOptions.push({ 
        text: '30 Days', 
        onPress: () => extendTrialWithPoints(30)
      });
    }

    if (availableOptions.length === 1) {
      Alert.alert('Insufficient Points', 'You need at least 7 points to extend your trial.');
      return;
    }

    Alert.alert(
      'Extend Trial',
      `You have ${points} points. Each point extends your trial by 1 day.\n\nHow many days would you like to extend?`,
      availableOptions
    );
  };

  const extendTrialWithPoints = async (days: number) => {
    if (points < days) {
      Alert.alert('Insufficient Points', `You need ${days} points but only have ${points} points.`);
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/extend-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Trial Extended!', 
          `Your trial has been extended by ${days} days. You now have ${data.data.daysRemaining} days remaining.`
        );
        // Refresh user info
        await fetchUserInfo();
      } else {
        Alert.alert('Error', data.error || 'Failed to extend trial');
      }
    } catch (error) {
      console.error('Error extending trial:', error);
      Alert.alert('Error', 'Failed to extend trial');
    }
  };

  const renderProfileSection = () => (
    <ThemedView style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.light.background} />
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
        <Ionicons name="pencil" size={16} color={Colors.light.primary} />
      </TouchableOpacity>
    </ThemedView>
  );

  const renderStatsSection = () => (
    <ThemedView style={styles.statsSection}>
      <ThemedText style={styles.sectionTitle}>Your Earnings</ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color={Colors.light.primary} />
          <ThemedText style={styles.statNumber}>{earnings}</ThemedText>
          <ThemedText style={styles.statLabel}>Points Earned</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.light.success} />
          <ThemedText style={styles.statNumber}>{approvedReports}</ThemedText>
          <ThemedText style={styles.statLabel}>Reports Approved</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons 
            name="time" 
            size={24} 
            color={subscriptionInfo?.isExpired ? Colors.light.error : Colors.light.primary} 
          />
          <ThemedText style={styles.statNumber}>
            {subscriptionInfo ? (subscriptionInfo.isExpired ? '0' : subscriptionInfo.daysRemaining) : '--'}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Days Left</ThemedText>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="diamond" size={24} color={Colors.light.accent} />
          <ThemedText style={styles.statNumber}>{points}</ThemedText>
          <ThemedText style={styles.statLabel}>Points</ThemedText>
        </View>
      </View>
      
      <TouchableOpacity style={styles.reportPriceButton} onPress={handleReportPrice}>
        <Ionicons name="pricetag" size={20} color={Colors.light.background} />
        <ThemedText style={styles.reportPriceText}>Report Wrong Price</ThemedText>
      </TouchableOpacity>

      {subscriptionInfo && subscriptionInfo.daysRemaining <= 7 && !subscriptionInfo.isExpired && (
        <TouchableOpacity style={styles.extendTrialButton} onPress={handleExtendTrial}>
          <Ionicons name="time" size={20} color={Colors.light.background} />
          <ThemedText style={styles.extendTrialText}>Extend Trial with Points</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );

  const renderMenuSection = () => (
    <ThemedView style={styles.menuSection}>
      <ThemedText style={styles.sectionTitle}>Account</ThemedText>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="settings" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>Settings</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="help-circle" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>Help & Support</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="information-circle" size={20} color={Colors.light.textSecondary} />
          <ThemedText style={styles.menuItemText}>About</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="log-out" size={20} color={Colors.light.error} />
          <ThemedText style={[styles.menuItemText, styles.logoutText]}>Logout</ThemedText>
        </View>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderStatsSection()}
        {renderMenuSection()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    marginTop: 20, // Top margin for breathing room
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
  reportPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  reportPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  extendTrialButton: {
    backgroundColor: Colors.light.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  extendTrialText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  
});
