const db = require('../config/database');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const logger = pino();

// Agent authentication middleware
const authenticateAgent = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-agent-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Missing API key in x-agent-key header',
        timestamp: new Date().toISOString()
      });
    }

    // Query agent_keys table
    const result = await db.query(
      'SELECT * FROM agent_keys WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );

    if (result.rows.length === 0) {
      logger.warn(`Unauthorized agent access attempt with key: ${apiKey.substring(0, 8)}...`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or revoked API key',
        timestamp: new Date().toISOString()
      });
    }

    const agent = result.rows[0];

    // Update last_used timestamp
    await db.query(
      'UPDATE agent_keys SET last_used = NOW() WHERE id = $1',
      [agent.id]
    );

    // Attach agent info to request
    req.agent = {
      name: agent.agent_name,
      id: agent.id,
      key: apiKey
    };

    // Generate request ID for audit trail
    req.requestId = `req_${uuidv4().substring(0, 8)}`;

    next();
  } catch (error) {
    logger.error('Agent authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication check failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Log agent action to audit trail
const logAgentAction = async (agentName, userId, action, actionType, result = 'success', details = {}, errorMessage = null, requestId = null) => {
  try {
    await db.query(
      `INSERT INTO agent_logs (agent_name, user_id, action, action_type, result, request_id, details, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        agentName,
        userId || null,
        action,
        actionType,
        result,
        requestId,
        JSON.stringify(details),
        errorMessage
      ]
    );
  } catch (error) {
    logger.error('Failed to log agent action:', error);
  }
};

// Format standard agent response
const formatAgentResponse = (status, data, requestId, agentName, action, errorMessage = null) => {
  const response = {
    status,
    data,
    requestId,
    timestamp: new Date().toISOString(),
    agentName,
    action
  };

  if (errorMessage) {
    response.error = errorMessage;
  }

  return response;
};

module.exports = {
  authenticateAgent,
  logAgentAction,
  formatAgentResponse
};
