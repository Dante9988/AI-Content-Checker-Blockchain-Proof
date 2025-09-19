import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ nullable: true, type: 'jsonb' })
  requestBody?: Record<string, any>;

  @Column({ nullable: true, type: 'jsonb' })
  responseBody?: Record<string, any>;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  processingTimeMs?: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, user => user.requestLogs, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
