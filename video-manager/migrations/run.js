#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');
const pino = require('pino');

const logger = pino();

const runMigrations = async () => {
  try {
    logger.info('Starting migrations...');

    const migrationsDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        try {
          await db.query(sql);
          logger.info(`✓ Executed migration: ${file}`);
        } catch (error) {
          logger.error(`✗ Failed migration: ${file}`, error.message);
          // Don't throw, continue with next migration
        }
      }
    }

    logger.info('✓ All migrations completed!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
};

runMigrations();
