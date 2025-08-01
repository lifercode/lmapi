import { Router } from 'express';
import { createUser, getUsers, login, getCurrentUser } from '@/controllers/user-controller';
import { authenticateToken } from '@/middleware/auth';

const userRouter = Router();

/**
 * @route POST /users
 * @description Create a new user (register)
 * @body {name: string, email: string, password: string}
 * @returns {success: boolean, message: string, data: {user: {}, token: string}}
 */
userRouter.post('/', createUser);

/**
 * @route POST /users/login
 * @description Login user
 * @body {email: string, password: string}
 * @returns {success: boolean, message: string, data: {user: {}, token: string}}
 */
userRouter.post('/login', login);

/**
 * @route GET /users/me
 * @description Get current authenticated user
 * @headers {Authorization: "Bearer TOKEN"}
 * @returns {success: boolean, message: string, data: {user: {}}}
 */
userRouter.get('/me', authenticateToken, getCurrentUser);

/**
 * @route GET /users
 * @description Get all users with pagination and search (protected route)
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string}
 * @returns {success: boolean, message: string, data: {users: [], pagination: {}}}
 */
userRouter.get('/', authenticateToken, getUsers);

export { userRouter }; 