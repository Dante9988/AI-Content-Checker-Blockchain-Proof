const fs = require('fs');
const path = require('path');

// Copy .env.example to .env if it doesn't exist
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envExamplePath)) {
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('Created .env file from .env.example');
  } else {
    console.log('.env file already exists');
  }
} else {
  console.error('.env.example file not found');
  process.exit(1);
}
