import axios, { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

// defines structure for backend error responses
interface ApiErrorResponse {
  message: string;
}

// creates axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// configures response interceptor to unwrap data and handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,

  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Unknown Error';

    // logs api errors for debugging purposes
    console.error(`[API Error ${status}]: ${message}`);

    return Promise.reject(error);
  },
);
