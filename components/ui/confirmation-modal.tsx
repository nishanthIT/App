import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

const { width } = Dimensions.get('window');

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type?: 'warning' | 'danger' | 'info';
  icon?: string;
}

export function ConfirmationModal({
  visible,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  type = 'info',
  icon,
}: ConfirmationModalProps) {
  const getIconName = () => {
    switch (type) {
      case 'danger': return 'trash.fill';
      case 'warning': return 'exclamationmark.triangle.fill';
      default: return 'info.circle.fill';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger': return Colors.dark.error;
      case 'warning': return Colors.dark.warning;
      default: return Colors.dark.info;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return {
          backgroundColor: Colors.dark.error,
          ...Shadows.md,
        };
      case 'warning':
        return {
          backgroundColor: Colors.dark.warning,
          ...Shadows.md,
        };
      default:
        return {
          backgroundColor: Colors.dark.primary,
          ...Shadows.neon,
        };
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, getConfirmButtonStyle()]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
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
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    paddingHorizontal: Spacing.md,
  },
  modal: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cancelButton: {
    backgroundColor: Colors.dark.glass,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  cancelButtonText: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '600',
  },
  confirmButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.glass,
  },
});