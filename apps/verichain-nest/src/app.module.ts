import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InferenceModule } from './inference/inference.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { VerificationModule } from './verification/verification.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    SharedModule,
    InferenceModule,
    BlockchainModule,
    VerificationModule,
  ],
})
export class AppModule {}
