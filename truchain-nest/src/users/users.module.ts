import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WalletService } from './wallet.service';
import { RequestLogService } from './request-log.service';
import { User, ApiKey, RequestLog } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, RequestLog]),
  ],
  controllers: [UsersController],
  providers: [UsersService, WalletService, RequestLogService],
  exports: [UsersService, WalletService, RequestLogService],
})
export class UsersModule {}
