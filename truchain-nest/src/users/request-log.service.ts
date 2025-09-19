import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { RequestLog } from './entities';

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(
    @InjectRepository(RequestLog)
    private readonly requestLogRepository: Repository<RequestLog>,
  ) {}

  /**
   * Log an API request
   */
  async logRequest(data: {
    endpoint: string;
    method: string;
    requestBody?: Record<string, any>;
    responseBody?: Record<string, any>;
    statusCode?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    processingTimeMs?: number;
    userId?: string;
  }): Promise<RequestLog> {
    try {
      const requestLog = this.requestLogRepository.create(data);
      return await this.requestLogRepository.save(requestLog);
    } catch (error) {
      this.logger.error(`Failed to log request: ${error.message}`, error.stack);
      // Don't throw - we don't want request logging to break the application
      return null;
    }
  }

  /**
   * Get request logs for a user
   */
  async getLogsForUser(userId: string, limit = 100, offset = 0): Promise<RequestLog[]> {
    return this.requestLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get request logs for an endpoint
   */
  async getLogsForEndpoint(endpoint: string, limit = 100, offset = 0): Promise<RequestLog[]> {
    return this.requestLogRepository.find({
      where: { endpoint },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get error logs
   */
  async getErrorLogs(limit = 100, offset = 0): Promise<RequestLog[]> {
    return this.requestLogRepository.find({
      where: { errorMessage: Not(IsNull()) },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get request statistics
   */
  async getRequestStats(days = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.requestLogRepository
      .createQueryBuilder('log')
      .select('COUNT(*)', 'totalRequests')
      .addSelect('COUNT(CASE WHEN log.statusCode >= 400 THEN 1 END)', 'errorCount')
      .addSelect('COUNT(CASE WHEN log.statusCode >= 200 AND log.statusCode < 300 THEN 1 END)', 'successCount')
      .addSelect('AVG(log.processingTimeMs)', 'avgProcessingTime')
      .addSelect('MAX(log.processingTimeMs)', 'maxProcessingTime')
      .where('log.timestamp >= :startDate', { startDate })
      .getRawOne();

    return stats;
  }
}
