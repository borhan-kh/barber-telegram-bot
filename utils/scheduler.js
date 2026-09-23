import Appointment from '../models/Appointment.js';
import config from '../config/index.js';
import logger from './logger.js';
import { getJalaaliDateInfo, timeToMinutes } from './date.js';

export async function sendTodayReminders(bot) {
  let sentCount = 0;
  try {
    const todayInfo = getJalaaliDateInfo(new Date());
    const todayDateString = todayInfo.dateString;

    const pendingAppointments = await Appointment.find({
      date: todayDateString,
      status: 'confirmed',
      reminded: { $ne: true }
    })
      .populate('user')
      .populate('barber')
      .populate('service');

    for (const app of pendingAppointments) {
      if (!app.user || !app.user.telegram_id) {
        continue;
      }

      const duration = app.service ? (app.service.duration || 30) : 30;
      const startMins = timeToMinutes(app.time);
      const endMins = startMins + duration;
      const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

      const customerName = app.user.full_name || 'کاربر گرامی';
      const serviceName = app.service ? app.service.name : 'خدمت رزرو شده';
      const barberName = app.barber ? app.barber.name : 'تخصیص توسط سالن';
      const salonName = config.salon.name;
      const salonAddress = config.salon.address;
      const salonPhone = config.salon.phone;

      const reminderText = `🔔 <b>یادآوری نوبت امروز شما در سالن زیبایی "${salonName}"</b>\n\n` +
        `👤 <b>مشتری گرامی:</b> ${customerName}\n` +
        `💇‍♂️ <b>خدمت:</b> ${serviceName} (${duration} دقیقه)\n` +
        `💈 <b>آرایشگر:</b> ${barberName}\n` +
        `📅 <b>تاریخ:</b> امروز (${todayInfo.label})\n` +
        `⏰ <b>ساعت حضور:</b> ${app.time} تا ${endTimeStr}\n\n` +
        `📍 <b>آدرس سالن:</b> ${salonAddress}\n` +
        `☎️ <b>تلفن:</b> ${salonPhone}\n\n` +
        `<i>لطفاً ۱۰ دقیقه قبل از زمان سانس در سالن حضور داشته باشید. منتظر حضور شما هستیم! 🌹</i>`;

      try {
        await bot.telegram.sendMessage(app.user.telegram_id, reminderText, { parse_mode: 'HTML' });
        app.reminded = true;
        await app.save();
        sentCount++;
      } catch (sendError) {
        logger.error('Failed to send appointment reminder', {
          telegramId: app.user.telegram_id,
          error: sendError.message
        });
      }
    }
  } catch (error) {
    logger.error('Error in appointment reminder scheduler dispatch', { error: error.message });
  }

  return sentCount;
}

export function startAppointmentReminderScheduler(bot) {
  sendTodayReminders(bot).catch(err => logger.error('Initial reminder run failed', { error: err.message }));

  const INTERVAL_MS = 15 * 60 * 1000;
  setInterval(() => {
    sendTodayReminders(bot).catch(err => logger.error('Interval reminder run failed', { error: err.message }));
  }, INTERVAL_MS);

  logger.info('Appointment reminder scheduler initialized.');
}
