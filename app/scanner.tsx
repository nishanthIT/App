import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '@/contexts/AppContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Glassmorphism } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{name: string} | null>(null);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Animated scanning line
  useEffect(() => {
    if (isScanning) {
      const startAnimation = () => {
        Animated.sequence([
          Animated.timing(scanLineAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isScanning) {
            startAnimation();
          }
        });
      };
      startAnimation();
    }
  }, [isScanning, scanLineAnimation]);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsScanning(false);
    
    // Vibration feedback for successful scan
    Vibration.vibrate([0, 100, 50, 100]);
    
    // Simulate product lookup
    setTimeout(() => {
      const mockProduct = {
        id: Date.now().toString(),
        name: `Product ${data.slice(-4)}`,
        barcode: data,
        category: 'General',
        image: 'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=200',
        description: 'Scanned product from barcode',
      };

      let targetListId = state.currentListId;

      // If no current list, create one
      if (!targetListId) {
        const newList = {
          id: Date.now().toString(),
          name: `Shopping List ${new Date().toLocaleDateString()}`,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        dispatch({ type: 'CREATE_SHOPPING_LIST', payload: newList });
        dispatch({ type: 'SET_CURRENT_LIST', payload: newList.id });
        targetListId = newList.id;
      }

      // Check if item already exists in the list
      const currentList = state.shoppingLists.find(list => list.id === targetListId);
      const existingItem = currentList?.items.find(item => item.product.barcode === data);

      if (existingItem) {
        // Item already exists - just show a different message
        setScannedProduct({ name: `${mockProduct.name} (Already in list)` });
      } else {
        // Add new item
        const newItem = {
          id: Date.now().toString(),
          productId: mockProduct.id,
          product: mockProduct,
          quantity: 1,
          isPurchased: false,
          addedAt: new Date().toISOString(),
        };

        dispatch({
          type: 'ADD_ITEM_TO_LIST',
          payload: { listId: targetListId, item: newItem },
        });

        setScannedProduct(mockProduct);
      }

      // Show success popup
      setShowSuccess(true);
      
      // Animate success popup (shorter duration)
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(800), // Shorter delay
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        // Reset scanning to allow continuous scanning
        setTimeout(() => {
          setScanned(false);
          setIsScanning(true);
        }, 100);
      });
    }, 300); // Faster processing
  };

  const handleManualEntry = () => {
    Alert.alert('Manual Entry', 'Manual product entry feature coming soon!');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
        <View style={styles.permissionContainer}>
          <View style={styles.loadingContainer}>
            <IconSymbol name="camera" size={48} color={Colors.dark.primary} />
            <ThemedText style={styles.loadingText}>Requesting camera permission...</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <IconSymbol name="camera" size={64} color={Colors.dark.primary} />
            <ThemedText style={styles.permissionTitle}>Camera Access Required</ThemedText>
            <ThemedText style={styles.permissionDescription}>
              We need access to your camera to scan barcodes and add products to your lists.
            </ThemedText>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <IconSymbol name="checkmark" size={20} color={Colors.dark.background} />
              <ThemedText style={styles.permissionButtonText}>Grant Permission</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router?.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        
        <ThemedText style={styles.title}>Scan Barcode</ThemedText>
        
        <TouchableOpacity style={styles.manualButton} onPress={handleManualEntry}>
          <IconSymbol name="keyboard" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "codabar", "upc_a", "upc_e", "pdf417", "aztec", "datamatrix"],
          }}
          autofocus="on"
          enableTorch={false}
          flash="off"
          mode="picture"
          active={isScanning}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Animated Scanning Line */}
              {isScanning && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, width * 0.7 - 4], // Scan area height minus line height
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>
            
            <View style={styles.instructions}>
              <View style={styles.instructionCard}>
                <IconSymbol name="viewfinder" size={20} color={Colors.dark.primary} />
                <ThemedText style={styles.instructionText}>
                  Scan barcodes to add items quickly
                </ThemedText>
              </View>
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.scanButton, !isScanning && styles.scanButtonDisabled]}
          onPress={() => {
            setScanned(false);
            setIsScanning(!isScanning);
          }}
        >
          <IconSymbol
            name={isScanning ? "pause.circle.fill" : "play.circle.fill"}
            size={32}
            color={isScanning ? Colors.dark.error : Colors.dark.success}
          />
        </TouchableOpacity>
      </View>

      {/* Success Popup */}
      {showSuccess && scannedProduct && (
        <Animated.View
          style={[
            styles.successPopup,
            {
              opacity: successAnimation,
              transform: [
                {
                  scale: successAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={32}
                color={Colors.dark.success}
              />
            </View>
            <Text style={styles.successTitle}>✅ Added!</Text>
            <Text style={styles.successMessage}>
              {scannedProduct.name}
            </Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.glass,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    fontWeight: '700',
  },
  manualButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.glass,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: Colors.dark.primary,
    top: 0,
    left: 0,
    ...Shadows.neon,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.dark.error,
    borderRadius: 2,
    shadowColor: Colors.dark.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  topRight: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    right: 0,
    left: 'auto',
  },
  bottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 4,
    bottom: 0,
    top: 'auto',
  },
  bottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    right: 0,
    bottom: 0,
    left: 'auto',
    top: 'auto',
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.glass,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.md,
  },
  instructionText: {
    ...Typography.body,
    color: Colors.dark.text,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  scanButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.glass,
    ...Shadows.glow,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
  },
  permissionCard: {
    backgroundColor: Colors.dark.backgroundCard,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    ...Shadows.lg,
  },
  permissionTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionDescription: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.neon,
  },
  permissionButtonText: {
    ...Typography.label,
    color: Colors.dark.background,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  successPopup: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -120 }, { translateY: -60 }],
    width: 240,
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    ...Shadows.lg,
    zIndex: 1000,
  },
  successContent: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  successIcon: {
    marginBottom: Spacing.sm,
  },
  successTitle: {
    ...Typography.body,
    color: Colors.dark.success,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
    fontSize: 16,
  },
  successMessage: {
    ...Typography.bodySmall,
    color: Colors.dark.text,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
});
