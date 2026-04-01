# Agent Authentication Guide

## Overview

Each autonomous agent (Growth, Voice, Matching, Retention) authenticates using a unique API key. Keys are stored in the `agent_keys` table and verified on every request.

## Setting Up Agent Keys

### 1. Generate Keys

Agent keys should be generated once and stored securely in environment variables.

**Generate a key** (command-line):

```bash
# Generate a random 32-character key
openssl rand -hex 16
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 2. Store in Environment

Create `.env` file in backend root:

```env
GROWTH_AGENT_KEY=growth_agent_key_abc123def456ghi789
VOICE_AGENT_KEY=voice_agent_key_xyz789uvw456rst123
MATCHING_AGENT_KEY=matching_agent_key_m1n2o3p4q5r6s7t8u9
RETENTION_AGENT_KEY=retention_agent_key_a9b8c7d6e5f4g3h2i1
```

### 3. Initialize Keys in Database

Run this script on first deployment:

```bash
node scripts/init-agent-keys.js
```

**Script**: `scripts/init-agent-keys.js`

```javascript
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const agents = [
  {
    agent_name: 'growth-agent',
    api_key: process.env.GROWTH_AGENT_KEY
  },
  {
    agent_name: 'voice-agent',
    api_key: process.env.VOICE_AGENT_KEY
  },
  {
    agent_name: 'matching-agent',
    api_key: process.env.MATCHING_AGENT_KEY
  },
  {
    agent_name: 'retention-agent',
    api_key: process.env.RETENTION_AGENT_KEY
  }
];

async function initAgentKeys() {
  try {
    for (const agent of agents) {
      const query = `
        INSERT INTO agent_keys (id, agent_name, api_key, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (agent_name) DO UPDATE SET api_key = $3
      `;

      await db.query(query, [uuidv4(), agent.agent_name, agent.api_key, 'active']);
      console.log(`✓ Initialized ${agent.agent_name}`);
    }

    console.log('✓ All agent keys initialized');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing agent keys:', error);
    process.exit(1);
  }
}

initAgentKeys();
```

## Authentication Flow

### Request Header Format

All agent requests require the `x-agent-key` header:

```
x-agent-key: <agent_api_key>
```

### Example Request

```bash
curl -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness" \
  -H "x-agent-key: growth_agent_key_abc123def456ghi789" \
  -H "Content-Type: application/json"
```

### Middleware Process

1. Extract `x-agent-key` from headers
2. Query `agent_keys` table
3. Verify key exists and status = 'active'
4. Update `last_used` timestamp
5. Attach agent info to request object
6. Generate unique `requestId` for audit trail
7. Proceed to route handler

**Code** (`middleware/agentAuth.js`):

```javascript
const authenticateAgent = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-agent-key'];

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Missing API key in x-agent-key header',
        timestamp: new Date().toISOString()
      });
    }

    // Query agent_keys
    const result = await db.query(
      'SELECT * FROM agent_keys WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or revoked API key'
      });
    }

    const agent = result.rows[0];

    // Update last_used
    await db.query(
      'UPDATE agent_keys SET last_used = NOW() WHERE id = $1',
      [agent.id]
    );

    // Attach to request
    req.agent = {
      name: agent.agent_name,
      id: agent.id
    };

    req.requestId = `req_${uuidv4().substring(0, 8)}`;

    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Auth check failed' });
  }
};
```

## Logging & Audit Trail

Every agent action is logged to `agent_logs` table with:

- Agent name
- User ID (if applicable)
- Action performed
- Action type (email, sms, match, query, etc.)
- Result (success/failed/partial)
- Request ID (for tracing)
- Timestamp
- Details (JSON)
- Error message (if failed)

### Query Audit Trail

```sql
-- Get all actions by growth-agent in last 24 hours
SELECT * FROM agent_logs
WHERE agent_name = 'growth-agent'
AND created_at >= NOW() - interval '1 day'
ORDER BY created_at DESC;

-- Get actions for a specific user
SELECT * FROM agent_logs
WHERE user_id = 'user_12345'
ORDER BY created_at DESC;

