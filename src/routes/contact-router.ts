import { Router } from 'express';
import { createContact, getContacts, getContactById } from '@/controllers/contact-controller';
import { authenticateToken } from '@/middleware/auth';

const contactRouter = Router();

/**
 * @route POST /contacts
 * @description Create a new contact
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {name: string, email: string, phone: string}
 * @returns {success: boolean, message: string, data: {contact: {}}}
 */
contactRouter.post('/', authenticateToken, createContact);

/**
 * @route GET /contacts
 * @description Get all contacts with pagination and search
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string}
 * @returns {success: boolean, message: string, data: {contacts: [], pagination: {}}}
 */
contactRouter.get('/', authenticateToken, getContacts);

/**
 * @route GET /contacts/:id
 * @description Get a contact by ID
 * @headers {Authorization: "Bearer TOKEN"}
 * @params {id: string}
 * @returns {success: boolean, message: string, data: {contact: {}}}
 */
contactRouter.get('/:id', authenticateToken, getContactById);

export { contactRouter }; 