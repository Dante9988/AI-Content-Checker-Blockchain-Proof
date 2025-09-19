import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  // Increase JSON body size limit to 10MB
  app.use(json({ limit: '100mb' }));
  
  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TruChain API')
    .setDescription('API for TruChain image verification system')
    .setVersion('1.0')
    .addTag('verification', 'Image verification endpoints')
    .addTag('blockchain', 'Blockchain interaction endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