-- Get failed actions
SELECT * FROM agent_logs
WHERE result = 'failed'
ORDER BY created_at DESC;
```

## Key Rotation

### Revoking Keys

To deactivate a key without deleting it:

```sql
UPDATE agent_keys
SET status = 'revoked'
WHERE agent_name = 'growth-agent';
```

### Generating New Key

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 16)

# 2. Update environment
echo "GROWTH_AGENT_KEY=$NEW_KEY" >> .env

# 3. Update database
psql -d video_manager -c "UPDATE agent_keys SET api_key = '$NEW_KEY', status = 'active' WHERE agent_name = 'growth-agent';"

# 4. Restart agents
docker restart ennie-growth-agent
```

## Security Best Practices

### ✅ DO

- Store keys in environment variables, not in code
- Rotate keys quarterly (recommended)
- Use separate key per agent type
- Monitor `agent_logs` for suspicious activity
- Revoke keys immediately if compromised
- Use HTTPS in production

### ❌ DON'T

- Commit keys to git/version control
- Share keys via email/Slack
- Use same key for multiple agents
- Expose keys in logs/error messages
- Hardcode keys in config files

## Monitoring

### Key Activity Dashboard

```bash
# View agent key stats
curl -X GET "http://localhost:5000/api/dashboard/agents" \
  -H "x-charlie-pin: <pin>"
```

Response shows:
- Last used timestamp
- Total actions
- Actions in last hour
- Success/failure rates
- Most recent action

### Alert on Suspicious Activity

Create alerting rules for:

- Multiple failed auth attempts from same IP
- Agent inactive for >24 hours
- Unusually high action volume (rate spike)
- Actions on unapproved content
- Repeated failures on same endpoint

## Troubleshooting

### "Missing API key in x-agent-key header"

**Cause**: Header not sent or misspelled  
**Fix**: Verify header format: `x-agent-key: <key>`

### "Invalid or revoked API key"

**Possible causes**:
- Key doesn't exist in database
- Key status = 'revoked'
- Typo in key

**Fix**: Check database:

```sql
SELECT * FROM agent_keys WHERE agent_name = 'growth-agent';
```

### "Unauthorized - Agent not found"

**Cause**: Agent name not matching database  
**Fix**: Verify agent_name in agent_keys table

### Key Not Updating in Production

**Cause**: Old credentials still cached  
**Fix**: Restart agent process to pick up new .env

```bash
docker restart ennie-growth-agent
# or
systemctl restart ennie-growth-agent
```

## Testing Authentication

### Test with cURL

```bash
# Valid key
curl -i -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness" \
  -H "x-agent-key: growth_agent_key_abc123def456ghi789"

# Invalid key
curl -i -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness" \
  -H "x-agent-key: invalid_key_12345"
# Expected: 401 Unauthorized
```

### Test with Node.js

```javascript
const axios = require('axios');

async function testAuth() {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/agents/content',
      {
        params: { funnel: 'patient', stage: 'awareness' },
        headers: {
          'x-agent-key': 'growth_agent_key_abc123def456ghi789'
        }
      }
    );
    console.log('✓ Auth successful:', response.data);
  } catch (error) {
    console.error('✗ Auth failed:', error.response?.data);
  }
}

testAuth();
```

## Agent Key Reference

### Growth Agent

- **Purpose**: User acquisition, funnel progression, email campaigns
- **Key**: `GROWTH_AGENT_KEY`
- **Typical Actions**: get_content, send_email, update_user_state, query_healers

### Voice Agent

- **Purpose**: Video content, transcripts, audio/voice synthesis
- **Key**: `VOICE_AGENT_KEY`
- **Typical Actions**: get_transcripts, get_content, query_assets

### Matching Agent

- **Purpose**: Patient-healer matching, availability management
- **Key**: `MATCHING_AGENT_KEY`
- **Typical Actions**: match_patient_healer, query_healers, update_healer_availability

### Retention Agent

- **Purpose**: Churn detection, re-engagement, lifecycle marketing
- **Key**: `RETENTION_AGENT_KEY`
- **Typical Actions**: get_user_state, send_email, send_sms, get_funnel_stats

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-01
