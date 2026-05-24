"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisCacheService = RedisCacheService_1 = class RedisCacheService {
    configService;
    logger = new common_1.Logger(RedisCacheService_1.name);
    redisClient = null;
    memoryCache = new Map();
    useMemoryCache = false;
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        const redisUrl = this.configService.get('REDIS_URL');
        console.log(redisUrl);
        if (!redisUrl) {
            this.logger.warn('REDIS_URL not configured. Falling back to In-Memory Cache.');
            this.useMemoryCache = true;
            return;
        }
        try {
            this.redisClient = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 1,
                connectTimeout: 2000,
            });
            this.redisClient.on('connect', () => {
                this.logger.log('Successfully connected to Redis server');
                this.useMemoryCache = false;
            });
            this.redisClient.on('error', (err) => {
                this.logger.error(`Redis client error: ${err.message}. Falling back to In-Memory Cache.`);
                this.useMemoryCache = true;
            });
        }
        catch (err) {
            this.logger.error(`Failed to initialize Redis: ${err.message}. Falling back to In-Memory Cache.`);
            this.useMemoryCache = true;
        }
    }
    async onModuleDestroy() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }
    async get(key) {
        if (this.useMemoryCache || !this.redisClient) {
            const entry = this.memoryCache.get(key);
            if (!entry)
                return null;
            if (Date.now() > entry.expiry) {
                this.memoryCache.delete(key);
                return null;
            }
            return JSON.parse(entry.value);
        }
        try {
            const data = await this.redisClient.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (err) {
            this.logger.error(`Redis GET error: ${err.message}`);
            return null;
        }
    }
    async set(key, value, ttlSeconds = 300) {
        const serializedValue = JSON.stringify(value);
        if (this.useMemoryCache || !this.redisClient) {
            const expiry = Date.now() + ttlSeconds * 1000;
            this.memoryCache.set(key, { value: serializedValue, expiry });
            return;
        }
        try {
            await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
        }
        catch (err) {
            this.logger.error(`Redis SET error: ${err.message}`);
            const expiry = Date.now() + ttlSeconds * 1000;
            this.memoryCache.set(key, { value: serializedValue, expiry });
        }
    }
    async del(key) {
        if (this.useMemoryCache || !this.redisClient) {
            this.memoryCache.delete(key);
            return;
        }
        try {
            await this.redisClient.del(key);
        }
        catch (err) {
            this.logger.error(`Redis DEL error: ${err.message}`);
            this.memoryCache.delete(key);
        }
    }
    async invalidatePattern(pattern) {
        if (this.useMemoryCache || !this.redisClient) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key);
                }
            }
            return;
        }
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(...keys);
            }
        }
        catch (err) {
            this.logger.error(`Redis keys invalidation error: ${err.message}`);
        }
    }
};
exports.RedisCacheService = RedisCacheService;
exports.RedisCacheService = RedisCacheService = RedisCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisCacheService);
//# sourceMappingURL=redis-cache.service.js.map