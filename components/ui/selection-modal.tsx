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

interface SelectionOption {
  id: string;
  title: string;
  description?: string;
  icon: any;
  onPress: () => void;
  color?: string;
}

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectionOption[];
}

export function SelectionModal({
  visible,
  onClose,
  title,
  options,
}: SelectionModalProps) {
  const handleOptionPress = (option: SelectionOption) => {
    option.onPress();
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
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    index !== options.length - 1 && styles.optionButtonWithBorder
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <View style={[
                    styles.optionIcon,
                    option.color && { backgroundColor: option.color + '15' }
                  ]}>
                    <IconSymbol
                      name={option.icon}
                      size={24}
                      color={option.color || Colors.dark.primary}
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    )}
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={Colors.dark.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

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
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    fontWeight: '700',
  },
  optionsContainer: {
    paddingHorizontal: Spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  optionButtonWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    ...Typography.bodySmall,
    color: Colors.dark.textSecondary,
  },
  cancelButton: {
    margin: Spacing.md,
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.glass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  cancelButtonText: {
    ...Typography.label,
    color: Colors.dark.text,
    fontWeight: '600',
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