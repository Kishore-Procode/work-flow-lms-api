/**
 * Utility functions for converting object keys between different naming conventions
 */

/**
 * Convert snake_case keys to camelCase
 */
export function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        converted[camelKey] = convertKeysToCamelCase(obj[key]);
      }
    }
    
    return converted;
  }

  return obj;
}

/**
 * Convert camelCase keys to snake_case
 */
export function convertKeysToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
        converted[snakeKey] = convertKeysToSnakeCase(obj[key]);
      }
    }
    
    return converted;
  }

  return obj;
}

/**
 * Deep clone an object
 */
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }

  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Remove null and undefined values from an object
 */
export function removeNullValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeNullValues).filter(item => item !== null && item !== undefined);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = removeNullValues(obj[key]);
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  return obj;
}
