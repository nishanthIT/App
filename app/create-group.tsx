import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useContacts, Contact } from '@/contexts/ContactsContext';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { contacts, createGroup } = useContacts();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  const handleContactToggle = (contact: Contact) => {
    setSelectedContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      if (exists) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }

    try {
      createGroup(groupName.trim(), groupDescription.trim(), selectedContacts);
      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.find(c => c.id === item.id);

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactToggle(item)}
      >
        <View style={styles.contactAvatar}>
          <IconSymbol
            name="person.fill"
            size={24}
            color={Colors.dark.tint}
          />
        </View>
        
        <View style={styles.contactInfo}>
          <ThemedText style={styles.contactName}>{item.name}</ThemedText>
          <ThemedText style={styles.contactPhone}>{item.phone}</ThemedText>
        </View>

        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected
        ]}>
          {isSelected && (
            <IconSymbol
              name="checkmark"
              size={16}
              color={Colors.dark.background}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={Colors.dark.tint} />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>New Group</ThemedText>
        
        <TouchableOpacity
          style={[
            styles.createButton,
            (!groupName.trim() || selectedContacts.length === 0) && styles.createButtonDisabled
          ]}
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedContacts.length === 0}
        >
          <ThemedText style={[
            styles.createButtonText,
            (!groupName.trim() || selectedContacts.length === 0) && styles.createButtonTextDisabled
          ]}>
            Create
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <View style={styles.content}>
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <View style={styles.groupAvatarContainer}>
            <View style={styles.groupAvatar}>
              <IconSymbol
                name="person.3.fill"
                size={32}
                color={Colors.dark.tint}
              />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <IconSymbol
                name="camera.fill"
                size={16}
                color={Colors.dark.background}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={25}
            />
            <TextInput
              style={styles.groupDescriptionInput}
              placeholder="Group description (optional)"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={100}
              multiline
            />
          </View>
        </View>

        {/* Selected Contacts Preview */}
        {selectedContacts.length > 0 && (
          <View style={styles.selectedSection}>
            <ThemedText style={styles.selectedTitle}>
              {selectedContacts.length} participant{selectedContacts.length > 1 ? 's' : ''} selected
            </ThemedText>
            <FlatList
              horizontal
              data={selectedContacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.selectedContact}>
                  <View style={styles.selectedContactAvatar}>
                    <IconSymbol
                      name="person.fill"
                      size={20}
                      color={Colors.dark.tint}
                    />
                  </View>
                  <ThemedText style={styles.selectedContactName} numberOfLines={1}>
                    {item.name.split(' ')[0]}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleContactToggle(item)}
                  >
                    <IconSymbol
                      name="xmark.circle.fill"
                      size={16}
                      color={Colors.dark.tabIconDefault}
                    />
                  </TouchableOpacity>
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedContactsList}
            />
          </View>
        )}

        {/* Contacts List */}
        <View style={styles.contactsSection}>
          <ThemedText style={styles.sectionTitle}>Select Contacts</ThemedText>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContactItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contactsList}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    ...Glassmorphism.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h2,
    flex: 1,
    color: Colors.dark.text,
  },
  createButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
  },
  createButtonDisabled: {
    backgroundColor: Colors.dark.tabIconDefault,
  },
  createButtonText: {
    ...Typography.body,
    color: Colors.dark.background,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: Colors.dark.text,
  },
  content: {
    flex: 1,
  },
  groupInfoSection: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    alignItems: 'center',
  },
  groupAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.lg,
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
  },
  groupNameInput: {
    ...Typography.h3,
    color: Colors.dark.text,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: Spacing.sm,
  },
  groupDescriptionInput: {
    ...Typography.body,
    color: Colors.dark.text,
    paddingVertical: Spacing.xs,
    minHeight: 40,
  },
  selectedSection: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  selectedTitle: {
    ...Typography.caption,
    color: Colors.dark.tabIconDefault,
    marginBottom: Spacing.sm,
  },
  selectedContactsList: {
    paddingHorizontal: Spacing.xs,
  },
  selectedContact: {
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    width: 60,
  },
  selectedContactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.xs,
  },
  selectedContactName: {
    ...Typography.caption,
    color: Colors.dark.text,
    fontSize: 10,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: 8,
  },
  contactsSection: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.body,
    color: Colors.dark.tabIconDefault,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontWeight: '600',
  },
  contactsList: {
    paddingBottom: Spacing.xl,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  contactPhone: {
    ...Typography.caption,
    color: Colors.dark.tabIconDefault,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.dark.tint,
    borderColor: Colors.dark.tint,
  },
});