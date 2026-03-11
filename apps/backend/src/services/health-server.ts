import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Logger } from '@utils/logger';

type HealthStatus = 'ok' | 'degraded';

interface HealthPayload {
  status: HealthStatus;
  uptime: number;
  connectedClients: number;
  f1Connected: boolean;
  timestamp: string;
}

// Headers reused on every response — built once at module load
const HEALTH_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // Allows the Next.js frontend to poll without CORS errors
  'Cache-Control': 'no-store',
};

export class HealthServer {
  private server: ReturnType<typeof createServer> | null = null;
  private readonly port: number;
  private readonly getClientCount: () => number;
  private readonly getIsF1Connected: () => boolean;

  constructor(
    port: number,
    getClientCount: () => number,
    getIsF1Connected: () => boolean
  ) {
    this.port = port;
    this.getClientCount = getClientCount;
    this.getIsF1Connected = getIsF1Connected;
  }

  public start() {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health' && req.method === 'GET') {
        const isF1Connected = this.getIsF1Connected();

        const payload: HealthPayload = {
          status: isF1Connected ? 'ok' : 'degraded',
          uptime: Math.floor(process.uptime()),
          connectedClients: this.getClientCount(),
          f1Connected: isF1Connected,
          timestamp: new Date().toISOString(),
        };

        res.writeHead(200, HEALTH_HEADERS);
        res.end(JSON.stringify(payload));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    this.server.listen(this.port, () => {
      Logger.info(
        `Health server listening on http://localhost:${this.port}/health`
      );
    });

    this.server.on('error', (err: Error) => {
      Logger.error('Health server error', err);
    });
  }

  public stop() {
    if (!this.server) return;

    this.server.close(() => {
      Logger.info('Health server closed.');
    });
    this.server = null;
  }
}
