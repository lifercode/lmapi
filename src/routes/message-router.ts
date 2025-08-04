import { Router } from 'express';
import { createMessage, getMessages, getMessageById, sendMessageToAgent } from '@/controllers/message-controller';
import { authenticateToken } from '@/middleware/auth';

const messageRouter = Router();

/**
 * @route POST /messages
 * @description Create a new message
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {threadId: string, role: "assistant" | "user", content: string}
 * @returns {success: boolean, message: string, data: {message: {}}}
 */
messageRouter.post('/', authenticateToken, createMessage);

/**
 * @route POST /messages/send-to-agent
 * @description Send message to agent via thread (creates contact and thread if needed)
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {content: string, email?: string, phone?: string, origin: string, agentId: string}
 * @returns {success: boolean, message: string, data: {userMessage: {}, assistantMessage: {}, thread: {}, contact: {}}}
 */
messageRouter.post('/send-to-agent', authenticateToken, sendMessageToAgent);

/**
 * @route GET /messages
 * @description Get all messages with pagination and search
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string, threadId?: string, role?: "assistant" | "user"}
 * @returns {success: boolean, message: string, data: {messages: [], pagination: {}}}
 */
messageRouter.get('/', authenticateToken, getMessages);

/**
 * @route GET /messages/:id
 * @description Get a message by ID
 * @headers {Authorization: "Bearer TOKEN"}
 * @params {id: string}
 * @returns {success: boolean, message: string, data: {message: {}}}
 */
messageRouter.get('/:id', authenticateToken, getMessageById);

export { messageRouter }; 