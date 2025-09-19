import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { InferenceModule } from '../inference/inference.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [InferenceModule, BlockchainModule],
  providers: [VerificationService],
  controllers: [VerificationController],
})
export class VerificationModule {}
