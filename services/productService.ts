import api from './api';

export interface Product {
  id: string;
  title: string;
  productUrl?: string;
  caseSize?: string;
  packetSize?: string;
  barcode?: string;
  img?: any;
  retailSize?: string;
  caseBarcode?: string;
  rrp?: number;
  availableInShops?: number;
  lowestPrice?: number;
}

export interface ProductAtShop {
  id: string;
  price: number;
  offerPrice?: number;
  offerExpiryDate?: string;
  shopId: string;
  productId: string;
  updatedAt: string;
  product: Product;
  shop: {
    id: string;
    name: string;
    address: string;
    mobile: string;
  };
}

export interface ListProduct {
  id: string;
  productId: string;
  productAtShopId: string;
  productName: string;
  barcode: string;
  aielNumber?: string;
  lowestPrice: number;
  originalPrice?: number;
  offerPrice?: number;
  hasActiveOffer?: boolean;
  shopName: string;
  shopId?: string;
  img?: any;
  quantity?: number;
  isPurchased?: boolean;
}

class ProductService {
  // Search for products by barcode
  async searchByBarcode(barcode: string): Promise<Product | null> {
    try {
      const response = await api.get(`/products/barcode/${barcode}`);
      console.log('Barcode search response:', response.data);
      
      // Backend returns { success: true, data: { ...product } }
      const product = response.data.data || response.data;
      console.log('Extracted product:', product);
      
      return product;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Product not found for barcode:', barcode);
        return null;
      }
      console.error('Barcode search error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to search by barcode');
    }
  }

  // Search for products by title/keyword
  async searchProducts(query: string): Promise<Product[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      const response = await api.get('/products/search', {
        params: { q: query.trim(), limit: 20 },
      });
      console.log('Search response:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Search error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to search products');
    }
  }

  // Get product by ID
  async getProductById(productId: string): Promise<Product> {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  }

  // Get all products
  async getAllProducts(): Promise<Product[]> {
    const response = await api.get('/products');
    return response.data;
  }

  // Add product to list
  async addProductToList(listId: string, productId: string): Promise<any> {
    try {
      console.log('addProductToList called with:', { listId, productId });
      
      if (!listId || !productId) {
        throw new Error(`Invalid parameters: listId=${listId}, productId=${productId}`);
      }
      
      const response = await api.post('/lists/addProduct', {
        listId,
        productId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Add product error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add product to list';
      throw new Error(errorMessage);
    }
  }

  // Remove product from list
  async removeProductFromList(listId: string, productId: string): Promise<any> {
    try {
      console.log('Removing product from list:', { listId, productId });
      const response = await api.delete('/lists/removeProduct', {
        data: {
          listId,
          productId,
        },
      });
      console.log('Remove product response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Remove product error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 'Failed to remove product from list';
      throw new Error(errorMessage);
    }
  }

  // Get products in a list
  async getListProducts(listId: string): Promise<ListProduct[]> {
    const response = await api.get(`/lists/${listId}`);
    return response.data.products || [];
  }
}

export default new ProductService();
