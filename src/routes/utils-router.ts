import { Router } from 'express';
import { 
  healthCheck,
  uploadFile,
} from '@/controllers/utils-controller';

const utilsRouter = Router();

/**
 * @route GET /utils/health
 * @description Health check endpoint
 * @returns {success: boolean, message: string, data: {status, timestamp, uptime, environment, version}}
 */
utilsRouter.get('/health', healthCheck);

/**
 * @route POST /utils/upload
 * @description Upload file to Minio
 * @returns {success: boolean, message: string, data: {bucket, presignedUrls}}
 */
utilsRouter.post('/upload', uploadFile);


export { utilsRouter }; 