const ffmpeg = require('fluent-ffmpeg');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * Get video duration in seconds
 */
const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = Math.round(metadata.format.duration);
        resolve(duration);
      }
    });
  });
};

/**
 * Extract audio from video and save as WAV
 */
const extractAudio = (videoPath, audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .on('end', () => {
        logger.info(`Audio extracted: ${audioPath}`);
        resolve(audioPath);
      })
      .on('error', (err) => {
        logger.error('Audio extraction error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Splice/extract segment from video
 */
const spliceVideo = (inputPath, outputPath, startTime, endTime) => {
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => {
        logger.info(`Video spliced: ${outputPath} (${startTime}s - ${endTime}s)`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('Video splice error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Merge multiple clips into one video
 */
const mergeClips = (clipPaths, outputPath) => {
  return new Promise((resolve, reject) => {
    const concatFile = path.join(path.dirname(outputPath), `concat_${Date.now()}.txt`);
    const concatContent = clipPaths
      .map(clip => `file '${path.resolve(clip)}'`)
      .join('\n');

    fs.writeFileSync(concatFile, concatContent);

    ffmpeg()
      .input(concatFile)
      .inputOptions('-f', 'concat', '-safe', '0')
      .output(outputPath)
      .videoCodec('copy')
      .audioCodec('copy')
      .on('end', () => {
        fs.unlinkSync(concatFile);
        logger.info(`Clips merged: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        if (fs.existsSync(concatFile)) {
          fs.unlinkSync(concatFile);
        }
        logger.error('Clip merge error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Get video metadata (resolution, framerate, etc.)
 */
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const video = metadata.streams.find(s => s.codec_type === 'video');
        const audio = metadata.streams.find(s => s.codec_type === 'audio');

        resolve({
          duration: Math.round(metadata.format.duration),
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          video: {
            codec: video?.codec_name,
            width: video?.width,
            height: video?.height,
            fps: video?.r_frame_rate
          },
          audio: {
            codec: audio?.codec_name,
            sampleRate: audio?.sample_rate,
            channels: audio?.channels
          }
        });
      }
    });
  });
};

module.exports = {
  getVideoDuration,
  extractAudio,
  spliceVideo,
  mergeClips,
  getVideoMetadata
};
