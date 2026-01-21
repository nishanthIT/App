import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const { width: screenWidth } = Dimensions.get('window');

const PromotionScreen = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      console.log('📱 Loading promotions...');
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log('📱 No token found');
        return;
      }

      console.log('📱 API URL:', `${API_BASE_URL}/promotions`);
      const response = await fetch(`${API_BASE_URL}/promotions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📱 Loaded promotions:', data.promotions?.length || 0);
        console.log('📱 First promotion:', data.promotions?.[0]);
        console.log('📱 ALL PROMOTIONS DATA:', JSON.stringify(data, null, 2));
        
        // Force clear and set promotions
        setPromotions([]);
        setTimeout(() => {
          setPromotions(data.promotions || []);
          console.log('📱 PROMOTIONS SET TO STATE:', data.promotions?.length || 0);
        }, 100);
      } else {
        console.error('📱 Failed to load promotions', response.status);
        const errorText = await response.text();
        console.error('📱 Error response:', errorText);
      }
    } catch (error) {
      console.error('📱 Error loading promotions:', error);
    } finally {
      console.log('📱 Setting loading to false');
      setLoading(false);
    }
  };

  const addToNeededList = async (product) => {
    try {
      // This would integrate with your existing needed list functionality
      Alert.alert(
        'Add to Needed List',
        `Add ${product.title} to your needed list?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add',
            onPress: async () => {
              // Add your needed list logic here
              // This should call your existing needed list API
              Alert.alert('Success', `${product.title} added to your needed list!`);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to needed list:', error);
      Alert.alert('Error', 'Failed to add product to needed list');
    }
  };

  const renderPromotionCard = ({ item }) => {
    console.log('📱 RENDERING PROMOTION CARD:', item.title, item.id);
    return (
      <View style={styles.promotionCard}>
        {/* Full Promotion Image */}
        <Image source={{ uri: item.imageUrl?.replace('localhost:3000', '192.168.1.13:3000') }} style={styles.promotionImage} />
      
      {/* Promotion Info */}
      <View style={styles.promotionInfo}>
        <Text style={styles.promotionTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.promotionDescription}>{item.description}</Text>
        )}
        <Text style={styles.shopInfo}>📍 {item.shop.name}</Text>
        <Text style={styles.shopAddress}>{item.shop.address}</Text>
      </View>

      {/* View Products Button */}
      <TouchableOpacity
        style={styles.viewProductsButton}
        onPress={() => {
          setSelectedPromotion(item);
          setShowProducts(true);
        }}
      >
        <Text style={styles.viewProductsButtonText}>View Products</Text>
      </TouchableOpacity>
    </View>
    );
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        {item.img && (
          <Image 
            source={{ 
              uri: Array.isArray(item.img) 
                ? item.img[0] 
                : (item.img.startsWith('http') ? item.img : `${API_BASE_URL.replace('/api', '')}${item.img}`) 
            }} 
            style={styles.productImage} 
          />
        )}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{item.title}</Text>
          {item.barcode && (
            <Text style={styles.productBarcode}>Barcode: {item.barcode}</Text>
          )}
          <Text style={styles.productPrice}>£{(parseFloat(item.price) || parseFloat(item.rrp) || 0).toFixed(2)}</Text>
        </View>
      </View>
      
      {/* Add to Needed List Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToNeededList(item)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading promotions...</Text>
      </View>
    );
  }

  if (showProducts && selectedPromotion) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.productsHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowProducts(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.productsHeaderTitle}>{selectedPromotion.title}</Text>
          <Text style={styles.productsHeaderSubtitle}>
            {selectedPromotion.products.length} Products
          </Text>
        </View>

        {/* Products List */}
        <FlatList
          data={selectedPromotion.products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Promotions</Text>
        <Text style={styles.headerSubtitle}>Special offers and deals</Text>
      </View>

      {promotions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active promotions</Text>
          <Text style={styles.emptySubtext}>Check back later for new deals!</Text>
        </View>
      ) : (
        <FlatList
          data={promotions}
          renderItem={renderPromotionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.promotionsContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadPromotions}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  promotionsContainer: {
    padding: 16,
  },
  promotionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promotionImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover',
  },
  promotionInfo: {
    padding: 16,
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  shopInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 14,
    color: '#666',
  },
  viewProductsButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewProductsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsHeader: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  productsHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  productsHeaderSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  productsContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PromotionScreen;