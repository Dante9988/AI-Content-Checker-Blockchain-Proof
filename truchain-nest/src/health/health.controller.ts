import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-09-19T12:34:56.789Z' },
        uptime: { type: 'number', example: 3600 },
        version: { type: 'string', example: '1.0.0' },
        services: {
          type: 'object',
          properties: {
            inference: { type: 'string', example: 'ok' },
            blockchain: { type: 'string', example: 'ok' },
            verification: { type: 'string', example: 'ok' },
          }
        }
      }
    }
  })
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        inference: 'ok',
        blockchain: 'ok',
        verification: 'ok',
      }
    };
  }
}
