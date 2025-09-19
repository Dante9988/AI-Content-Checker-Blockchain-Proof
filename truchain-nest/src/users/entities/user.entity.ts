import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { RequestLog } from './request-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column()
  walletPrivateKey: string; // Should be encrypted in a real application

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => ApiKey, apiKey => apiKey.user)
  apiKeys: ApiKey[];

  @OneToMany(() => RequestLog, requestLog => requestLog.user)
  requestLogs: RequestLog[];
}