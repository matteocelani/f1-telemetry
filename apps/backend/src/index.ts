import { F1Client } from '@services/f1-client';
import { HealthServer } from '@services/health-server';
import { SocketServer } from '@services/socket-server';
import { Logger } from '@utils/logger';

const WS_PORT = parseInt(process.env.PORT ?? '8080', 10);
// Health and WS run on different ports to avoid conflicts on PaaS (Koyeb, Render)
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT ?? '8081', 10);

let socketServer: SocketServer | null = null;
let healthServer: HealthServer | null = null;

async function bootstrap() {
  Logger.info('Starting F1 Telemetry Backend...');

  socketServer = new SocketServer(WS_PORT);
  socketServer.start();

  const f1Client = new F1Client(socketServer);

  healthServer = new HealthServer(
    HEALTH_PORT,
    () => socketServer?.clientCount ?? 0,
    () => f1Client.connected
  );
  healthServer.start();

  await f1Client.connect();
}

const shutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);
  healthServer?.stop();
  socketServer?.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Log and exit — unhandled errors in production should be surfaced, not swallowed
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  Logger.error('Bootstrap failed', error);
  process.exit(1);
});
