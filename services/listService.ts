import api from './api';

export interface ShoppingList {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListProduct {
  id: string;
  listId: string;
  productAtShopId: string;
  productAtShop?: {
    id: string;
    price: number;
    product: {
      id: string;
      title: string;
      barcode?: string;
      img?: any;
    };
    shop: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export interface CreateListData {
  name: string;
  description?: string;
}

export interface AddProductToListData {
  listId: string;
  productId: string;
  customerId: number;
}

class ListService {
  // Get all lists for the current user
  async getUserLists(): Promise<ShoppingList[]> {
    try {
      const response = await api.get('/lists');
      return response.data;
    } catch (error: any) {
      console.error('Get lists error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch lists');
    }
  }

  // Get a specific list with its products
  async getListById(listId: string): Promise<any> {
    try {
      const response = await api.get(`/lists/${listId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get list error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch list');
    }
  }

  // Create a new shopping list
  async createList(data: CreateListData): Promise<ShoppingList> {
    try {
      const response = await api.post('/lists', data);
      return response.data;
    } catch (error: any) {
      console.error('Create list error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create list');
    }
  }

  // Add a product to a list
  async addProductToList(data: AddProductToListData): Promise<any> {
    try {
      const response = await api.post('/lists/addProduct', data);
      return response.data;
    } catch (error: any) {
      console.error('Add product to list error:', error);
      throw new Error(error.response?.data?.error || 'Failed to add product to list');
    }
  }

  // Remove a product from a list
  async removeProductFromList(listId: string, productId: string): Promise<any> {
    try {
      const response = await api.delete('/lists/removeProduct', {
        data: { listId, productId },
      });
      return response.data;
    } catch (error: any) {
      console.error('Remove product from list error:', error);
      throw new Error(error.response?.data?.error || 'Failed to remove product from list');
    }
  }

  // Update product quantity in a list
  async updateProductQuantity(listId: string, productAtShopIdOrListProductId: string, quantity: number): Promise<any> {
    try {
      const response = await api.put('/lists/updateQuantity', {
        listId,
        productAtShopId: productAtShopIdOrListProductId,
        listProductId: productAtShopIdOrListProductId, // Send both so backend can find by either
        quantity,
      });
      return response.data;
    } catch (error: any) {
      console.error('Update product quantity error:', error);
      throw new Error(error.response?.data?.error || 'Failed to update product quantity');
    }
  }

  // Toggle purchased status of a product in a list
  async togglePurchased(listId: string, listProductId: string): Promise<any> {
    try {
      const response = await api.put('/lists/togglePurchased', {
        listId,
        listProductId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Toggle purchased error:', error);
      throw new Error(error.response?.data?.error || 'Failed to toggle purchased status');
    }
  }

  // Get lowest prices for products in a list
  async getLowestPrices(listId: string, customerId: number): Promise<any> {
    try {
      const response = await api.get(`/lists/${listId}/lowest-prices`, {
        params: { customerId },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get lowest prices error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get lowest prices');
    }
  }

  // Delete a shopping list
  async deleteList(listId: string): Promise<void> {
    try {
      await api.delete(`/lists/${listId}`);
    } catch (error: any) {
      console.error('Delete list error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete list');
    }
  }
}

export default new ListService();
