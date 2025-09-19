const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const nestAppPath = path.join(__dirname, 'truchain-nest');

// Get Docker host IP
let dockerHostIp = '';
try {
  dockerHostIp = execSync('ip route show default | awk \'{print $3}\'').toString().trim();
  console.log(`Found Docker host IP: ${dockerHostIp}`);
} catch (error) {
  console.error('Could not determine Docker host IP:', error.message);
  process.exit(1);
}

console.log('Starting TruChain with PostgreSQL database...');

// Check if PostgreSQL container is running
try {
  const containerRunning = execSync('docker ps -q -f name=truchain-postgres').toString().trim() !== '';
  
  if (!containerRunning) {
    console.log('Starting PostgreSQL Docker container...');
    execSync('docker run --name truchain-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=truchain -p 5432:5432 -d postgres:14');
    console.log('PostgreSQL Docker container started. Waiting for it to initialize...');
    // Wait for container to start
    execSync('sleep 5');
  } else {
    console.log('PostgreSQL Docker container is already running.');
  }
} catch (dbError) {
  console.error('Failed to start PostgreSQL container:', dbError.message);
  process.exit(1);
}

// Run database migrations
console.log('Running database migrations...');
try {
  execSync('cd truchain-nest && yarn migration:run', { stdio: 'inherit' });
  console.log('Migrations completed successfully.');
} catch (error) {
  console.error('Failed to run migrations:', error.message);
  // Continue anyway, as the app might work with synchronize: true
}

// Start NestJS application with environment variables
console.log('Starting TruChain NestJS application...');
console.log(`Connecting to PostgreSQL at ${dockerHostIp}:5432`);
console.log('Application will be available at: http://localhost:3000');
console.log('Swagger documentation will be available at: http://localhost:3000/api/docs');
console.log('Press Ctrl+C to stop the application.');

const nestProcess = spawn('yarn', ['start:dev'], { 
  cwd: nestAppPath,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DB_HOST: dockerHostIp,
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_DATABASE: 'truchain',
    DB_LOGGING: 'true',
    DB_SYNCHRONIZE: 'true'
  }
});

nestProcess.on('error', (error) => {
  console.error(`Failed to start NestJS application: ${error.message}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping TruChain NestJS application...');
  nestProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping TruChain NestJS application...');
  nestProcess.kill('SIGTERM');
  process.exit(0);
});