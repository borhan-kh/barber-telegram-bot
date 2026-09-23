import mongoose from 'mongoose';
import appConfig from '../config/index.js';

const ConfigSchema = new mongoose.Schema({
  barber_selection_enabled: {
    type: Boolean,
    default: true
  },
  days_off: {
    type: [String],
    default: []
  },
  recurring_days_off: {
    type: [Number],
    default: []
  },
  admin_ids: {
    type: [Number],
    default: []
  },
  opening_time: {
    type: String,
    default: '10:00'
  },
  closing_time: {
    type: String,
    default: '20:00'
  },
  slot_duration: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

const Config = mongoose.model('Config', ConfigSchema);

export async function getOrCreateConfig() {
  let dbConfig = await Config.findOne({});
  const envAdmin = appConfig.adminId ? [Number(appConfig.adminId)] : [];

  if (!dbConfig) {
    dbConfig = new Config({
      barber_selection_enabled: true,
      days_off: [],
      recurring_days_off: [],
      admin_ids: envAdmin,
      opening_time: appConfig.schedule.openingTime || '10:00',
      closing_time: appConfig.schedule.closingTime || '20:00',
      slot_duration: appConfig.schedule.slotDuration || 30
    });
    await dbConfig.save();
  } else if (dbConfig.admin_ids.length === 0 && appConfig.adminId) {
    dbConfig.admin_ids.push(Number(appConfig.adminId));
    await dbConfig.save();
  }
  return dbConfig;
}

export async function isAdmin(telegramId) {
  if (!telegramId) return false;
  const numId = Number(telegramId);
  if (appConfig.adminId && Number(appConfig.adminId) === numId) {
    return true;
  }
  const dbConfig = await getOrCreateConfig();
  return dbConfig.admin_ids.some(id => Number(id) === numId);
}

export default Config;
