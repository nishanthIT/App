import { Redirect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { state, isLoading } = useApp();
  
  useEffect(() => {
    console.log('Auth state changed:', state.isAuthenticated, 'Loading:', isLoading);
  }, [state.isAuthenticated, isLoading]);
  
  // Show loading screen while restoring auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }
  
  if (state.isAuthenticated) {
    console.log('User is authenticated, redirecting to lists');
    return <Redirect href="/(tabs)/lists" />;
  } else {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/auth/login" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
});
