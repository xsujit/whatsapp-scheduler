// src/config/index.js

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: parseInt(process.env.PORT),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  TIMEZONE: process.env.APP_TIMEZONE,
  SESSION_PATH: path.join(__dirname, '../../baileys_session'),
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION === 'true'
};

export { SCHEDULE_CONFIG } from '../../config.js';