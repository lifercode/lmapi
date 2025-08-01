import { Router } from 'express';
import { createUser, login, getCurrentUser } from '@/controllers/user-controller';
import { authenticateToken } from '@/middleware/auth';

const authRouter = Router();

/**
 * @route POST /auth/register
 * @description Register a new user
 * @body {name: string, email: string, password: string}
 * @returns {success: boolean, message: string, data: {user: {}, token: string}}
 */
authRouter.post('/register', createUser);

/**
 * @route POST /auth/login
 * @description Login user
 * @body {email: string, password: string}
 * @returns {success: boolean, message: string, data: {user: {}, token: string}}
 */
authRouter.post('/login', login);

/**
 * @route GET /auth/me
 * @description Get current authenticated user
 * @headers {Authorization: "Bearer TOKEN"}
 * @returns {success: boolean, message: string, data: {user: {}}}
 */
authRouter.get('/me', authenticateToken, getCurrentUser);

export { authRouter }; 