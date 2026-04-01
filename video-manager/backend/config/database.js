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
    
    // Check if tables exist
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

    return pool;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, '../migrations/sql');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      logger.info(`Executed migration: ${file}`);
    }
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initialize
};
