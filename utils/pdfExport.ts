import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ShoppingList, Store, ProductPrice } from '@/contexts/AppContext';

export interface PDFExportOptions {
  list: ShoppingList;
  stores: Store[];
  productPrices: ProductPrice[];
  sortBy: 'money' | 'nearest';
}

export async function generateShoppingListPDF(options: PDFExportOptions): Promise<string> {
  const { list, stores, productPrices, sortBy } = options;
  
  // Group items by store for shop-by-shop format
  const itemsByStore = groupItemsByStore(list, productPrices, stores, sortBy);
  
  const html = generateHTML(itemsByStore, list);
  
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    console.log('✅ PDF generated successfully:', uri);
    return uri;
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
}

export async function sharePDF(uri: string, filename: string = 'shopping-list.pdf'): Promise<void> {
  try {
    console.log('📄 Starting PDF share process...', { uri, filename });
    
    // Check if sharing is available
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing is not available on this device');
    }

    // Ensure the share dialog has enough time to appear
    console.log('🔄 Initiating share dialog...');
    
    // Use consistent sharing options for all platforms
    const shareResult = await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Shopping List PDF',
      UTI: 'com.adobe.pdf',
    });
    
    console.log('✅ Share completed:', shareResult);
    
    // The share was successful if we get here without error
    return;
    
  } catch (error: any) {
    console.error('❌ PDF sharing failed:', error);
    
    // Handle different types of errors
    if (error.code === 'ERR_SHARING_UNAVAILABLE' || error.message.includes('not available')) {
      throw new Error('Sharing is not supported on this device');
    } else if (error.code === 'ERR_SHARING_CANCELLED' || error.message.includes('cancelled')) {
      // Don't treat cancellation as an error - user chose to cancel
      console.log('ℹ️ User cancelled sharing');
      return;
    } else {
      console.error('📋 Unexpected sharing error:', error);
      throw new Error('Failed to open share dialog. Please try again.');
    }
  }
}

function groupItemsByStore(
  list: ShoppingList,
  productPrices: ProductPrice[],
  stores: Store[],
  sortBy: 'money' | 'nearest'
): { [storeId: string]: { store: Store; items: any[] } } {
  const itemsByStore: { [storeId: string]: { store: Store; items: any[] } } = {};
  
  list.items.forEach(item => {
    const prices = productPrices.filter(price => price.productId === item.productId);
    
    if (prices.length === 0) return;
    
    // Find best price for this item
    const bestPrice = prices.reduce((best, current) => 
      current.price < best.price ? current : best
    );
    
    const store = stores.find(s => s.id === bestPrice.storeId);
    if (!store) return;
    
    if (!itemsByStore[store.id]) {
      itemsByStore[store.id] = { store, items: [] };
    }
    
    itemsByStore[store.id].items.push({
      ...item,
      bestPrice,
      allPrices: prices,
    });
  });
  
  return itemsByStore;
}

function generateHTML(itemsByStore: { [storeId: string]: { store: Store; items: any[] } }, list: ShoppingList): string {
  const currentDate = new Date().toLocaleDateString('en-GB');
  const totalSavings = calculateTotalSavings(itemsByStore);
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Shopping List - ${list.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
          color: #1a1a1a;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #2e7d32;
          color: white;
          border-radius: 12px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .summary {
          background-color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .summary h2 {
          margin: 0 0 15px 0;
          font-size: 20px;
          color: #2e7d32;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .summary-item {
          text-align: center;
          padding: 15px;
          background-color: #e8f5e8;
          border-radius: 8px;
        }
        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #2e7d32;
          margin-bottom: 5px;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
        }
        .store-section {
          background-color: white;
          margin-bottom: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .store-header {
          background-color: #1976d2;
          color: white;
          padding: 20px;
        }
        .store-name {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 5px 0;
        }
        .store-address {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .items-table th {
          background-color: #f5f5f5;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          border-bottom: 2px solid #e0e0e0;
          font-size: 13px;
        }
        .items-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        .item-name {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 14px;
        }
        .item-category {
          color: #666;
          font-size: 12px;
          margin-top: 2px;
        }
        .aiel {
          font-weight: 600;
          color: #1976d2;
          text-align: center;
        }
        .barcode {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #666;
        }
        }
        .price {
          font-weight: 700;
          color: #2e7d32;
          font-size: 18px;
        }
        .savings {
          background-color: #4caf50;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 4px;
          display: inline-block;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          color: #666;
          font-size: 14px;
        }
        @media print {
          body { background-color: white; }
          .store-section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${list.name}</h1>
        <p>Generated on ${currentDate}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${Object.keys(itemsByStore).length}</div>
            <div class="summary-label">Stores to Visit</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${list.items.length}</div>
            <div class="summary-label">Total Items</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">£${totalSavings.toFixed(2)}</div>
            <div class="summary-label">Total Savings</div>
          </div>
        </div>
      </div>
  `;
  
  // Add each store section
  Object.values(itemsByStore).forEach(({ store, items }) => {
    html += `
      <div class="store-section">
        <div class="store-header">
          <h2 class="store-name">${store.name}</h2>
          <p class="store-address">${store.address}</p>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Aiel</th>
              <th>Barcode</th>
              <th>Qty</th>
              <th>Price</th>
              <th>✓</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    items.forEach(item => {
      const aielNumber = item.product.aielNumber || '-';
      const barcode = item.product.barcode || '-';
      
      html += `
        <tr>
          <td>
            <div class="item-name">${item.product.name}</div>
            <div class="item-category">${item.product.category}</div>
          </td>
          <td class="aiel">${aielNumber}</td>
          <td class="barcode">${barcode}</td>
          <td>${item.quantity}</td>
          <td class="price">£${item.bestPrice.price.toFixed(2)}</td>
          <td>
            <div class="checkbox"></div>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  html += `
      <div class="footer">
        <p>Generated by Paymi App - Helping UK shop owners save money</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

function calculateTotalSavings(itemsByStore: { [storeId: string]: { store: Store; items: any[] } }): number {
  let totalSavings = 0;
  
  Object.values(itemsByStore).forEach(({ items }) => {
    items.forEach(item => {
      const highestPrice = Math.max(...item.allPrices.map((p: any) => p.price));
      const savings = highestPrice - item.bestPrice.price;
      totalSavings += savings * item.quantity;
    });
  });
  
  return totalSavings;
}

