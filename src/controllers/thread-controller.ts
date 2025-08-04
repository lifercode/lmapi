import { Request, Response } from 'express';
import { z } from 'zod';
import { Thread } from '@/models/Thread';
import { Contact } from '@/models/Contact';
import { Agent } from '@/models/Agent';
import { Message } from '@/models/Message';
import { logger } from '@/server';

// Validation schema for creating thread
const createThreadSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  name: z.string()
    .min(2, 'Thread name must be at least 2 characters long')
    .max(200, 'Thread name cannot exceed 200 characters')
    .trim(),
  origin: z.enum(['whatsapp', 'instagram', 'website', 'tiktok', 'messenger'], {
    errorMap: () => ({ message: 'Origin must be one of: whatsapp, instagram, website, tiktok, messenger' })
  })
});

// Validation schema for query parameters
const getThreadsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  contactId: z.string().optional(),
  agentId: z.string().optional(),
  origin: z.enum(['whatsapp', 'instagram', 'website', 'tiktok', 'messenger']).optional()
});

// Validation schema for thread ID
const threadIdSchema = z.object({
  id: z.string().min(1, 'Thread ID is required')
});

export const createThread = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createThreadSchema.parse(req.body);
    
    // Check if contact exists
    const contact = await Contact.findById(validatedData.contactId);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
      return;
    }

    // Check if agent exists
    const agent = await Agent.findById(validatedData.agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
      return;
    }

    // Check if thread with same name already exists for this contact and agent
    // const existingThread = await Thread.findOne({ 
    //   contactId: validatedData.contactId, 
    //   agentId: validatedData.agentId,
    //   name: validatedData.name 
    // });
    // if (existingThread) {
    //   res.status(409).json({
    //     success: false,
    //     message: 'Thread with this name already exists for this contact and agent'
    //   });
    //   return;
    // }

    // Create new thread
    const thread = new Thread(validatedData);
    const savedThread = await thread.save();

    logger.info(`Thread created successfully: ${savedThread.name} for contact ${savedThread.contactId} and agent ${savedThread.agentId} from origin ${savedThread.origin}`);

    res.status(201).json({
      success: true,
      message: 'Thread created successfully',
      data: {
        thread: {
          id: savedThread._id,
          contactId: savedThread.contactId,
          agentId: savedThread.agentId,
          name: savedThread.name,
          origin: savedThread.origin,
          createdAt: savedThread.createdAt,
          updatedAt: savedThread.updatedAt
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

    // Handle invalid ObjectId error
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid contact ID or agent ID format'
      });
      return;
    }

    logger.error('Error creating thread:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getThreads = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search, contactId, agentId, origin } = getThreadsQuerySchema.parse(req.query);

    // Build search query
    const searchQuery: any = {};
    
    if (contactId) {
      searchQuery.contactId = contactId;
    }
    
    if (agentId) {
      searchQuery.agentId = agentId;
    }
    
    if (origin) {
      searchQuery.origin = origin;
    }
    
    if (search) {
      searchQuery.name = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get threads with pagination and populate contact and agent info
    const [threads, totalThreads] = await Promise.all([
      Thread.find(searchQuery)
        .populate('contactId', 'name email phone')
        .populate('agentId', 'name description')
        .select('_id contactId agentId name origin createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Thread.countDocuments(searchQuery)
    ]);

    // Get the last message for each thread (first 100 characters)
    const threadIds = threads.map((thread: any) => thread._id);
    const lastMessages = await Message.aggregate([
      {
        $match: {
          threadId: { $in: threadIds }
        }
      },
      {
        $sort: { threadId: 1, createdAt: -1 }
      },
      {
        $group: {
          _id: '$threadId',
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // Create a map for quick lookup of last messages
    const lastMessageMap = new Map();
    lastMessages.forEach((item: any) => {
      const content = item.lastMessage.content || '';
      lastMessageMap.set(item._id.toString(), {
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        role: item.lastMessage.role,
        createdAt: item.lastMessage.createdAt
      });
    });

    const totalPages = Math.ceil(totalThreads / limit);

    logger.info(`Retrieved ${threads.length} threads (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Threads retrieved successfully',
      data: {
        threads: threads.map((thread: any) => {
          const lastMessage = lastMessageMap.get(thread._id.toString());
          return {
            id: thread._id,
            contact: {
              id: thread.contactId._id,
              name: thread.contactId.name,
              email: thread.contactId.email,
              phone: thread.contactId.phone
            },
            agent: {
              id: thread.agentId._id,
              name: thread.agentId.name,
              description: thread.agentId?.description
            },
            name: thread.name,
            origin: thread.origin,
            lastMessage: lastMessage || null,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt
          };
        }),
        pagination: {
          currentPage: page,
          totalPages,
          totalThreads,
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

    logger.error('Error getting threads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getThreadById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate thread ID
    const { id } = threadIdSchema.parse(req.params);

    // Find thread by ID and populate contact and agent info
    const thread = await Thread.findById(id)
      .populate('contactId', 'name email phone')
      .populate('agentId', 'name description')
      .select('_id contactId agentId name origin createdAt updatedAt');
    
    if (!thread) {
      res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
      return;
    }

    logger.info(`Thread retrieved successfully: ${thread.name}`);

    res.status(200).json({
      success: true,
      message: 'Thread retrieved successfully',
      data: {
        thread: {
          id: thread._id,
          contactId: thread.contactId,
          agentId: thread.agentId,
          name: thread.name,
          origin: thread.origin,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid thread ID',
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
        message: 'Invalid thread ID format'
      });
      return;
    }

    logger.error('Error getting thread:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 