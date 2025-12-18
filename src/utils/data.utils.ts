/**
 * Utility functions for data transformation
 */

/**
 * Convert snake_case keys to camelCase
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }

  return result;
}

/**
 * Transform department data for frontend
 */
export function transformDepartment(dept: any): any {
  return toCamelCase(dept);
}

/**
 * Transform college data for frontend
 */
export function transformCollege(college: any): any {
  return toCamelCase(college);
}

/**
 * Transform user data for frontend
 */
export function transformUser(user: any): any {
  const transformed = toCamelCase(user);
  // Remove sensitive data
  delete transformed.passwordHash;
  return transformed;
}

/**
 * Transform resource data for frontend
 */
export function transformresource(resource: any): any {
  return toCamelCase(resource);
}

/**
 * Transform paginated result for frontend
 */
export function transformPaginatedResult<T>(result: { data: T[], pagination: any }, transformer: (item: T) => any): any {
  return {
    data: result.data.map(transformer),
    pagination: result.pagination
  };
}
