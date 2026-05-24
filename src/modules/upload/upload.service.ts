import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private useCloudinary = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret && cloudName !== 'your-cloud-name') {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.useCloudinary = true;
      this.logger.log('Cloudinary successfully configured for image uploads');
    } else {
      this.logger.warn('Cloudinary not configured. Falling back to local disk storage.');
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (this.useCloudinary) {
      return this.uploadToCloudinary(file);
    } else {
      return this.uploadToLocal(file);
    }
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ff_cars',
          resource_type: 'image',
          transformation: [{ width: 1000, height: 600, crop: 'limit' }],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            // Fallback to local storage on API error
            this.logger.warn('Falling back to local storage due to Cloudinary error.');
            resolve(this.uploadToLocal(file));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Cloudinary upload returned empty result'));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  private uploadToLocal(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(file.originalname);
        const filename = `${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, file.buffer);
        
        // Return URL served by our application static folder
        const port = this.configService.get<string>('PORT') || '5000';
        const fileUrl = `http://localhost:${port}/uploads/${filename}`;
        
        this.logger.log(`File saved locally: ${fileUrl}`);
        resolve(fileUrl);
      } catch (err: any) {
        this.logger.error(`Local file write failed: ${err.message}`);
        reject(new BadRequestException('Failed to write image file locally'));
      }
    });
  }
}
