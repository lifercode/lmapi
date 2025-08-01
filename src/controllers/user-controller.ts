import { Request, Response } from 'express';
import { z } from 'zod';
import { User, IUser } from '@/models/User';
import { logger } from '@/server';
import { generateToken } from '@/utils/jwt';
import { AuthenticatedRequest } from '@/middleware/auth';

// Validation schema for creating user
const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
  email: z.string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters')
});

// Validation schema for login
const loginSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
});

// Validation schema for query parameters
const getUsersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional()
});

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create new user
    const user = new User(validatedData);
    const savedUser = await user.save();

    logger.info(`User created successfully: ${savedUser.email}`);

    // Generate JWT token
    const token = generateToken({
      userId: (savedUser._id as any).toString(),
      email: savedUser.email
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          createdAt: savedUser.createdAt
        },
        token
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

    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search } = getUsersQuerySchema.parse(req.query);

    // Build search query
    const searchQuery: any = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(searchQuery)
        .select('_id name email createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    logger.info(`Retrieved ${users.length} users (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
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

    logger.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Find user with password field included
    const user = await User.findOne({ email: validatedData.email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email
    });

    logger.info(`User logged in successfully: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        token
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

    logger.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const user = await User.findById(userId).select('_id name email createdAt updatedAt');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 