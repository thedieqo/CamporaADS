import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import pino from 'pino';
import pinoHttp from 'pino-http';

async function bootstrap() {
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(pinoHttp({ logger }));
  app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('CAMPORA API')
    .setDescription('API demo primer incremento: auth, ofertas y sincronización offline')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'API iniciada');
}
bootstrap();
