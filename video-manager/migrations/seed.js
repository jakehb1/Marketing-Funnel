#!/usr/bin/env node

const db = require('../backend/config/database');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const logger = pino();

const seedDatabase = async () => {
  try {
    logger.info('Seeding database with sample data...');

    // Sample videos
    const videos = [
      {
        id: uuidv4(),
        title: 'Introduction to Reiki Healing',
        filename: 'sample_reiki_001.mp4',
        originalName: 'reiki_intro.mp4',
        funnel: 'patient',
        status: 'ready',
        duration: 1200,
        size: 524288000
      },
      {
        id: uuidv4(),
        title: 'Sound Bath Meditation',
        filename: 'sample_sound_002.mp4',
        originalName: 'sound_bath.mp4',
        funnel: 'healer',
        status: 'ready',
        duration: 900,
        size: 393216000
      },
      {
        id: uuidv4(),
        title: 'Ayurvedic Wellness Guide',
        filename: 'sample_ayurveda_003.mp4',
        originalName: 'ayurveda_guide.mp4',
        funnel: 'general',
        status: 'ready',
        duration: 1500,
        size: 655360000
      }
    ];

    for (const video of videos) {
      try {
        await db.query(
          `INSERT INTO videos (id, title, filename, original_name, funnel, status, duration, size, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [video.id, video.title, video.filename, video.originalName, video.funnel, video.status, video.duration, video.size]
        );
        logger.info(`✓ Seeded video: ${video.title}`);

        // Add sample transcript
        await db.query(
          `INSERT INTO transcripts (id, video_id, text, language, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            uuidv4(),
            video.id,
            `This is a sample transcript for "${video.title}". In a production environment, this would be the actual transcribed content from the video using Whisper.`,
            'en'
          ]
        );
      } catch (error) {
        logger.warn(`Video ${video.id} may already exist:`, error.message);
      }
    }

    logger.info('✓ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
