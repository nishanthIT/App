import { Redirect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useEffect } from 'react';

export default function Index() {
  const { state } = useApp();
  
  useEffect(() => {
    console.log('Auth state changed:', state.isAuthenticated);
  }, [state.isAuthenticated]);
  
  if (state.isAuthenticated) {
    console.log('User is authenticated, redirecting to lists');
    return <Redirect href="/(tabs)/lists" />;
  } else {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/auth/login" />;
  }
}
