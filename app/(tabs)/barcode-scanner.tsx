import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import productService from '@/services/productService';

interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'loading';
}

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const listName = params.listName as string;

  console.log('Barcode Scanner - Route params:', { listId, listName, allParams: params });

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Request camera permission on mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'loading') => {
    setToast({ text: message, type });
    
    // Animate in
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 2 seconds for success/error
    if (type !== 'loading') {
      setTimeout(() => {
        hideToast();
      }, 2000);
    }
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  const playBeep = () => {
    // Play vibration as beep sound
    Vibration.vibrate(100);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;

    // Validate listId is present
    if (!listId) {
      Alert.alert('Error', 'No list selected. Please go back and try again.');
      return;
    }

    setScanned(true);
    setIsProcessing(true);

    // Play beep sound (vibration)
    playBeep();

    // Log the scanned data
    console.log('=== BARCODE SCANNED ===');
    console.log('Type:', type);
    console.log('Data:', data);
    console.log('List ID:', listId);
    console.log('List Name:', listName);
    console.log('======================');

    try {
      // Show loading toast
      showToast('Searching product...', 'loading');

      // Search for product by barcode
      const product = await productService.searchByBarcode(data);

      console.log('Product search result:', product);

      if (!product) {
        showToast('Product not found', 'error');
        // Allow scanning again after 1.5 seconds
        setTimeout(() => {
          setScanned(false);
          setIsProcessing(false);
        }, 1500);
        return;
      }

      console.log('Product found:', { id: product.id, title: product.title });

      // Product found, now add to list
      hideToast();
      showToast('Adding to list...', 'loading');

      console.log('Adding product to list:', { listId, productId: product.id });

      const result = await productService.addProductToList(listId, product.id);

      // Success!
      hideToast();
      
      // Check if product was already in list
      if (result.alreadyExists) {
        showToast('Already in list', 'success');
        console.log('Product already in list:', product.title);
      } else {
        showToast(`✓ ${product.title}`, 'success');
        console.log('Product added successfully:', product.title);
      }

      // Allow scanning next product immediately
      setTimeout(() => {
        setScanned(false);
        setIsProcessing(false);
      }, 500);

    } catch (error: any) {
      console.error('Error processing barcode:', error);
      hideToast();
      
      const errorMsg = error.message || 'Failed to add product';
      showToast(errorMsg, 'error');
      
      // Allow scanning again after 1.5 seconds
      setTimeout(() => {
        setScanned(false);
        setIsProcessing(false);
      }, 1500);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={Colors.dark.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan barcodes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Toast Notification */}
        {toast && (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
                backgroundColor:
                  toast.type === 'success'
                    ? 'rgba(34, 197, 94, 0.95)'
                    : toast.type === 'error'
                    ? 'rgba(239, 68, 68, 0.95)'
                    : 'rgba(59, 130, 246, 0.95)',
              },
            ]}
          >
            {toast.type === 'loading' && (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            )}
            {toast.type === 'success' && (
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            {toast.type === 'error' && (
              <Ionicons name="close-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.toastText}>{toast.text}</Text>
          </Animated.View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Barcode</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Scanning Area */}
        <View style={styles.scanningArea}>
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Red scanning line in the center */}
            <View style={styles.scanLine} />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {isProcessing 
              ? 'Processing...' 
              : scanned 
              ? 'Product added! Scan next item' 
              : 'Scan barcodes to add products'}
          </Text>
          <Text style={styles.instructionSubtext}>
            {listName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.dark.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    width: 260,
    height: 2,
    backgroundColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionContainer: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
