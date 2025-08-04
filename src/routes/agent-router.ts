import { Router } from 'express';
import { 
  createAgent, 
  getAgents, 
  getAgentById, 
  updateAgent, 
  deleteAgent 
} from '@/controllers/agent-controller';
import { authenticateToken } from '@/middleware/auth';

const agentRouter = Router();

/**
 * @route POST /agents
 * @description Create a new agent (company must be owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @body {name: string, description: string, companyId: string}
 * @returns {success: boolean, message: string, data: {id, name, description, companyId, createdAt}}
 */
agentRouter.post('/', authenticateToken, createAgent);

/**
 * @route GET /agents
 * @description Get all agents from companies owned by authenticated user with pagination and search
 * @headers {Authorization: "Bearer TOKEN"}
 * @query {page?: number, limit?: number, search?: string, companyId?: string}
 * @returns {success: boolean, message: string, data: {agents: [], pagination: {}}}
 */
agentRouter.get('/', authenticateToken, getAgents);

/**
 * @route GET /agents/:id
 * @description Get an agent by ID (only if from company owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Agent ID
 * @returns {success: boolean, message: string, data: {id, name, description, companyId, createdAt, updatedAt}}
 */
agentRouter.get('/:id', authenticateToken, getAgentById);

/**
 * @route PUT /agents/:id
 * @description Update an agent by ID (only if from company owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Agent ID
 * @body {name?: string, description?: string, companyId?: string}
 * @returns {success: boolean, message: string, data: {id, name, description, companyId, createdAt, updatedAt}}
 */
agentRouter.put('/:id', authenticateToken, updateAgent);

/**
 * @route DELETE /agents/:id
 * @description Delete an agent by ID (only if from company owned by authenticated user)
 * @headers {Authorization: "Bearer TOKEN"}
 * @param {string} id - Agent ID
 * @returns {success: boolean, message: string, data: {id, name}}
 */
agentRouter.delete('/:id', authenticateToken, deleteAgent);

export { agentRouter }; 