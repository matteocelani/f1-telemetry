import { F1Client } from '@services/f1-client';
import { SocketServer } from '@services/socket-server';
import { Logger } from '@utils/logger';

const PORT = parseInt(process.env.PORT ?? '8080', 10);

let socketServer: SocketServer | null = null;

async function bootstrap() {
  Logger.info('Starting F1 Telemetry Backend...');

  socketServer = new SocketServer(PORT);
  socketServer.start();

  const f1Client = new F1Client(socketServer);
  socketServer.setHealthChecks(() => f1Client.isConnectedToF1);

  await f1Client.connect();
}

const shutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);
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
