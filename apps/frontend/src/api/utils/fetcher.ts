import axios from 'axios';
import { apiClient } from '@/api/utils/client';

/**
 * Performs GET request using configured internal client.
 * Interceptor handles response unwrapping.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  return apiClient.get<T>(url) as Promise<T>;
}

/**
 * Performs POST request with optional payload.
 */
export async function postFetcher<T = unknown>(url: string, data?: unknown): Promise<T> {
  return apiClient.post<T>(url, data) as Promise<T>;
}

/**
 * Performs PUT request for resource updates.
 */
export async function putFetcher<T = unknown>(url: string, data?: unknown): Promise<T> {
  return apiClient.put<T>(url, data) as Promise<T>;
}

/**
 * Performs DELETE request for specified resource.
 */
export async function deleteFetcher<T = unknown>(url: string): Promise<T> {
  return apiClient.delete<T>(url) as Promise<T>;
}

/**
 * Wrapper for external calls using raw axios instance.
 */
export async function externalFetcher<T = unknown>(url: string): Promise<T> {
  try {
    const response = await axios.get<T>(url);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string })?.message || error.message || 'External Fetch Error';
      throw new Error(message, { cause: error });
    }

    throw new Error(error instanceof Error ? error.message : 'Unknown External Error', { cause: error });
  }
}

/**
 * Extracts http status code from error object.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}
