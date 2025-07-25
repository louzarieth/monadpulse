/**
 * API utility functions for making HTTP requests
 */

// Base URL for API requests, falls back to relative path if not set
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper function to handle HTTP requests
 */
async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  // Add request body for non-GET requests
  if (method !== 'GET' && data) {
    config.body = JSON.stringify(data);
  }

  try {
    // Prepend the base URL if it's a relative URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, config);
    const responseData: ApiResponse<T> = await response.json();

    if (!response.ok || !responseData.success) {
      const error = new Error(responseData.error || 'Request failed');
      (error as any).status = response.status;
      throw error;
    }

    return responseData.data;
  } catch (error) {
    console.error(`API ${method} ${url} failed:`, error);
    throw error;
  }
}

/**
 * GET request
 */
export async function get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return request<T>('GET', url, undefined, options);
}

/**
 * POST request
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  return request<T>('POST', url, data, options);
}

/**
 * PUT request
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  return request<T>('PUT', url, data, options);
}

/**
 * DELETE request
 */
export async function del<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return request<T>('DELETE', url, undefined, options);
}

export default {
  get,
  post,
  put,
  delete: del,
};
