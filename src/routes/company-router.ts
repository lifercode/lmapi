import { Router } from 'express';
import { 
  createCompany, 
  getCompanies, 
  getCompanyById, 
  updateCompany, 
  deleteCompany 
} from '@/controllers/company-controller';

const companyRouter = Router();

/**
 * @route POST /companies
 * @description Create a new company
 * @body {name: string, notifications: [{provider: string, value: string, enabled: boolean}], brandLogoUrl: string, brandColor: string, userId: string}
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt}}
 */
companyRouter.post('/', createCompany);

/**
 * @route GET /companies
 * @description Get all companies with pagination and search
 * @query {page?: number, limit?: number, search?: string, userId?: string}
 * @returns {success: boolean, message: string, data: {companies: [], pagination: {}}}
 */
companyRouter.get('/', getCompanies);

/**
 * @route GET /companies/:id
 * @description Get a company by ID
 * @param {string} id - Company ID
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt, updatedAt}}
 */
companyRouter.get('/:id', getCompanyById);

/**
 * @route PUT /companies/:id
 * @description Update a company by ID
 * @param {string} id - Company ID
 * @body {name?: string, notifications?: [{provider: string, value: string, enabled: boolean}], brandLogoUrl?: string, brandColor?: string}
 * @returns {success: boolean, message: string, data: {id, name, notifications, brandLogoUrl, brandColor, userId, createdAt, updatedAt}}
 */
companyRouter.put('/:id', updateCompany);

/**
 * @route DELETE /companies/:id
 * @description Delete a company by ID
 * @param {string} id - Company ID
 * @returns {success: boolean, message: string, data: {id, name}}
 */
companyRouter.delete('/:id', deleteCompany);

export { companyRouter }; 