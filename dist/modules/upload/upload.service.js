"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
let UploadService = UploadService_1 = class UploadService {
    configService;
    logger = new common_1.Logger(UploadService_1.name);
    useCloudinary = false;
    constructor(configService) {
        this.configService = configService;
        const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
        if (cloudName && apiKey && apiSecret && cloudName !== 'your-cloud-name') {
            cloudinary_1.v2.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            this.useCloudinary = true;
            this.logger.log('Cloudinary successfully configured for image uploads');
        }
        else {
            this.logger.warn('Cloudinary not configured. Falling back to local disk storage.');
        }
    }
    async uploadFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (this.useCloudinary) {
            return this.uploadToCloudinary(file);
        }
        else {
            return this.uploadToLocal(file);
        }
    }
    async uploadToCloudinary(file) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: 'ff_cars',
                resource_type: 'image',
                transformation: [{ width: 1000, height: 600, crop: 'limit' }],
            }, (error, result) => {
                if (error) {
                    this.logger.error(`Cloudinary upload failed: ${error.message}`);
                    this.logger.warn('Falling back to local storage due to Cloudinary error.');
                    resolve(this.uploadToLocal(file));
                }
                else if (result) {
                    resolve(result.secure_url);
                }
                else {
                    reject(new Error('Cloudinary upload returned empty result'));
                }
            });
            uploadStream.end(file.buffer);
        });
    }
    uploadToLocal(file) {
        return new Promise((resolve, reject) => {
            try {
                const uploadDir = path.join(process.cwd(), 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const ext = path.extname(file.originalname);
                const filename = `${(0, crypto_1.randomUUID)()}${ext}`;
                const filePath = path.join(uploadDir, filename);
                fs.writeFileSync(filePath, file.buffer);
                const port = this.configService.get('PORT') || '5000';
                const fileUrl = `http://localhost:${port}/uploads/${filename}`;
                this.logger.log(`File saved locally: ${fileUrl}`);
                resolve(fileUrl);
            }
            catch (err) {
                this.logger.error(`Local file write failed: ${err.message}`);
                reject(new common_1.BadRequestException('Failed to write image file locally'));
            }
        });
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map