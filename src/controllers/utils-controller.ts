import { Request, Response } from 'express';
import { env } from '@/constants/env';
import { logger } from '@/server';

import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT.replace(/^https?:\/\//, ''),
  port: parseInt(new URL(env.MINIO_ENDPOINT).port) || (env.MINIO_ENDPOINT.startsWith('https') ? 443 : 80),
  useSSL: env.MINIO_ENDPOINT.startsWith('https'),
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// create bucket if needed
export async function ensureBucket(bucket: string) {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) await minioClient.makeBucket(bucket);
}

export async function createPresignedUploadUrl(bucket: string, objectName: string, expiry = 3600) {
  await ensureBucket(bucket);
  return await minioClient.presignedPutObject(bucket, objectName, expiry);
}


export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      data: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {

    const files = req.body;

    if (!files.length) {
      res.status(400).json({
        success: false,
        message: 'No filename uploaded'
      });
      return;
    }

    const bucket = 'atom';

    const presignedUrls = await Promise.all(files.map(async (file: any) => {
      const presignedUrl = await createPresignedUploadUrl(bucket, file.originalFileName);
      return {
        originalFileName: file.originalFileName,
        publicUrl: `https://minio.lmtalk.com/atom/${file.originalFileName}`,
        presignedUrl
      };
    }));

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        bucket,
        presignedUrls
      }
    });
  } catch (error) {
    logger.error('File upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
