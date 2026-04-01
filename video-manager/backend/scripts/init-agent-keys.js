#!/usr/bin/env node

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const agents = [
  {
    agent_name: 'growth-agent',
    description: 'Drives user acquisition and funnel progression'
  },
  {
    agent_name: 'voice-agent',
    description: 'Manages video content, transcripts, voice synthesis'
  },
  {
    agent_name: 'matching-agent',
    description: 'Patient-healer matching and availability'
  },
  {
    agent_name: 'retention-agent',
    description: 'Churn detection, re-engagement, lifecycle marketing'
  }
];

async function generateAgentKeys() {
  try {
    console.log('🚀 Initializing Agent Orchestration API Keys\n');

    await db.initialize();

    const keys = {};

    for (const agent of agents) {
      // Generate key from env or create new one
      const envKey = process.env[`${agent.agent_name.toUpperCase().replace('-', '_')}_KEY`];
      const apiKey = envKey || `${agent.agent_name}_${crypto.randomBytes(16).toString('hex')}`;

      try {
        const result = await db.query(
          `INSERT INTO agent_keys (id, agent_name, api_key, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (agent_name) DO UPDATE SET api_key = $3, status = 'active'
           RETURNING *`,
          [uuidv4(), agent.agent_name, apiKey, 'active']
        );

        keys[agent.agent_name] = {
          agent_name: agent.agent_name,
          api_key: apiKey,
          description: agent.description,
          created_at: result.rows[0].created_at
        };

        console.log(`✅ ${agent.agent_name}`);
        console.log(`   API Key: ${apiKey}`);
        console.log(`   ${agent.description}\n`);
      } catch (error) {
        console.error(`❌ Error initializing ${agent.agent_name}:`, error.message);
      }
    }

    console.log('\n📝 Add these to your .env file:\n');
    console.log('# Agent API Keys');
    Object.entries(keys).forEach(([name, data]) => {
      const envVar = `${name.toUpperCase().replace('-', '_')}_KEY`;
      console.log(`${envVar}=${data.api_key}`);
    });

    console.log('\n✨ Agent keys initialized successfully!');
    console.log('📌 Store the .env file securely and never commit to version control.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing agent keys:', error);
    process.exit(1);
  }
}

generateAgentKeys();
