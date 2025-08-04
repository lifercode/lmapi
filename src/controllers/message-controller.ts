import { Request, Response } from 'express';
import { z } from 'zod';
import { Message, IMessage } from '@/models/Message';
import { Thread, ThreadOrigin } from '@/models/Thread';
import { Contact } from '@/models/Contact';
import { Agent } from '@/models/Agent';
import { logger } from '@/server';

// Validation schema for creating message
const createMessageSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  role: z.enum(['assistant', 'user'], {
    errorMap: () => ({ message: 'Role must be either assistant or user' })
  }),
  content: z.string()
    .min(1, 'Content must be at least 1 character long')
    .max(10000, 'Content cannot exceed 10000 characters')
    .trim()
});

// Validation schema for query parameters
const getMessagesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  threadId: z.string().optional(),
  role: z.enum(['assistant', 'user']).optional()
});

// Validation schema for message ID
const messageIdSchema = z.object({
  id: z.string().min(1, 'Message ID is required')
});

// Validation schema for sending message to agent
const sendMessageToAgentSchema = z.object({
  content: z.string()
    .min(1, 'Content must be at least 1 character long')
    .max(10000, 'Content cannot exceed 10000 characters')
    .trim(),
  email: z.string().email('Invalid email format').optional()
    .nullable(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  origin: z.enum(['whatsapp', 'instagram', 'website', 'tiktok', 'messenger'], {
    errorMap: () => ({ message: 'Origin must be one of: whatsapp, instagram, website, tiktok, messenger' })
  }),
  agentId: z.string().min(1, 'Agent ID is required')
}).refine((data) => {
  if (data.origin === 'whatsapp') {
    return !!data.phone;
  }
  return !!data.email;
}, {
  message: "Phone is required for WhatsApp origin, email is required for other origins"
});

export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createMessageSchema.parse(req.body);
    
    // Check if thread exists
    const thread = await Thread.findById(validatedData.threadId);
    if (!thread) {
      res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
      return;
    }

    // Create new message from user
    const message = new Message(validatedData);
    const savedMessage = await message.save();



    // Create new message from assistant
    const messageAssistant = new Message({
      ...validatedData,
      role: 'assistant',
      content: 'Olá, como posso ajudar você hoje?'
    });
    const savedMessageAssistant = await messageAssistant.save();


    logger.info(`Message created successfully for thread ${savedMessage.threadId} with role ${savedMessage.role}`);

    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: {
        message: {
          id: savedMessageAssistant._id,
          threadId: savedMessageAssistant.threadId,
          role: savedMessageAssistant.role,
          content: savedMessageAssistant.content,
          createdAt: savedMessageAssistant.createdAt,
          updatedAt: savedMessageAssistant.updatedAt
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
        message: 'Invalid thread ID format'
      });
      return;
    }

    logger.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { page, limit, search, threadId, role } = getMessagesQuerySchema.parse(req.query);

    // Build search query
    const searchQuery: any = {};
    
    if (threadId) {
      searchQuery.threadId = threadId;
    }
    
    if (role) {
      searchQuery.role = role;
    }
    
    if (search) {
      searchQuery.content = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get messages with pagination and populate thread info
    const [messages, totalMessages] = await Promise.all([
      Message.find(searchQuery)
        .populate('threadId', 'name contactId agentId')
        .select('_id threadId role content createdAt updatedAt')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalMessages / limit);

    logger.info(`Retrieved ${messages.length} messages (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: messages.map(message => ({
          id: message._id,
          threadId: message.threadId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalMessages,
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

    logger.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getMessageById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate message ID
    const { id } = messageIdSchema.parse(req.params);

    // Find message by ID and populate thread info
    const message = await Message.findById(id)
      .populate('threadId', 'name contactId agentId')
      .select('_id threadId role content createdAt updatedAt');
    
    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
      return;
    }

    logger.info(`Message retrieved successfully: ${message._id}`);

    res.status(200).json({
      success: true,
      message: 'Message retrieved successfully',
      data: {
        message: {
          id: message._id,
          threadId: message.threadId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid message ID',
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
        message: 'Invalid message ID format'
      });
      return;
    }

    logger.error('Error getting message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 

export const sendMessageToAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('=== Starting sendMessageToAgent ===');
    logger.info('Request body:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const validatedData = sendMessageToAgentSchema.parse(req.body);
    logger.info('Data validated successfully:', JSON.stringify(validatedData, null, 2));
    
    // Check if agent exists
    logger.info(`Looking for agent with ID: ${validatedData.agentId}`);
    const agent = await Agent.findById(validatedData.agentId);
    if (!agent) {
      logger.warn(`Agent not found with ID: ${validatedData.agentId}`);
      res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
      return;
    }
    logger.info(`Agent found: ${agent._id} - ${agent.name}`);

    // Find or create contact
    let contact;
    const contactQuery: any = {};
    
    if (validatedData.origin === 'whatsapp') {
      contactQuery.phone = validatedData.phone;
      logger.info(`Searching contact by phone: ${validatedData.phone}`);
    } else {
      contactQuery.email = validatedData.email;
      logger.info(`Searching contact by email: ${validatedData.email}`);
    }

    logger.info('Contact query:', JSON.stringify(contactQuery, null, 2));
    contact = await Contact.findOne(contactQuery);
    
    if (!contact) {
      logger.info('Contact not found, creating new contact...');
      // Create new contact
      const contactData: any = {};
      if (validatedData.origin === 'whatsapp') {
        contactData.name = validatedData.phone;
        contactData.phone = validatedData.phone;
        contactData.email = null;
      } else {
        contactData.name = validatedData.email?.split('@')[0] || '-';
        contactData.email = validatedData.email;
        contactData.phone = null;
      }
      
      console.log('Contact data to create:', JSON.stringify(contactData, null, 2));
      contact = new Contact(contactData);
      await contact.save();
      logger.info(`New contact created successfully: ${contact._id} - ${contact.name}`);
    } else {
      logger.info(`Existing contact found: ${contact._id} - ${contact.name}`);
    }

    // Check for existing thread in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    logger.info(`Looking for existing threads since: ${twentyFourHoursAgo.toISOString()}`);
    
    const threadQuery = {
      contactId: contact._id,
      agentId: validatedData.agentId,
      origin: validatedData.origin,
      createdAt: { $gte: twentyFourHoursAgo }
    };
    logger.info('Thread search query:', JSON.stringify(threadQuery, null, 2));
    
    let thread = await Thread.findOne(threadQuery).sort({ createdAt: -1 });

    let isNewThread = false;

    if (!thread) {
      logger.info('No existing thread found, creating new thread...');
      // Create new thread
      const threadName = validatedData.content;
      
      const threadData = {
        contactId: contact._id,
        agentId: validatedData.agentId,
        name: threadName,
        origin: validatedData.origin
      };
      logger.info('Thread data to create:', JSON.stringify(threadData, null, 2));
      
      thread = new Thread(threadData);
      await thread.save();
      isNewThread = true;
      logger.info(`New thread created successfully: ${thread._id} - ${thread.name}`);
    } else {
      logger.info(`Using existing thread: ${thread._id} - ${thread.name} (created at: ${thread.createdAt})`);
    }

    // Create new message from user
    logger.info('Creating user message...');
    const userMessageData = {
      threadId: thread._id,
      role: 'user',
      content: validatedData.content
    };
    logger.info('User message data:', JSON.stringify(userMessageData, null, 2));
    
    const userMessage = new Message(userMessageData);
    const savedUserMessage = await userMessage.save();
    logger.info(`User message created successfully: ${savedUserMessage._id}`);

    // Create automatic response from assistant
    logger.info('Creating assistant message...');
    const assistantMessageData = {
      threadId: thread._id,
      role: 'assistant',
      content: 'Olá! Recebi sua mensagem e em breve nossa equipe entrará em contato com você.'
    };
    logger.info('Assistant message data:', JSON.stringify(assistantMessageData, null, 2));
    
    const assistantMessage = new Message(assistantMessageData);
    const savedAssistantMessage = await assistantMessage.save();
    logger.info(`Assistant message created successfully: ${savedAssistantMessage._id}`);

    logger.info(`=== sendMessageToAgent completed successfully ===`);
    logger.info(`Summary: Thread: ${thread._id}, Contact: ${contact._id}, UserMsg: ${savedUserMessage._id}, AssistantMsg: ${savedAssistantMessage._id}`);

    res.status(201).json({
      success: true,
      message: 'Message sent to agent successfully',
      data: {
        userMessage: {
          id: savedUserMessage._id,
          threadId: savedUserMessage.threadId,
          role: savedUserMessage.role,
          content: savedUserMessage.content,
          createdAt: savedUserMessage.createdAt
        },
        assistantMessage: {
          id: savedAssistantMessage._id,
          threadId: savedAssistantMessage.threadId,
          role: savedAssistantMessage.role,
          content: savedAssistantMessage.content,
          createdAt: savedAssistantMessage.createdAt
        },
        thread: {
          id: thread._id,
          name: thread.name,
          origin: thread.origin,
          isNew: isNewThread
        },
        contact: {
          id: contact._id,
          email: contact.email,
          phone: contact.phone
        }
      }
    });
  } catch (error) {
    logger.error('=== Error in sendMessageToAgent ===');
    console.error('Error details:', error);
    logger.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
    
    if (error instanceof z.ZodError) {
      logger.error('Zod validation errors:', JSON.stringify(error.errors, null, 2));
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
      logger.error('MongoDB CastError (Invalid ObjectId):', error.message);
      res.status(400).json({
        success: false,
        message: 'Invalid agent ID format'
      });
      return;
    }

    logger.error('Unexpected error in sendMessageToAgent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 