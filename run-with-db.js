const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const nestAppPath = path.join(__dirname, 'truchain-nest');
const envFilePath = path.join(nestAppPath, '.env');
const envExamplePath = path.join(nestAppPath, 'env.example');

// Create .env file if it doesn't exist
if (!fs.existsSync(envFilePath) && fs.existsSync(envExamplePath)) {
  console.log('Creating .env file from env.example...');
  fs.copyFileSync(envExamplePath, envFilePath);
  console.log('.env file created successfully.');
}

// Check if PostgreSQL is installed
try {
  execSync('which psql', { stdio: 'ignore' });
  console.log('PostgreSQL is installed.');
} catch (error) {
  console.error('PostgreSQL is not installed. Please install PostgreSQL first.');
  process.exit(1);
}

// Check if PostgreSQL service is running
try {
  console.log('Checking if PostgreSQL service is running...');
  execSync('pg_isready -q');
  console.log('PostgreSQL service is running.');
} catch (error) {
  console.error('PostgreSQL service is not running. Please start it first.');
  console.log('You can start it with: sudo service postgresql start');
  process.exit(1);
}

// Create database if it doesn't exist
try {
  console.log('Checking if database exists...');
  execSync('psql -U postgres -lqt | cut -d \\| -f 1 | grep -qw truchain');
  console.log('Database "truchain" already exists.');
} catch (error) {
  try {
    console.log('Creating database "truchain"...');
    execSync('psql -U postgres -c "CREATE DATABASE truchain;"');
    console.log('Database "truchain" created successfully.');
  } catch (dbError) {
    console.error('Failed to create database. You might need to set up PostgreSQL authentication.');
    console.log('Try running: psql -U postgres -c "CREATE DATABASE truchain;"');
    console.log('If that fails, you may need to update your PostgreSQL authentication settings.');
  }
}

// Start NestJS application
console.log('Starting TruChain NestJS application...');
console.log('Application will be available at: http://localhost:3000');
console.log('Swagger documentation will be available at: http://localhost:3000/api/docs');
console.log('Press Ctrl+C to stop the application.');

const nestProcess = spawn('yarn', ['start:dev'], { 
  cwd: nestAppPath,
  stdio: 'inherit',
  shell: true
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
