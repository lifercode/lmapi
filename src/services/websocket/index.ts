import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer, Server } from 'http';
import { logger } from '@/server';

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public emitNewMessage(id: string, message: any) {
    if (!this.io) {
      logger.warn('WebSocket not initialized');
      return;
    }

    this.io.emit(id, message);

    logger.info(`Message emitted to ${id}`);
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }
}

const webSocketService = WebSocketService.getInstance(); 

export const setupAppWebsocket = async (server: Server) => {
	webSocketService.initialize(server);
}

export default webSocketService; 