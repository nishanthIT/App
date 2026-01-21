import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';
import { useContacts } from '@/contexts/ContactsContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import authService from '@/services/authService';
import { API_CONFIG } from '@/config/api';

export default function LoginScreen() {
  const { dispatch } = useApp();
  const { initializeAfterLogin } = useContacts();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scaleAnim] = useState(new Animated.Value(0));

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const hideError = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorModal(false);
    });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Forgot Password',
      'Enter your email address to receive a password reset link:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Link',
          onPress: async (inputEmail) => {
            if (!inputEmail || !validateEmail(inputEmail)) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }

            try {
              const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: inputEmail }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success', data.message);
              } else {
                Alert.alert('Error', data.error || 'Failed to send reset link');
              }
            } catch (error) {
              console.error('Forgot password error:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ],
      'plain-text',
      email || ''
    );
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API - it will automatically detect user type
      const response = await authService.login({
        email: email.trim(),
        password: password.trim(),
      });
      
      // Create user object for context
      const user = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || 'User',
        shopName: 'My Shop', // You can add this to backend response
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      console.log('Login successful:', user);
      console.log('User type detected:', response.user.userType);
      dispatch({ type: 'LOGIN', payload: user });
      
      // Initialize chat data after successful login
      await initializeAfterLogin();
      
      // Verify token is stored before navigating
      const storedToken = await AsyncStorage.getItem('auth_token');
      console.log('Token verified in storage:', !!storedToken);
      
      // Navigate to main app after ensuring token is ready
      setTimeout(() => {
        router.replace('/(tabs)/lists');
      }, 500); // Increased delay to ensure token is available
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.message || 'Login failed. Please try again.';
      // Check for common credential errors
      if (message.toLowerCase().includes('invalid') || 
          message.toLowerCase().includes('incorrect') ||
          message.toLowerCase().includes('wrong') ||
          message.toLowerCase().includes('not found')) {
        showError('Invalid email or password. Please check your credentials and try again.');
      } else if (message.toLowerCase().includes('network')) {
        showError('Network error. Please check your internet connection.');
      } else {
        showError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <IconSymbol name="cart.circle.fill" size={60} color={Colors.dark.primary} />
            </View>
            <ThemedText style={styles.title}>Welcome to Paymi</ThemedText>
            <ThemedText style={styles.subtitle}>
              Compare prices and save money on your shopping
            </ThemedText>
          </View>

          <ThemedView style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="envelope" size={20} color={Colors.dark.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.dark.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="lock" size={20} color={Colors.dark.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.dark.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <IconSymbol
                    name={showPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={Colors.dark.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ThemedText style={styles.loginButtonText}>Signing In...</ThemedText>
              ) : (
                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
            >
              <ThemedText style={styles.forgotPasswordText}>Forgot Password?</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>New to Paymi? </ThemedText>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.signUpText}>Create Account - Free Trial!</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={hideError}
      >
        <TouchableOpacity 
          style={styles.errorModalOverlay} 
          activeOpacity={1} 
          onPress={hideError}
        >
          <Animated.View 
            style={[
              styles.errorModalContent,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorEmoji}>😔</Text>
            </View>
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={hideError}>
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  autoDetectText: {
    ...Typography.bodySmall,
    color: Colors.dark.primary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.glass,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.dark.text,
    marginLeft: Spacing.sm,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.neon,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
    marginHorizontal: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.sm,
  },
  testButton: {
    backgroundColor: Colors.dark.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.neon,
  },
  testButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  googleButtonText: {
    ...Typography.label,
    color: Colors.dark.text,
    marginLeft: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  signUpText: {
    ...Typography.body,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotPasswordText: {
    ...Typography.body,
    color: Colors.dark.primary,
    textDecorationLine: 'underline',
  },
  // Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorModalContent: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.errorLight || 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 150,
    alignItems: 'center',
    ...Shadows.neon,
  },
  errorButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
});
