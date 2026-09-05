const fs = require('fs');

const apiUrl = process.env.API_URL || 'YOUR_API_URL';

const envFile = `export const environment = {
  production: true,
  nasaApiUrl: '${apiUrl}'
};`;

fs.writeFileSync('./src/environments/environment.ts', envFile);
console.log('Environment file generated with API_URL');