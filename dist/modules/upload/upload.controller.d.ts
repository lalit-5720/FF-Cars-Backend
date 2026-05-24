import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadSingle(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    uploadMultiple(files: Express.Multer.File[]): Promise<{
        urls: string[];
    }>;
}
