import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Security Headers using Helmet
  // Configure crossOriginResourcePolicy to false so that images served locally can be loaded on the frontend
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // 2. CORS configurations
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // 3. Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 4. Serves uploads folder as static assets
  // Using direct express static middleware to ensure reliable cross-platform directory mapping
  const uploadsDir = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // 5. Start the server
  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`NestJS application successfully running on port ${port}`);
}
bootstrap();
