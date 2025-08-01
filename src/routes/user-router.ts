import { Router } from 'express';
import { createUser, getUsers } from '@/controllers/user-controller';

const userRouter = Router();

/**
 * @route POST /users
 * @description Create a new user
 * @body {name: string, email: string}
 * @returns {success: boolean, message: string, data: {id, name, email, createdAt}}
 */
userRouter.post('/', createUser);

/**
 * @route GET /users
 * @description Get all users with pagination and search
 * @query {page?: number, limit?: number, search?: string}
 * @returns {success: boolean, message: string, data: {users: [], pagination: {}}}
 */
userRouter.get('/', getUsers);

export { userRouter }; 