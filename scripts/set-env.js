const fs = require('fs');

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  throw new Error('API_URL environment variable is not set');
}

const envFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};`;

fs.writeFileSync('./src/environments/environment.ts', envFile);

console.log('Environment file generated successfully.');