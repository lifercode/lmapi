import { Request, Response } from 'express';
import { z } from 'zod';
import { Company } from '@/models/Company';
import { User } from '@/models/User';
import { logger } from '@/server';
import { Types } from 'mongoose';

// Validation schema for notification
const notificationSchema = z.object({
  provider: z.enum(['email', 'sms', 'slack', 'webhook'], {
    errorMap: () => ({ message: 'Provider must be one of: email, sms, slack, webhook' })
  }),
  value: z.string()
    .min(1, 'Notification value is required')
    .max(255, 'Notification value cannot exceed 255 characters')
    .trim(),
  enabled: z.boolean().default(true)
});

// Validation schema for creating company
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
    .trim(),
  userId: z.string()
    .min(1, 'User ID is required')
    .refine(val => Types.ObjectId.isValid(val), 'Invalid User ID format')
});

// Validation schema for updating company
const updateCompanySchema = createCompanySchema.partial().omit({ userId: true });

// Validation schema for query parameters
const getCompaniesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  userId: z.string().optional().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid User ID format')
});

export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createCompanySchema.parse(req.body);
    
    // Check if user exists
    const userExists = await User.findById(validatedData.userId);
    if (!userExists) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if company with same name already exists for this user
    const existingCompany = await Company.findOne({ 
      name: validatedData.name, 
      userId: validatedData.userId 
    });
    if (existingCompany) {
      res.status(409).json({
        success: false,
        message: 'Company with this name already exists for this user'
      });
      return;
    }

    // Create new company
    const company = new Company(validatedData);
    const savedCompany = await company.save();
    await savedCompany.populate('userId', 'name email');

    logger.info(`Company created successfully: ${savedCompany.name} for user ${validatedData.userId}`);

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

export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search, userId } = getCompaniesQuerySchema.parse(req.query);

    // Build search query
    const searchQuery: any = {};
    
    if (userId) {
      searchQuery.userId = userId;
    }

    if (search) {
      searchQuery.name = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get companies with pagination
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

    logger.info(`Retrieved ${companies.length} companies (page ${page}/${totalPages})`);

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

export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
      return;
    }

    // Find company by ID
    const company = await Company.findById(id).populate('userId', 'name email');
    
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    logger.info(`Retrieved company: ${company.name}`);

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

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    // Find and update company
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!updatedCompany) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    logger.info(`Company updated successfully: ${updatedCompany.name}`);

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

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
      return;
    }

    // Find and delete company
    const deletedCompany = await Company.findByIdAndDelete(id);

    if (!deletedCompany) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    logger.info(`Company deleted successfully: ${deletedCompany.name}`);

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