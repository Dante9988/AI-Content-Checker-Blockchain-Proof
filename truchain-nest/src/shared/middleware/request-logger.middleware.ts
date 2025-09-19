import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestLogService } from '../../users/request-log.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(private readonly requestLogService: RequestLogService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    
    // Get user ID from JWT token if available
    let userId: string | undefined;
    try {
      const authHeader = headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Simple JWT parsing (in a real app, use a proper JWT library)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub;
      }
    } catch (error) {
      // Ignore JWT parsing errors
    }

    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;
    let responseBody: any;

    // Override response methods to capture response data
    res.json = function(body: any): Response {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.send = function(body: any): Response {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Process after response is sent
    res.on('finish', () => {
      const processingTimeMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Don't log health checks or static assets
      if (originalUrl.includes('/health') || originalUrl.includes('/api-docs') || originalUrl.includes('/assets/')) {
        return;
      }

      // Log the request
      this.requestLogService.logRequest({
        endpoint: originalUrl,
        method,
        requestBody: method !== 'GET' ? req.body : undefined,
        responseBody: statusCode >= 400 ? responseBody : undefined, // Only log response body for errors
        statusCode,
        errorMessage: statusCode >= 400 ? responseBody?.error || responseBody?.message : undefined,
        ipAddress: ip,
        userAgent,
        processingTimeMs,
        userId,
      }).catch(error => {
        this.logger.error(`Failed to log request: ${error.message}`, error.stack);
      });
    });

    next();
  }
}
