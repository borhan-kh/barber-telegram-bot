import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'default.json');
let rawConfig = {};

if (fs.existsSync(configPath)) {
  rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const config = {
  botToken: process.env.BOT_TOKEN || '',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/barber_bot',
  adminId: process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : null,
  port: process.env.PORT || 3000,
  useWebhook: process.env.USE_WEBHOOK === 'true',
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  webhookPath: process.env.WEBHOOK_PATH || '/bot-webhook',

  salon: {
    name: process.env.SALON_NAME || rawConfig.salon?.name || 'Barber Salon',
    address: process.env.SALON_ADDRESS || rawConfig.salon?.address || 'Main Street',
    phone: process.env.SALON_PHONE || rawConfig.salon?.phone || '+1 555-0000'
  },

  schedule: {
    openingTime: rawConfig.schedule?.openingTime || '10:00',
    closingTime: rawConfig.schedule?.closingTime || '20:00',
    slotDuration: rawConfig.schedule?.slotDuration || 30
  },

  initialServices: rawConfig.initialServices || [],
  initialBarbers: rawConfig.initialBarbers || []
};

export default config;
