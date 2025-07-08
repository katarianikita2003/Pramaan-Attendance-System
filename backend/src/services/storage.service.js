// backend/src/services/storage.service.js
import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

export class StorageService {
  constructor() {
    this.useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    
    if (this.useS3) {
      // Configure AWS S3
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.bucket = process.env.AWS_S3_BUCKET || 'pramaan-storage';
    } else {
      // Use local storage
      this.uploadDir = './uploads';
      this.ensureUploadDirectory();
    }
  }

  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(`${this.uploadDir}/profiles`, { recursive: true });
      await fs.mkdir(`${this.uploadDir}/biometrics`, { recursive: true });
      await fs.mkdir(`${this.uploadDir}/documents`, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
    }
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware(type = 'profile') {
    const fileFilter = (req, file, cb) => {
      const allowedTypes = {
        profile: ['image/jpeg', 'image/jpg', 'image/png'],
        document: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        biometric: ['image/jpeg', 'image/jpg', 'image/png']
      };

      if (allowedTypes[type].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    };

    if (this.useS3) {
      return multer({
        storage: multerS3({
          s3: this.s3,
          bucket: this.bucket,
          acl: 'private',
          key: (req, file, cb) => {
            const filename = this.generateFileName(file);
            cb(null, `${type}/${filename}`);
          },
          metadata: (req, file, cb) => {
            cb(null, {
              userId: req.user?.id || 'anonymous',
              uploadedAt: new Date().toISOString()
            });
          }
        }),
        fileFilter,
        limits: {
          fileSize: type === 'document' ? 10 * 1024 * 1024 : 5 * 1024 * 1024 // 10MB for docs, 5MB for images
        }
      });
    } else {
      return multer({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, `${this.uploadDir}/${type}s`);
          },
          filename: (req, file, cb) => {
            const filename = this.generateFileName(file);
            cb(null, filename);
          }
        }),
        fileFilter,
        limits: {
          fileSize: type === 'document' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
        }
      });
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(file) {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    return `${uniqueId}${ext}`;
  }

  /**
   * Upload file to storage
   */
  async uploadFile(file, type = 'document') {
    try {
      if (this.useS3) {
        const key = `${type}/${this.generateFileName(file)}`;
        
        const params = {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
          }
        };

        const result = await this.s3.upload(params).promise();
        
        return {
          key,
          location: result.Location,
          bucket: this.bucket,
          size: file.size
        };
      } else {
        // Local storage is handled by multer
        return {
          key: file.filename,
          location: `${this.uploadDir}/${type}s/${file.filename}`,
          size: file.size
        };
      }
    } catch (error) {
      logger.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucket,
          Key: key,
          Expires: expiresIn
        };
        
        return await this.s3.getSignedUrlPromise('getObject', params);
      } else {
        // For local storage, return direct URL (implement your own security)
        return `${process.env.BASE_URL}/uploads/${key}`;
      }
    } catch (error) {
      logger.error('Get signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key) {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucket,
          Key: key
        };
        
        await this.s3.deleteObject(params).promise();
      } else {
        const filePath = path.join(this.uploadDir, key);
        await fs.unlink(filePath);
      }
      
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * Copy file
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey
        };
        
        await this.s3.copyObject(params).promise();
      } else {
        const sourcePath = path.join(this.uploadDir, sourceKey);
        const destPath = path.join(this.uploadDir, destinationKey);
        await fs.copyFile(sourcePath, destPath);
      }
      
      return true;
    } catch (error) {
      logger.error('File copy error:', error);
      throw new Error('Failed to copy file');
    }
  }

  /**
   * List files with prefix
   */
  async listFiles(prefix, maxKeys = 100) {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys
        };
        
        const result = await this.s3.listObjectsV2(params).promise();
        return result.Contents || [];
      } else {
        const dirPath = path.join(this.uploadDir, prefix);
        const files = await fs.readdir(dirPath);
        
        return files.map(file => ({
          Key: path.join(prefix, file),
          Size: 0, // Would need to stat each file for size
          LastModified: new Date()
        }));
      }
    } catch (error) {
      logger.error('List files error:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key) {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucket,
          Key: key
        };
        
        const result = await this.s3.headObject(params).promise();
        return {
          size: result.ContentLength,
          contentType: result.ContentType,
          lastModified: result.LastModified,
          metadata: result.Metadata
        };
      } else {
        const filePath = path.join(this.uploadDir, key);
        const stats = await fs.stat(filePath);
        
        return {
          size: stats.size,
          lastModified: stats.mtime
        };
      }
    } catch (error) {
      logger.error('Get file metadata error:', error);
      return null;
    }
  }
}

export default StorageService;