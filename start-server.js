const { defineConfig } = require('@medusajs/framework/utils');
const { runMedusaApp } = require('@medusajs/medusa');

// Load environment variables
require('dotenv').config();

// Configuration similar to medusa-config.ts but in JS
const config = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || 'sqlite://localhost/medusa-backend.db',
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    }
  },
  modules: [
    {
      resolve: "./src/modules/payment-info",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-providers/cod",
            id: "cod",
          },
          {
            resolve: "./src/modules/payment-providers/bank-transfer",
            id: "bank-transfer",
          },
        ],
      },
    },
  ],
});

async function startServer() {
  console.log('Starting Medusa server...');
  
  try {
    // Attempt to start the Medusa application
    await runMedusaApp({
      config,
      activityId: 'medusa-server-startup',
    });
    
    console.log('Medusa server is running on port 9000');
  } catch (error) {
    console.error('Failed to start Medusa server:', error);
    process.exit(1);
  }
}

startServer();