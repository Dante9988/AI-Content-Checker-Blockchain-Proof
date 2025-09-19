import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Get Docker host IP for WSL2
let host = process.env.DB_HOST || 'localhost';
try {
  if (host === 'localhost') {
    const { execSync } = require('child_process');
    const dockerHostIp = execSync('ip route show default | awk \'{print $3}\'').toString().trim();
    if (dockerHostIp) {
      host = dockerHostIp;
      console.log(`Using Docker host IP: ${host}`);
    }
  }
} catch (error) {
  console.warn('Could not determine Docker host IP, using configured host');
}

export default new DataSource({
  type: 'postgres',
  host: host,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'truchain',
  entities: [path.join(__dirname, 'src', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'src/migrations', '*.{ts,js}')],
  synchronize: false, // Important: set to false for production
  logging: process.env.DB_LOGGING === 'true',
});
