import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

const { width, height } = Dimensions.get('window');

interface TextInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  title: string;
  placeholder: string;
  defaultValue?: string;
  icon?: string;
  maxLength?: number;
  submitButtonText?: string;
  cancelButtonText?: string;
}

export function TextInputModal({
  visible,
  onClose,
  onSubmit,
  title,
  placeholder,
  defaultValue = '',
  icon = 'plus.circle',
  maxLength = 50,
  submitButtonText = 'Create',
  cancelButtonText = 'Cancel',
}: TextInputModalProps) {
  const [text, setText] = useState(defaultValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(defaultValue);
      // Focus input after a small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible, defaultValue]);

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onSubmit(trimmedText);
      setText('');
      onClose();
    }
  };

  const handleCancel = () => {
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.blurContainer}>
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <IconSymbol
                    name="plus.circle"
                    size={32}
                    color={Colors.dark.primary}
                  />
                </View>
                <Text style={styles.title}>{title}</Text>
              </View>

              {/* Input Section */}
              <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={text}
                    onChangeText={setText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.dark.textSecondary}
                    maxLength={maxLength}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <Text style={styles.characterCount}>
                    {text.length}/{maxLength}
                  </Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>{cancelButtonText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    !text.trim() && styles.disabledButton
                  ]}
                  onPress={handleSubmit}
                  disabled={!text.trim()}
                >
                  <IconSymbol 
                    name="checkmark" 
                    size={16} 
                    color={text.trim() ? Colors.dark.background : Colors.dark.textSecondary} 
                  />
                  <Text style={[
                    styles.submitButtonText,
                    !text.trim() && styles.disabledButtonText
                  ]}>
                    {submitButtonText}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <IconSymbol name="xmark" size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.neon,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.glass,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  textInput: {
    ...Typography.body,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
    minHeight: 24,
  },
  characterCount: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
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
  submitButton: {
    backgroundColor: Colors.dark.primary,
    ...Shadows.neon,
  },
  submitButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: Colors.dark.glass,
    ...{}, // Remove neon shadow
  },
  disabledButtonText: {
    color: Colors.dark.textSecondary,
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