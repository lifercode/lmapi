import { Router } from 'express';
import { createThread, getThreads, getThreadById } from '@/controllers/thread-controller';
import { authenticateToken } from '@/middleware/auth';

const threadRouter = Router();

/**
 * @route POST /threads
 * @description Create a new thread
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {contactId: string, agentId: string, name: string, origin: "whatsapp" | "instagram" | "website" | "tiktok" | "messenger"}
 * @returns {success: boolean, message: string, data: {thread: {}}}
 */
threadRouter.post('/', authenticateToken, createThread);

/**
 * @route GET /threads
 * @description Get all threads with pagination and search
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string, contactId?: string, agentId?: string, origin?: "whatsapp" | "instagram" | "website" | "tiktok" | "messenger"}
 * @returns {success: boolean, message: string, data: {threads: [], pagination: {}}}
 */
threadRouter.get('/', authenticateToken, getThreads);

/**
 * @route GET /threads/:id
 * @description Get a thread by ID
 * @headers {Authorization: "Bearer TOKEN"}
 * @params {id: string}
 * @returns {success: boolean, message: string, data: {thread: {}}}
 */
threadRouter.get('/:id', authenticateToken, getThreadById);

export { threadRouter }; 