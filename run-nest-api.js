#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the NestJS application
const nestAppPath = path.join(__dirname, 'apps/verichain-nest');

// Check if the NestJS application exists
if (!fs.existsSync(nestAppPath)) {
  console.error(`NestJS application not found at ${nestAppPath}`);
  process.exit(1);
}

// Check if .env file exists, if not, run setup:env
if (!fs.existsSync(path.join(nestAppPath, '.env'))) {
  console.log('Setting up environment variables...');
  const setupEnv = spawn('yarn', ['setup:env'], {
    cwd: nestAppPath,
    stdio: 'inherit',
  });

  setupEnv.on('close', (code) => {
    if (code !== 0) {
      console.error(`Failed to set up environment variables (exit code: ${code})`);
      process.exit(code);
    }
    startNestApp();
  });
} else {
  startNestApp();
}

function startNestApp() {
  console.log('Starting VeriChain NestJS API...');
  
  // Check if we need to build first
  if (!fs.existsSync(path.join(nestAppPath, 'dist'))) {
    console.log('Building application...');
    const build = spawn('yarn', ['build'], {
      cwd: nestAppPath,
      stdio: 'inherit',
    });

    build.on('close', (code) => {
      if (code !== 0) {
        console.error(`Failed to build application (exit code: ${code})`);
        process.exit(code);
      }
      runApp();
    });
  } else {
    runApp();
  }
}

function runApp() {
  const isDev = process.argv.includes('--dev');
  const command = isDev ? 'start:dev' : 'start';

  console.log(`Running in ${isDev ? 'development' : 'production'} mode...`);
  
  const app = spawn('yarn', [command], {
    cwd: nestAppPath,
    stdio: 'inherit',
  });

  app.on('close', (code) => {
    console.log(`Application exited with code ${code}`);
    process.exit(code);
  });
}
