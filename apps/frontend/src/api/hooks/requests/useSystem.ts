import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/api/utils/fetcher';

interface HealthResponse {
  status: 'ok' | 'degraded';
  isF1Connected: boolean;
  connectedClients: number;
}

const HEALTH_POLL_INTERVAL_MS = 5_000;
const HEALTH_RETRY_COUNT = 2;

export function useHealthCheck() {
  return useQuery<HealthResponse>({
    queryKey: ['system', 'health'],
    queryFn: () => fetcher<HealthResponse>('/health'),
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    retry: HEALTH_RETRY_COUNT,
  });
}
