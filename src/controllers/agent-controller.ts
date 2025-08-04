import { Request, Response } from 'express';
import { z } from 'zod';
import { Agent } from '@/models/Agent';
import { Company } from '@/models/Company';
import { logger } from '@/server';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '@/middleware/auth';

// Validation schema for creating agent
const createAgentSchema = z.object({
  name: z.string()
    .min(2, 'Agent name must be at least 2 characters long')
    .max(100, 'Agent name cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .min(10, 'Agent description must be at least 10 characters long')
    .max(500, 'Agent description cannot exceed 500 characters')
    .trim(),
  companyId: z.string()
    .refine(val => Types.ObjectId.isValid(val), 'Invalid company ID format')
});

// Validation schema for updating agent
const updateAgentSchema = createAgentSchema.partial();

// Validation schema for query parameters
const getAgentsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  companyId: z.string().optional()
    .refine(val => !val || Types.ObjectId.isValid(val), 'Invalid company ID format')
});

export const createAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createAgentSchema.parse(req.body);
    
    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Verify that the company belongs to the authenticated user
    const company = await Company.findOne({ 
      _id: validatedData.companyId, 
      userId: userId 
    });
    if (!company) {
      res.status(403).json({
        success: false,
        message: 'Company not found or access denied'
      });
      return;
    }

    // Check if agent with same name already exists for this company
    const existingAgent = await Agent.findOne({ 
      name: validatedData.name, 
      companyId: validatedData.companyId 
    });
    if (existingAgent) {
      res.status(409).json({
        success: false,
        message: 'Agent with this name already exists in this company'
      });
      return;
    }

    // Create new agent
    const agent = new Agent(validatedData);
    const savedAgent = await agent.save();
    await savedAgent.populate('companyId', 'name brandColor brandLogoUrl');

    logger.info(`Agent created successfully: ${savedAgent.name} for company ${company.name}`);

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        id: savedAgent._id,
        name: savedAgent.name,
        description: savedAgent.description,
        companyId: savedAgent.companyId,
        createdAt: savedAgent.createdAt
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

    logger.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAgents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search, companyId } = getAgentsQuerySchema.parse(req.query);

    // Get user ID from JWT token
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
      return;
    }

    // Build search query for agents
    const searchQuery: any = { companyId: companyId };

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get agents with pagination
    const [agents, totalAgents] = await Promise.all([
      Agent.find(searchQuery)
        .populate('companyId', 'name brandColor brandLogoUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Agent.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalAgents / limit);

    logger.info(`Retrieved ${agents.length} agents for user ${userId} (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Agents retrieved successfully',
      data: {
        agents: agents.map(agent => ({
          id: agent._id,
          name: agent.name,
          description: agent.description,
          companyId: agent.companyId,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalAgents,
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

    logger.error('Error getting agents:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAgentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Invalid agent ID format'
      });
      return;
    }

    // Get user's company IDs
    const userCompanies = await Company.find({ userId: userId }).select('_id').lean();
    const userCompanyIds = userCompanies.map(company => company._id);

    // Find agent that belongs to user's companies
    const agent = await Agent.findOne({ 
      _id: id, 
      companyId: { $in: userCompanyIds }
    }).populate('companyId', 'name brandColor brandLogoUrl');
    
    if (!agent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found or access denied'
      });
      return;
    }

    logger.info(`Retrieved agent: ${agent.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Agent retrieved successfully',
      data: {
        id: agent._id,
        name: agent.name,
        description: agent.description,
        companyId: agent.companyId,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error getting agent by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Invalid agent ID format'
      });
      return;
    }

    // Validate request body
    const validatedData = updateAgentSchema.parse(req.body);

    // If companyId is being updated, verify the new company belongs to the user
    if (validatedData.companyId) {
      const company = await Company.findOne({ 
        _id: validatedData.companyId, 
        userId: userId 
      });
      if (!company) {
        res.status(403).json({
          success: false,
          message: 'Company not found or access denied'
        });
        return;
      }
    }

    // Get user's company IDs
    const userCompanies = await Company.find({ userId: userId }).select('_id').lean();
    const userCompanyIds = userCompanies.map(company => company._id);

    // Find and update agent only if it belongs to user's companies
    const updatedAgent = await Agent.findOneAndUpdate(
      { _id: id, companyId: { $in: userCompanyIds } },
      validatedData,
      { new: true, runValidators: true }
    ).populate('companyId', 'name brandColor brandLogoUrl');

    if (!updatedAgent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found or access denied'
      });
      return;
    }

    logger.info(`Agent updated successfully: ${updatedAgent.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      data: {
        id: updatedAgent._id,
        name: updatedAgent.name,
        description: updatedAgent.description,
        companyId: updatedAgent.companyId,
        createdAt: updatedAgent.createdAt,
        updatedAt: updatedAgent.updatedAt
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

    logger.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Invalid agent ID format'
      });
      return;
    }

    // Get user's company IDs
    const userCompanies = await Company.find({ userId: userId }).select('_id').lean();
    const userCompanyIds = userCompanies.map(company => company._id);

    // Find and delete agent only if it belongs to user's companies
    const deletedAgent = await Agent.findOneAndDelete({ 
      _id: id, 
      companyId: { $in: userCompanyIds }
    });

    if (!deletedAgent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found or access denied'
      });
      return;
    }

    logger.info(`Agent deleted successfully: ${deletedAgent.name} for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
      data: {
        id: deletedAgent._id,
        name: deletedAgent.name
      }
    });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 