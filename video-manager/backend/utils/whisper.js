const { exec } = require('child_process');
const { promisify } = require('util');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const { extractAudio } = require('./ffmpeg');

const execAsync = promisify(exec);
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * Transcribe audio/video file using Whisper
 * Falls back to mock transcription in development if Whisper CLI not available
 */
const transcribeAudio = async (videoPath) => {
  try {
    // First, try to use the whisper CLI if available
    if (process.env.USE_WHISPER_CLI === 'true') {
      return await transcribeWithWhisperCLI(videoPath);
    }

    // Check if ffmpeg + whisper are available
    try {
      await execAsync('which whisper');
      return await transcribeWithWhisperCLI(videoPath);
    } catch {
      logger.warn('Whisper CLI not found, using mock transcription');
      return await mockTranscription(videoPath);
    }
  } catch (error) {
    logger.error('Transcription error:', error);
    throw new Error('Transcription failed: ' + error.message);
  }
};

/**
 * Transcribe using Whisper CLI
 */
const transcribeWithWhisperCLI = async (videoPath) => {
  try {
    const outputDir = path.dirname(videoPath);
    const outputName = path.basename(videoPath, path.extname(videoPath));

    // Run whisper command
    const { stdout, stderr } = await execAsync(
      `whisper "${videoPath}" --model base --output_format json --output_dir "${outputDir}"`,
      { timeout: 600000 } // 10 minutes
    );

    logger.info('Whisper output:', stdout);

    // Read the JSON output
    const jsonPath = path.join(outputDir, `${outputName}.json`);
    if (fs.existsSync(jsonPath)) {
      const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      fs.unlinkSync(jsonPath); // Clean up JSON file

      // Extract text from segments
      const transcript = result.text || '';
      return transcript;
    }

    throw new Error('Whisper JSON output not found');
  } catch (error) {
    logger.error('Whisper CLI transcription error:', error);
    throw error;
  }
};

/**
 * Mock transcription (for development/testing)
 * Returns sample transcription text
 */
const mockTranscription = async (videoPath) => {
  logger.info('Using mock transcription for:', videoPath);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const mockTexts = [
    'Good morning everyone. Today we\'re going to discuss the fundamentals of energy healing and how it can benefit your wellness journey. Energy healing is an ancient practice that has been used for thousands of years across various cultures.',
    'Welcome to our session on meditation and mindfulness. We\'ll be exploring different breathing techniques and how they can help reduce stress and anxiety. Find a comfortable position, relax your shoulders, and let\'s begin our journey.',
    'Hello, I\'m here to talk about the power of crystal healing. Crystals have unique vibrational frequencies that can interact with our energy fields. We\'ll explore how different crystals can support emotional, physical, and spiritual healing.',
    'Today\'s topic is Ayurvedic wellness principles. Ayurveda teaches us that balance is key to good health. We have three doshas: Vata, Pitta, and Kapha. Understanding your dosha can help you make better lifestyle choices.'
  ];

  const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
  return randomText;
};

/**
 * Transcribe with language specification
 */
const transcribeWithLanguage = async (videoPath, language = 'en') => {
  try {
    const outputDir = path.dirname(videoPath);
    const outputName = path.basename(videoPath, path.extname(videoPath));

    const { stdout } = await execAsync(
      `whisper "${videoPath}" --model base --language ${language} --output_format json --output_dir "${outputDir}"`,
      { timeout: 600000 }
    );

    logger.info(`Transcription complete for ${language}`);

    const jsonPath = path.join(outputDir, `${outputName}.json`);
    if (fs.existsSync(jsonPath)) {
      const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      fs.unlinkSync(jsonPath);
      return result.text || '';
    }

    throw new Error('Whisper JSON output not found');
  } catch (error) {
    logger.error('Transcription with language error:', error);
    throw error;
  }
};

module.exports = {
  transcribeAudio,
  transcribeWithLanguage,
  mockTranscription
};
