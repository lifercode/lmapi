import { Router } from 'express';
import { 
  createCompany, 
  getCompanies, 
  getCompanyById, 
  updateCompany, 
  deleteCompany 
} from '@/controllers/company-controller';
import { authenticateToken } from '@/middleware/auth';

const companyRouter = Router();

/**
 * @route POST /companies
 * @description Create a new company (automatically assigned to authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {name: string, notifications: [{provider: string, value: string, enabled: boolean}], brandLogoUrl: string, brandColor: string}
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt}}
 */
companyRouter.post('/', authenticateToken, createCompany);

/**
 * @route GET /companies
 * @description Get all companies owned by authenticated user with pagination and search
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string}
 * @returns {success: boolean, message: string, data: {companies: [], pagination: {}}}
 */
companyRouter.get('/', authenticateToken, getCompanies);

/**
 * @route GET /companies/:id
 * @description Get a company by ID (only if owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Company ID
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt, updatedAt}}
 */
companyRouter.get('/:id', authenticateToken, getCompanyById);

/**
 * @route PUT /companies/:id
 * @description Update a company by ID (only if owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Company ID
 * @body {name?: string, notifications?: [{provider: string, value: string, enabled: boolean}], brandLogoUrl?: string, brandColor?: string}
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt, updatedAt}}
 */
companyRouter.put('/:id', authenticateToken, updateCompany);

/**
 * @route DELETE /companies/:id
 * @description Delete a company by ID (only if owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Company ID
 * @returns {success: boolean, message: string, data: {id, name}}
 */
companyRouter.delete('/:id', authenticateToken, deleteCompany);

export { companyRouter }; 