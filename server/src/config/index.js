// src/config/index.js

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  LOCALHOST: process.env.LOCALHOST,
  PORT: parseInt(process.env.PORT),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  TIMEZONE: process.env.APP_TIMEZONE,
  SESSION_PATH: path.join(__dirname, '../../baileys_session'),
  CLIENT_DIST_PATH: path.join(__dirname, '../../../client/dist'),
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION === 'true',
  DROP_SCHEDULED_MESSAGES: process.env.DROP_SCHEDULED_MESSAGES === 'true',
  REDIS_HOST: process.env.REDIS_HOST || process.env.LOCALHOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  DB_PATH: process.env.DB_PATH || 'app.db',
};
