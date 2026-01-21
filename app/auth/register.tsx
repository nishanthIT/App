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
import { useApp } from '@/contexts/AppContext';
import { useContacts } from '@/contexts/ContactsContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import authService from '@/services/authService';

export default function RegisterScreen() {
  const { dispatch } = useApp();
  const { initializeAfterLogin } = useContacts();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const showSuccess = () => {
    setShowSuccessModal(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleGetStarted = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccessModal(false);
      router.replace('/(tabs)/lists');
    });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { name, email, password, confirmPassword } = formData;

    // Validation
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API
      const response = await authService.register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      
      // Create user object for context
      const user = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || 'User',
        shopName: 'My Shop',
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      console.log('Registration successful:', user);
      dispatch({ type: 'LOGIN', payload: user });
      
      // Initialize chat data after successful registration
      await initializeAfterLogin();
      
      // Show success modal
      showSuccess();
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
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
              <IconSymbol name="pound.circle.fill" size={60} color={Colors.light.primary} />
            </View>
            <ThemedText style={styles.title}>Start Free Trial</ThemedText>
            <ThemedText style={styles.subtitle}>
              Get 90 days of premium features at no cost
            </ThemedText>
            <ThemedText style={styles.trialText}>✨ No payment required • Cancel anytime</ThemedText>
          </View>

          <ThemedView style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="person" size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.light.textLight}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="envelope" size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.light.textLight}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>



            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="lock" size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.light.textLight}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
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
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <View style={styles.inputContainer}>
                <IconSymbol name="lock" size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={Colors.light.textLight}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <IconSymbol
                    name={showConfirmPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ThemedText style={styles.registerButtonText}>Starting Trial...</ThemedText>
              ) : (
                <ThemedText style={styles.registerButtonText}>Start Free Trial</ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <ThemedText style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <ThemedText style={styles.termsLink}>Terms of Service</ThemedText>
                {' '}and{' '}
                <ThemedText style={styles.termsLink}>Privacy Policy</ThemedText>
              </ThemedText>
            </View>
          </ThemedView>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.signInText}>Sign In</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleGetStarted}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.successModalContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <IconSymbol name="checkmark.circle.fill" size={80} color="#10B981" />
              </View>
            </View>
            
            <ThemedText style={styles.successTitle}>Welcome to Paymi! 🎉</ThemedText>
            
            <ThemedText style={styles.successSubtitle}>
              Your account has been created successfully!
            </ThemedText>
            
            <View style={styles.trialBadge}>
              <IconSymbol name="gift.fill" size={24} color={Colors.light.primary} />
              <ThemedText style={styles.trialBadgeText}>90 Days Free Trial</ThemedText>
            </View>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                <ThemedText style={styles.benefitText}>Create unlimited shopping lists</ThemedText>
              </View>
              <View style={styles.benefitItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                <ThemedText style={styles.benefitText}>Compare prices across stores</ThemedText>
              </View>
              <View style={styles.benefitItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                <ThemedText style={styles.benefitText}>Share lists with your team</ThemedText>
              </View>
              <View style={styles.benefitItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                <ThemedText style={styles.benefitText}>Earn points for price reports</ThemedText>
              </View>
            </View>
            
            <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
              <ThemedText style={styles.getStartedButtonText}>Get Started</ThemedText>
              <IconSymbol name="arrow.right" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
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
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  trialText: {
    ...Typography.bodySmall,
    color: Colors.light.primary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: Spacing.md,
  },
  formContainer: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  registerButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    ...Typography.label,
    color: Colors.light.background,
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
  },
  termsText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
    color: Colors.light.textSecondary,
  },
  signInText: {
    ...Typography.body,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  successModalContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...Shadows.lg,
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8FDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLight || '#E0F2FE',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  trialBadgeText: {
    ...Typography.label,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  benefitsList: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.light.text,
    flex: 1,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    ...Shadows.sm,
  },
  getStartedButtonText: {
    ...Typography.label,
    color: '#FFF',
    fontWeight: '600',
  },
});

