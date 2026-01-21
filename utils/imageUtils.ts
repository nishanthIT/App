/**
 * Utility functions for handling product images
 * 
 * Products can have images in different formats:
 * 1. Full URL: https://backend.h7tex.com/api/image/5051469120407
 * 2. Relative API path: /api/image/23456789876543
 * 3. Relative image path: /images/99999999999998.png
 * 4. Object with url property: {ean: '...', url: 'https://...', type: 'api', ...}
 * 5. null
 */

const IMAGE_BASE_URL = 'https://backend.h7tex.com';

export interface ProductImageData {
  ean?: string;
  url?: string;
  type?: string;
  category?: string;
  filename?: string | null;
}

/**
 * Get the proper image URL from various product image formats
 * @param img - The image data (can be string, object, or null)
 * @param barcode - Optional barcode to use as fallback for generating image URL
 * @returns The full image URL or null if no image available
 */
export function getProductImageUrl(
  img: string | ProductImageData | null | undefined,
  barcode?: string | null
): string | null {
  // Handle null/undefined
  if (!img && !barcode) {
    return null;
  }

  // If img is null but we have a barcode, try to construct URL from barcode
  if (!img && barcode) {
    return `${IMAGE_BASE_URL}/api/image/${barcode}`;
  }

  // If img is a string
  if (typeof img === 'string') {
    // Already a full URL
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    
    // Relative path starting with /api/
    if (img.startsWith('/api/')) {
      return `${IMAGE_BASE_URL}${img}`;
    }
    
    // Relative path starting with /images/
    if (img.startsWith('/images/')) {
      return `${IMAGE_BASE_URL}${img}`;
    }
    
    // Any other relative path
    if (img.startsWith('/')) {
      return `${IMAGE_BASE_URL}${img}`;
    }
    
    // Just a filename or barcode - assume it's an API image
    return `${IMAGE_BASE_URL}/api/image/${img}`;
  }

  // If img is an object with url property
  if (typeof img === 'object' && img !== null) {
    const imgObj = img as ProductImageData;
    
    // Use the url property if available
    if (imgObj.url) {
      // Already a full URL
      if (imgObj.url.startsWith('http://') || imgObj.url.startsWith('https://')) {
        return imgObj.url;
      }
      
      // Relative path
      if (imgObj.url.startsWith('/')) {
        return `${IMAGE_BASE_URL}${imgObj.url}`;
      }
      
      return `${IMAGE_BASE_URL}/api/image/${imgObj.url}`;
    }
    
    // Fallback to ean if available
    if (imgObj.ean) {
      return `${IMAGE_BASE_URL}/api/image/${imgObj.ean}`;
    }
  }

  // Fallback to barcode if provided
  if (barcode) {
    return `${IMAGE_BASE_URL}/api/image/${barcode}`;
  }

  return null;
}

/**
 * Get a placeholder image URL for products without images
 * @returns A placeholder image URL
 */
export function getPlaceholderImageUrl(): string {
  // Return a neutral placeholder
  return 'https://via.placeholder.com/100x100?text=No+Image';
}

/**
 * Check if a product has a valid image
 * @param img - The image data
 * @param barcode - Optional barcode
 * @returns boolean indicating if product has an image
 */
export function hasProductImage(
  img: string | ProductImageData | null | undefined,
  barcode?: string | null
): boolean {
  return getProductImageUrl(img, barcode) !== null;
}
