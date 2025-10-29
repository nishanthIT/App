import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

const { width, height } = Dimensions.get('window');

interface ModernModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  icon?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function ModernModal({
  visible,
  onClose,
  title,
  message,
  buttons = [],
  icon,
  type = 'info',
}: ModernModalProps) {
  const getIconName = () => {
    if (icon) return icon;
    switch (type) {
      case 'success': return 'checkmark.circle.fill';
      case 'error': return 'xmark.circle.fill';
      case 'warning': return 'exclamationmark.triangle.fill';
      default: return 'info.circle.fill';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return Colors.dark.success;
      case 'error': return Colors.dark.error;
      case 'warning': return Colors.dark.warning;
      default: return Colors.dark.info;
    }
  };

  const getButtonStyle = (buttonStyle: string = 'primary') => {
    switch (buttonStyle) {
      case 'primary':
        return {
          backgroundColor: Colors.dark.primary,
          ...Shadows.neon,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.dark.glass,
          borderWidth: 1,
          borderColor: Colors.dark.glassBorder,
        };
      case 'danger':
        return {
          backgroundColor: Colors.dark.error,
          ...Shadows.md,
        };
      default:
        return {
          backgroundColor: Colors.dark.primary,
          ...Shadows.neon,
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurContainer}>
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <IconSymbol
                    name={getIconName()}
                    size={32}
                    color={getIconColor()}
                  />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              {buttons.length > 0 && (
                <View style={styles.buttonContainer}>
                  {buttons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.button, getButtonStyle(button.style)]}
                      onPress={button.onPress}
                    >
                      <Text style={styles.buttonText}>{button.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <IconSymbol name="xmark" size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
  },
  modal: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

