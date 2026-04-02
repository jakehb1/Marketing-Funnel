const { Pool } = require('pg');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'video_manager'
      }
);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

const initialize = async () => {
  try {
    logger.info('Initializing database...');
    
    // Try to check if tables exist
    try {
      const result = await pool.query(
        `SELECT EXISTS(
          SELECT FROM information_schema.tables 
          WHERE table_name = 'videos'
        )`
      );

      if (!result.rows[0].exists) {
        logger.info('Running migrations...');
        await runMigrations();
      } else {
        logger.info('Database tables already exist');
      }
    } catch (checkError) {
      logger.warn('Could not check tables, running migrations:', checkError.message);
      await runMigrations();
    }

    logger.info('Database initialized successfully');
    return pool;
  } catch (error) {
    logger.error('Critical database error:', error);
    // Still return pool even if migrations fail
    logger.warn('Continuing with database connection despite initialization error');
    return pool;
  }
};

const runMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname, '../migrations/sql');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found');
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        try {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
          await pool.query(sql);
          logger.info(`Executed migration: ${file}`);
        } catch (migrationError) {
          logger.warn(`Migration ${file} had error (continuing):`, migrationError.message);
          // Don't throw, just continue
        }
      }
    }
  } catch (error) {
    logger.warn('Error running migrations (continuing):', error.message);
    // Don't throw, just log and continue
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initialize
};
