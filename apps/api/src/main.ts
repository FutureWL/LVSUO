import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger (Pino)
  app.useLogger(app.get(Logger));

  // Config
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT', 3000);
  const prefix = config.get<string>('APP_GLOBAL_PREFIX', 'api/counsel/v1');
  const origins = config
    .get<string>('APP_CORS_ORIGINS', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(prefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger (only in non-prod)
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LM Unity · Counsel API')
      .setDescription('智法云枢 · 律师工作台 API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth', '认证')
      .addTag('tenant', '租户')
      .addTag('user', '用户')
      .addTag('lead', '线索')
      .addTag('matter', '案件')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document);
  }

  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`🚀 LM Unity API running on http://localhost:${port}/${prefix}`);
  logger.log(`📚 Swagger docs at  http://localhost:${port}/${prefix}/docs`);
}

bootstrap();
