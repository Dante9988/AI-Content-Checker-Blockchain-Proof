const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const nestAppPath = path.join(__dirname, 'truchain-nest');
const envFilePath = path.join(nestAppPath, '.env');
const tempEnvPath = path.join(nestAppPath, '.env.temp');

// Get Docker container IP
let dockerIp = '';
try {
  dockerIp = execSync('docker inspect truchain-postgres -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"').toString().trim();
  console.log(`Found PostgreSQL container at IP: ${dockerIp}`);
} catch (error) {
  console.error('Could not find PostgreSQL container. Starting a new one...');
  try {
    execSync('docker run --name truchain-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=truchain -p 5432:5432 -d postgres:14');
    console.log('PostgreSQL container started. Waiting for it to initialize...');
    // Wait for container to start
    execSync('sleep 5');
    dockerIp = execSync('docker inspect truchain-postgres -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"').toString().trim();
    console.log(`PostgreSQL container started at IP: ${dockerIp}`);
  } catch (dbError) {
    console.error('Failed to start PostgreSQL container:', dbError.message);
    process.exit(1);
  }
}

// Read existing .env file
if (fs.existsSync(envFilePath)) {
  console.log('Reading existing .env file...');
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  
  // Update database connection settings
  const updatedEnv = envContent
    .replace(/DB_HOST=.*/g, `DB_HOST=${dockerIp}`)
    .replace(/DB_PORT=.*/g, 'DB_PORT=5432')
    .replace(/DB_USERNAME=.*/g, 'DB_USERNAME=postgres')
    .replace(/DB_PASSWORD=.*/g, 'DB_PASSWORD=postgres')
    .replace(/DB_DATABASE=.*/g, 'DB_DATABASE=truchain')
    .replace(/DB_LOGGING=.*/g, 'DB_LOGGING=true')
    + '\nDB_SYNCHRONIZE=true\n';
  
  // Write to temporary file
  fs.writeFileSync(tempEnvPath, updatedEnv);
  console.log('Updated .env file with Docker database connection settings.');
} else {
  console.error('.env file not found at:', envFilePath);
  process.exit(1);
}

// Start NestJS application with modified environment
console.log('Starting TruChain NestJS application with Docker database...');
console.log('Application will be available at: http://localhost:3000');
console.log('Swagger documentation will be available at: http://localhost:3000/api/docs');
console.log('Press Ctrl+C to stop the application.');

const nestProcess = spawn('yarn', ['start:dev'], { 
  cwd: nestAppPath,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DB_HOST: dockerIp,
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
  // Clean up temporary .env file
  if (fs.existsSync(tempEnvPath)) {
    fs.unlinkSync(tempEnvPath);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping TruChain NestJS application...');
  nestProcess.kill('SIGTERM');
  // Clean up temporary .env file
  if (fs.existsSync(tempEnvPath)) {
    fs.unlinkSync(tempEnvPath);
  }
  process.exit(0);
});
