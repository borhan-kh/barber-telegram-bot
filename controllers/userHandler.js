import { Markup } from 'telegraf';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Appointment from '../models/Appointment.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { timeToMinutes } from '../utils/date.js';
import { getTranslation } from '../utils/i18n.js';

export async function getUserLang(ctx) {
  if (ctx.session?.lang) {
    return ctx.session.lang;
  }

  try {
    const user = await User.findOne({ telegram_id: ctx.from.id });
    if (user && user.language) {
      if (!ctx.session) ctx.session = {};
      ctx.session.lang = user.language;
      return user.language;
    }
  } catch (error) {
    logger.error('Error fetching user language preference', { error: error.message });
  }

  if (!ctx.session) ctx.session = {};
  ctx.session.lang = 'en';
  return 'en';
}

export const getMainMarkup = (lang = 'en') => {
  const t = getTranslation(lang);
  const langToggleLabel = lang === 'fa' ? '🇺🇸 English' : '🇮🇷 فارسی';

  return Markup.inlineKeyboard([
    [Markup.button.callback(t.btn_book, 'book_appointment')],
    [Markup.button.callback(t.btn_my_appts, 'my_appointments')],
    [
      Markup.button.callback(t.btn_services, 'services_prices'),
      Markup.button.callback(langToggleLabel, 'toggle_language'),
      Markup.button.callback(t.btn_contact, 'contact_us')
    ]
  ]);
};

export function setupUserHandlers(bot) {
  bot.action('toggle_language', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const currentLang = await getUserLang(ctx);
      const newLang = currentLang === 'fa' ? 'en' : 'fa';

      if (!ctx.session) ctx.session = {};
      ctx.session.lang = newLang;

      let user = await User.findOne({ telegram_id: ctx.from.id });
      if (user) {
        user.language = newLang;
        await user.save();
      }

      const t = getTranslation(newLang);
      await ctx.answerCbQuery(t.lang_changed, { show_alert: true });

      const welcomeMessage = t.welcome(config.salon.name);
      await ctx.editMessageText(welcomeMessage, {
        parse_mode: 'HTML',
        ...getMainMarkup(newLang)
      });
    } catch (error) {
      logger.error('Error toggling language', { error: error.message });
    }
  });

  bot.action('book_appointment', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.scene.enter('BOOKING_WIZARD');
    } catch (error) {
      logger.error('Error entering booking wizard', { error: error.message });
    }
  });

  bot.action('services_prices', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return;
      }

      let messageText = t.services_title(config.salon.name);
      services.forEach((service, index) => {
        messageText += `${index + 1}. <b>${service.name}</b>\n` +
          `💰 ${service.price.toLocaleString()} ${t.service_price_unit}\n` +
          `⏱ ${service.duration} ${t.service_dur_unit}\n` +
          `---------------------------\n`;
      });

      await ctx.replyWithHTML(
        messageText,
        Markup.inlineKeyboard([[Markup.button.callback(t.btn_back_to_menu, 'back_to_menu')]])
      );
    } catch (error) {
      logger.error('Error fetching services and prices', { error: error.message });
      await ctx.reply('Error loading services list.');
    }
  });

  bot.action('contact_us', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const contactInfo = t.contact_info(
        config.salon.name,
        config.salon.address,
        config.salon.phone,
        config.schedule.openingTime,
        config.schedule.closingTime
      );

      await ctx.replyWithHTML(
        contactInfo,
        Markup.inlineKeyboard([[Markup.button.callback(t.btn_back_to_menu, 'back_to_menu')]])
      );
    } catch (error) {
      logger.error('Error displaying contact info', { error: error.message });
    }
  });

  bot.action('my_appointments', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const user = await User.findOne({ telegram_id: ctx.from.id });
      if (!user) {
        await ctx.reply(t.no_user_found);
        return;
      }

      const appointments = await Appointment.find({
        user: user._id,
        status: 'confirmed'
      })
        .populate('barber')
        .populate('service')
        .sort({ date: 1, time: 1 });

      if (appointments.length === 0) {
        await ctx.reply(t.no_active_appts);
        return;
      }

      await ctx.reply(t.active_appts_title, { parse_mode: 'HTML' });

      for (const app of appointments) {
        const barberName = app.barber ? app.barber.name : t.appt_barber_auto;
        const serviceName = app.service ? app.service.name : 'Service';
        const duration = app.service ? app.service.duration : 30;
        const startMins = timeToMinutes(app.time);
        const endMins = startMins + duration;
        const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
        const priceText = app.service ? `${app.service.price.toLocaleString()} ${t.service_price_unit}` : '-';

        const appText = `💇‍♂️ <b>${serviceName}</b> (${duration} ${t.service_dur_unit})\n` +
          `👤 <b>${barberName}</b>\n` +
          `📅 <b>${app.date}</b>\n` +
          `⏰ <b>${app.time} - ${endTimeStr}</b>\n` +
          `💵 <b>${priceText}</b>`;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(t.btn_cancel_appt, `cancel_appt:${app._id}`)]
        ]);

        await ctx.replyWithHTML(appText, keyboard);
      }
    } catch (error) {
      logger.error('Error fetching user appointments', { error: error.message });
      await ctx.reply('Error fetching appointments.');
    }
  });

  bot.action(/^cancel_appt:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const appointmentId = ctx.match[1];
      const appointment = await Appointment.findById(appointmentId).populate('service');
      if (!appointment) {
        await ctx.answerCbQuery('Appointment not found.', { show_alert: true });
        return;
      }

      appointment.status = 'cancelled';
      await appointment.save();

      await ctx.answerCbQuery(t.appt_cancel_success, { show_alert: true });

      await ctx.editMessageText(
        t.appt_cancelled_msg,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      logger.error('Error cancelling user appointment', { error: error.message });
      await ctx.answerCbQuery('Error cancelling appointment.', { show_alert: true });
    }
  });

  bot.action('back_to_menu', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const welcomeMessage = t.welcome(config.salon.name);
      await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML', ...getMainMarkup(lang) });
    } catch (error) {
      logger.error('Error navigating back to menu', { error: error.message });
    }
  });
}
