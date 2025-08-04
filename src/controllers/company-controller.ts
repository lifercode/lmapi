import { Request, Response } from 'express';
import { z } from 'zod';
import { Company } from '@/models/Company';
import { User } from '@/models/User';
import { logger } from '@/server';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '@/middleware/auth';

// Validation schema for notification
const notificationSchema = z.object({
  provider: z.enum(['email', 'sms', 'whatsapp'], {
    errorMap: () => ({ message: 'Provider must be one of: email, sms, whatsapp' })
  }),
  value: z.string()
    .max(255, 'Notification value cannot exceed 255 characters')
    .trim()
    .nullable()
    .optional(),
  enabled: z.boolean().default(true)
});

// Validation schema for creating company (userId will be taken from JWT token)
const createCompanySchema = z.object({
  name: z.string()
    .min(2, 'Company name must be at least 2 characters long')
    .max(100, 'Company name cannot exceed 100 characters')
    .trim(),
  notifications: z.array(notificationSchema)
    .default([])
    .refine(notifications => {
      const providers = notifications.map(n => n.provider);
      return providers.length === new Set(providers).size;
    }, 'Each notification provider can only be used once per company'),
  brandLogoUrl: z.string()
    .url('Please provide a valid URL')
    .regex(/\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i, 'Please provide a valid image URL')
    .trim(),
  brandColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color (e.g., #FF5733 or #F57)')
    .trim()
});

// Validation schema for updating company
const updateCompanySchema = createCompanySchema.partial();

// Validation schema for query parameters (removed userId as it comes from JWT)
const getCompaniesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional()
});

export const createCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createCompanySchema.parse(req.body);
    
    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Check if company with same name already exists for this user
    const existingCompany = await Company.findOne({ 
      name: validatedData.name, 
      userId: userId 
    });
    if (existingCompany) {
      res.status(409).json({
        success: false,
        message: 'Company with this name already exists'
      });
      return;
    }

    // Create new company with authenticated user's ID
    const company = new Company({
      ...validatedData,
      userId: userId
    });
    const savedCompany = await company.save();
    await savedCompany.populate('userId', 'name email');

    logger.info(`Company created successfully: ${savedCompany.name} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        id: savedCompany._id,
        name: savedCompany.name,
        notifications: savedCompany.notifications,
        brandLogoUrl: savedCompany.brandLogoUrl,
        brandColor: savedCompany.brandColor,
        userId: savedCompany.userId,
        createdAt: savedCompany.createdAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    logger.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCompanies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search } = getCompaniesQuerySchema.parse(req.query);

    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Build search query - always filter by authenticated user's ID
    const searchQuery: any = {
      userId: userId
    };

    if (search) {
      searchQuery.name = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get companies with pagination (only user's own companies)
    const [companies, totalCompanies] = await Promise.all([
      Company.find(searchQuery)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalCompanies / limit);

    logger.info(`Retrieved ${companies.length} companies for user ${userId} (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Companies retrieved successfully',
      data: {
        companies: companies.map(company => ({
          id: company._id,
          name: company.name,
          notifications: company.notifications,
          brandLogoUrl: company.brandLogoUrl,
          brandColor: company.brandColor,
          userId: company.userId,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCompanies,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    logger.error('Error getting companies:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCompanyById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
      return;
    }

    // Find company by ID and ensure it belongs to the authenticated user
    const company = await Company.findOne({ 
      _id: id, 
      userId: userId 
    }).populate('userId', 'name email');
    
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found or access denied'
      });
      return;
    }

    logger.info(`Retrieved company: ${company.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Company retrieved successfully',
      data: {
        id: company._id,
        name: company.name,
        notifications: company.notifications,
        brandLogoUrl: company.brandLogoUrl,
        brandColor: company.brandColor,
        userId: company.userId,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error getting company by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
      return;
    }

    // Validate request body
    const validatedData = updateCompanySchema.parse(req.body);

    // Find and update company only if it belongs to the authenticated user
    const updatedCompany = await Company.findOneAndUpdate(
      { _id: id, userId: userId },
      validatedData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!updatedCompany) {
      res.status(404).json({
        success: false,
        message: 'Company not found or access denied'
      });
      return;
    }

    logger.info(`Company updated successfully: ${updatedCompany.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: {
        id: updatedCompany._id,
        name: updatedCompany.name,
        notifications: updatedCompany.notifications,
        brandLogoUrl: updatedCompany.brandLogoUrl,
        brandColor: updatedCompany.brandColor,
        userId: updatedCompany.userId,
        createdAt: updatedCompany.createdAt,
        updatedAt: updatedCompany.updatedAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    logger.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
      return;
    }

    // Find and delete company only if it belongs to the authenticated user
    const deletedCompany = await Company.findOneAndDelete({ 
      _id: id, 
      userId: userId 
    });

    if (!deletedCompany) {
      res.status(404).json({
        success: false,
        message: 'Company not found or access denied'
      });
      return;
    }

    logger.info(`Company deleted successfully: ${deletedCompany.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
      data: {
        id: deletedCompany._id,
        name: deletedCompany.name
      }
    });
  } catch (error) {
    logger.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 