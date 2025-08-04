import { Request, Response } from 'express';
import { z } from 'zod';
import { Contact, IContact } from '@/models/Contact';
import { logger } from '@/server';

// Validation schema for creating contact
const createContactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  email: z.string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number')
    .trim()
    .optional()
    .nullable()
});

// Validation schema for query parameters
const getContactsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional()
});

// Validation schema for contact ID
const contactIdSchema = z.object({
  id: z.string().min(1, 'Contact ID is required')
});

export const createContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createContactSchema.parse(req.body);
    
    // Check if contact with email already exists (only if email is provided)
    if (validatedData.email) {
      const existingContactByEmail = await Contact.findOne({ email: validatedData.email });
      if (existingContactByEmail) {
        res.status(409).json({
          success: false,
          message: 'Contact with this email already exists'
        });
        return;
      }
    }

    // Check if contact with phone already exists (only if phone is provided)
    if (validatedData.phone) {
      const existingContactByPhone = await Contact.findOne({ phone: validatedData.phone });
      if (existingContactByPhone) {
        res.status(409).json({
          success: false,
          message: 'Contact with this phone already exists'
        });
        return;
      }
    }

    // Create new contact
    const contact = new Contact(validatedData);
    const savedContact = await contact.save();

    logger.info(`Contact created successfully: ${savedContact.email}`);

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: {
        contact: {
          id: savedContact._id,
          name: savedContact.name || null,
          email: savedContact.email || null,
          phone: savedContact.phone || null,
          createdAt: savedContact.createdAt,
          updatedAt: savedContact.updatedAt
        }
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

    logger.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search } = getContactsQuerySchema.parse(req.query);

    // Build search query
    const searchQuery: any = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get contacts with pagination
    const [contacts, totalContacts] = await Promise.all([
      Contact.find(searchQuery)
        .select('_id name email phone createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalContacts / limit);

    logger.info(`Retrieved ${contacts.length} contacts (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: {
        contacts: contacts.map(contact => ({
          id: contact._id,
          name: contact.name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalContacts,
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

    logger.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getContactById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate contact ID
    const { id } = contactIdSchema.parse(req.params);

    // Find contact by ID
    const contact = await Contact.findById(id).select('_id name email phone createdAt updatedAt');
    
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
      return;
    }

    logger.info(`Contact retrieved successfully: ${contact.email}`);

    res.status(200).json({
      success: true,
      message: 'Contact retrieved successfully',
      data: {
        contact: {
          id: contact._id,
          name: contact.name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid contact ID',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    // Handle invalid ObjectId error
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid contact ID format'
      });
      return;
    }

    logger.error('Error getting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 