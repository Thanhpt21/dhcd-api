// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT');
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!port) {
    throw new Error('PORT environment variable is not defined.');
  }

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    methods: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true,
  });

  app.setGlobalPrefix('v1');


  await app.listen(port);

  console.log(`Server is running on: http://localhost:${port}/v1`);
  console.log(`Running in ${nodeEnv} mode`);
}

bootstrap();