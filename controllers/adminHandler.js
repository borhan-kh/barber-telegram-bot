import { Markup } from 'telegraf';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Barber from '../models/Barber.js';
import Appointment from '../models/Appointment.js';
import Config, { getOrCreateConfig, isAdmin } from '../models/Config.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { 
  getJalaaliDateInfo, 
  getNextThreeAvailableDays, 
  generateTimeSlots, 
  timeToMinutes, 
  areIntervalsOverlapping, 
  WEEKDAYS 
} from '../utils/date.js';
import { sendTodayReminders } from '../utils/scheduler.js';
import { getUserLang } from './userHandler.js';
import { getTranslation } from '../utils/i18n.js';

export const getAdminMenuMarkup = (dbConfig, lang = 'en') => {
  const t = getTranslation(lang);

  return Markup.inlineKeyboard([
    [Markup.button.callback(t.admin_btn_today_report, 'admin_today_report')],
    [Markup.button.callback(t.admin_btn_hours, 'admin_hours_menu')],
    [Markup.button.callback(t.admin_btn_appointments, 'admin_appointments_menu')],
    [Markup.button.callback(t.admin_btn_toggle_barber(dbConfig.barber_selection_enabled), 'admin_toggle_barber_select')],
    [Markup.button.callback(t.admin_btn_services, 'admin_services_menu')],
    [Markup.button.callback(t.admin_btn_barbers, 'admin_barbers_menu')],
    [Markup.button.callback(t.admin_btn_holidays, 'admin_holidays_menu')],
    [Markup.button.callback(t.admin_btn_admins, 'admin_admins_menu')]
  ]);
};

export const getAdminRecurringDaysMarkup = (dbConfig, lang = 'en') => {
  const t = getTranslation(lang);
  const order = [6, 0, 1, 2, 3, 4, 5];
  const buttons = order.map(dayIndex => {
    const isOff = dbConfig.recurring_days_off.includes(dayIndex);
    const label = `${WEEKDAYS[dayIndex]}: ${isOff ? '🛑 OFF' : '✅ OPEN'}`;
    return [Markup.button.callback(label, `admin_toggle_recurring:${dayIndex}`)];
  });
  buttons.push([Markup.button.callback(t.admin_btn_back_holidays, 'admin_holidays_menu')]);
  return Markup.inlineKeyboard(buttons);
};

export function setupAdminHandlers(bot) {
  bot.command('admin', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) {
        await ctx.reply(t.admin_unauthorized);
        return;
      }

      const dbConfig = await getOrCreateConfig();
      await ctx.replyWithHTML(
        t.admin_panel_title(config.salon.name),
        getAdminMenuMarkup(dbConfig, lang)
      );
    } catch (error) {
      logger.error('Error entering admin panel via command', { error: error.message });
    }
  });

  bot.action('admin_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;
      ctx.session.walkin = null;

      const dbConfig = await getOrCreateConfig();
      await ctx.editMessageText(
        t.admin_panel_title(config.salon.name),
        { parse_mode: 'HTML', ...getAdminMenuMarkup(dbConfig, lang) }
      );
    } catch (error) {
      logger.error('Error opening admin menu', { error: error.message });
    }
  });

  bot.action('admin_today_report', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const todayInfo = getJalaaliDateInfo(new Date());
      const todayDateString = todayInfo.dateString;

      const todayAppointments = await Appointment.find({
        date: todayDateString,
        status: 'confirmed'
      })
        .populate('user')
        .populate('barber')
        .populate('service')
        .sort({ time: 1 });

      const buttons = [
        [Markup.button.callback(t.admin_btn_trigger_reminders, 'admin_send_reminders_now')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      if (todayAppointments.length === 0) {
        await ctx.replyWithHTML(
          t.admin_today_empty(todayInfo.label),
          Markup.inlineKeyboard(buttons)
        );
        return;
      }

      let adminReport = t.admin_today_report_header(todayInfo.label);
      todayAppointments.forEach((app, index) => {
        const userName = app.user ? app.user.full_name : 'Unknown';
        const userPhone = app.user ? app.user.phone_number : '-';
        const serviceName = app.service ? app.service.name : 'Service';
        const duration = app.service ? app.service.duration : 30;
        const barberName = app.barber ? app.barber.name : t.appt_barber_auto;

        const startMins = timeToMinutes(app.time);
        const endMins = startMins + duration;
        const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
        const remindedStatus = t.admin_remind_status(app.reminded);

        adminReport += `<b>${index + 1}. ⏰ ${app.time} - ${endTimeStr}</b> (${duration} ${t.service_dur_unit})\n` +
          `👤 <b>Customer:</b> ${userName}\n` +
          `📞 <b>Phone:</b> ${userPhone}\n` +
          `💇‍♂️ <b>Service:</b> ${serviceName}\n` +
          `💈 <b>Barber:</b> ${barberName}\n` +
          `🔔 <b>Reminder:</b> ${remindedStatus}\n` +
          `---------------------------\n`;
      });

      await ctx.replyWithHTML(adminReport, Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error fetching admin today report', { error: error.message });
    }
  });

  bot.action('admin_send_reminders_now', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery('Processing reminders...');
      const sentCount = await sendTodayReminders(bot);

      await ctx.reply(t.admin_remind_done(sentCount));
    } catch (error) {
      logger.error('Error in manual reminder trigger', { error: error.message });
      await ctx.reply('Error sending reminders.');
    }
  });

  bot.action('admin_hours_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;

      const dbConfig = await getOrCreateConfig();

      const text = t.admin_hours_title(dbConfig.opening_time, dbConfig.closing_time, dbConfig.slot_duration);

      const buttons = [
        [Markup.button.callback(t.admin_btn_edit_opening, 'admin_edit_opening_start')],
        [Markup.button.callback(t.admin_btn_edit_closing, 'admin_edit_closing_start')],
        [Markup.button.callback(t.admin_btn_edit_slot_dur, 'admin_edit_slot_dur_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error opening working hours menu', { error: error.message });
    }
  });

  bot.action('admin_edit_opening_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'edit_opening_time';
      await ctx.reply(t.admin_prompt_opening);
    } catch (error) {
      logger.error('Error starting opening time edit', { error: error.message });
    }
  });

  bot.action('admin_edit_closing_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'edit_closing_time';
      await ctx.reply(t.admin_prompt_closing);
    } catch (error) {
      logger.error('Error starting closing time edit', { error: error.message });
    }
  });

  bot.action('admin_edit_slot_dur_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const dbConfig = await getOrCreateConfig();

      const buttons = [
        [
          Markup.button.callback(`${dbConfig.slot_duration === 15 ? '✅ ' : ''}15 ${t.service_dur_unit}`, 'admin_set_slot_dur:15'),
          Markup.button.callback(`${dbConfig.slot_duration === 30 ? '✅ ' : ''}30 ${t.service_dur_unit}`, 'admin_set_slot_dur:30')
        ],
        [
          Markup.button.callback(`${dbConfig.slot_duration === 45 ? '✅ ' : ''}45 ${t.service_dur_unit}`, 'admin_set_slot_dur:45'),
          Markup.button.callback(`${dbConfig.slot_duration === 60 ? '✅ ' : ''}60 ${t.service_dur_unit}`, 'admin_set_slot_dur:60')
        ],
        [Markup.button.callback(t.admin_btn_back_hours, 'admin_hours_menu')]
      ];

      await ctx.editMessageText(
        t.admin_slot_dur_title(dbConfig.slot_duration),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (error) {
      logger.error('Error in slot duration menu', { error: error.message });
    }
  });

  bot.action(/^admin_set_slot_dur:(\d+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const dur = parseInt(ctx.match[1]);
      const dbConfig = await getOrCreateConfig();
      dbConfig.slot_duration = dur;
      await dbConfig.save();

      await ctx.answerCbQuery(t.admin_slot_dur_changed(dur), { show_alert: true });

      const text = t.admin_hours_title(dbConfig.opening_time, dbConfig.closing_time, dbConfig.slot_duration);

      const buttons = [
        [Markup.button.callback(t.admin_btn_edit_opening, 'admin_edit_opening_start')],
        [Markup.button.callback(t.admin_btn_edit_closing, 'admin_edit_closing_start')],
        [Markup.button.callback(t.admin_btn_edit_slot_dur, 'admin_edit_slot_dur_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error setting slot duration', { error: error.message });
    }
  });

  bot.action('admin_toggle_barber_select', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const dbConfig = await getOrCreateConfig();
      dbConfig.barber_selection_enabled = !dbConfig.barber_selection_enabled;
      await dbConfig.save();

      await ctx.answerCbQuery(
        t.admin_barber_toggle_alert(dbConfig.barber_selection_enabled),
        { show_alert: true }
      );

      await ctx.editMessageReplyMarkup(getAdminMenuMarkup(dbConfig, lang).reply_markup);
    } catch (error) {
      logger.error('Error toggling barber selection', { error: error.message });
    }
  });

  bot.action('admin_appointments_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;
      ctx.session.walkin = null;

      const buttons = [
        [Markup.button.callback(t.admin_btn_walkin, 'admin_walkin_service_menu')],
        [Markup.button.callback(t.admin_btn_list_appts, 'admin_list_all_appts')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(
        t.admin_appts_menu_title,
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (error) {
      logger.error('Error in appointments management menu', { error: error.message });
    }
  });

  bot.action('admin_walkin_service_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return;
      }

      ctx.session.walkin = {};

      const buttons = services.map(s => [
        Markup.button.callback(`${s.name} (${s.price.toLocaleString()} ${t.service_price_unit} - ${s.duration} ${t.service_dur_unit})`, `admin_walkin_svc:${s._id}`)
      ]);
      buttons.push([Markup.button.callback(t.btn_cancel, 'admin_appointments_menu')]);

      await ctx.editMessageText(t.admin_walkin_step1, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in walkin service menu', { error: error.message });
    }
  });

  bot.action(/^admin_walkin_svc:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const serviceId = ctx.match[1];
      const service = await Service.findById(serviceId);
      if (!service) return;

      ctx.session.walkin = { serviceId: service._id, serviceName: service.name, duration: service.duration || 30 };

      const barbers = await Barber.find({});
      const buttons = barbers.map(b => [
        Markup.button.callback(b.name, `admin_walkin_barber:${b._id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_walkin_any_barber, 'admin_walkin_barber:any')]);
      buttons.push([Markup.button.callback(t.btn_cancel, 'admin_appointments_menu')]);

      await ctx.editMessageText(t.admin_walkin_step2(service.name, service.duration), { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in walkin barber menu', { error: error.message });
    }
  });

  bot.action(/^admin_walkin_barber:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const barberIdStr = ctx.match[1];
      if (barberIdStr !== 'any') {
        const barber = await Barber.findById(barberIdStr);
        if (barber) {
          ctx.session.walkin.barberId = barber._id;
          ctx.session.walkin.barberName = barber.name;
        }
      } else {
        ctx.session.walkin.barberId = null;
        ctx.session.walkin.barberName = t.appt_barber_auto;
      }

      const dbConfig = await getOrCreateConfig();
      const nextDays = getNextThreeAvailableDays(dbConfig);

      const buttons = nextDays.map(day => [
        Markup.button.callback(day.label, `admin_walkin_date:${day.dateString}`)
      ]);
      buttons.push([Markup.button.callback(t.btn_cancel, 'admin_appointments_menu')]);

      await ctx.editMessageText(t.admin_walkin_step3, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in walkin date menu', { error: error.message });
    }
  });

  bot.action(/^admin_walkin_date:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const dateString = ctx.match[1];
      ctx.session.walkin.date = dateString;

      const dbConfig = await getOrCreateConfig();
      const availableDays = getNextThreeAvailableDays(dbConfig);
      const selectedDay = availableDays.find(d => d.dateString === dateString);
      ctx.session.walkin.dateLabel = selectedDay ? selectedDay.label : dateString;

      const barberId = ctx.session.walkin.barberId;
      const serviceDuration = ctx.session.walkin.duration || 30;

      const openingTime = dbConfig.opening_time || '10:00';
      const closingTime = dbConfig.closing_time || '20:00';
      const slotDuration = dbConfig.slot_duration || 30;

      const allSlots = generateTimeSlots(openingTime, closingTime, slotDuration);
      const closingMins = timeToMinutes(closingTime);

      const totalBarbersCount = await Barber.countDocuments({});
      const capacityLimit = totalBarbersCount > 0 ? totalBarbersCount : 1;

      const allBookedForDate = await Appointment.find({
        date: dateString,
        status: 'confirmed'
      }).populate('service');

      const bookedIntervals = allBookedForDate.map(app => {
        const appStart = timeToMinutes(app.time);
        const appDur = app.service ? (app.service.duration || 30) : 30;
        return {
          barberId: app.barber ? app.barber.toString() : null,
          start: appStart,
          end: appStart + appDur
        };
      });

      const slotButtons = [];
      for (const time of allSlots) {
        let isAvailable = true;
        const slotStartMins = timeToMinutes(time);
        const proposedEndMins = slotStartMins + serviceDuration;

        if (proposedEndMins > closingMins) {
          isAvailable = false;
        }

        if (isAvailable) {
          if (barberId) {
            const barberIdStr = barberId.toString();
            const hasBarberConflict = bookedIntervals.some(inv =>
              inv.barberId === barberIdStr && areIntervalsOverlapping(slotStartMins, proposedEndMins, inv.start, inv.end)
            );
            if (hasBarberConflict) isAvailable = false;
          } else {
            for (let sub = slotStartMins; sub < proposedEndMins; sub += slotDuration) {
              const countOccupied = bookedIntervals.filter(inv => areIntervalsOverlapping(sub, sub + slotDuration, inv.start, inv.end)).length;
              if (countOccupied >= capacityLimit) {
                isAvailable = false;
                break;
              }
            }
          }
        }

        if (isAvailable) {
          slotButtons.push(Markup.button.callback(time, `admin_walkin_time:${time}`));
        } else {
          slotButtons.push(Markup.button.callback(t.wizard_slot_booked(time), `admin_walkin_slot_full:${time}`));
        }
      }

      const buttons = [];
      for (let i = 0; i < slotButtons.length; i += 2) {
        buttons.push(slotButtons.slice(i, i + 2));
      }
      buttons.push([Markup.button.callback(t.btn_cancel, 'admin_appointments_menu')]);

      await ctx.editMessageText(
        t.admin_walkin_step4(ctx.session.walkin.dateLabel, ctx.session.walkin.serviceName, serviceDuration),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (error) {
      logger.error('Error in walkin time slots generation', { error: error.message });
    }
  });

  bot.action(/^admin_walkin_slot_full:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;
      const time = ctx.match[1];
      await ctx.answerCbQuery(t.wizard_slot_full_alert(time), { show_alert: true });
    } catch (error) {
      logger.error('Error on walkin full slot click', { error: error.message });
    }
  });

  bot.action(/^admin_walkin_time:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const time = ctx.match[1];
      ctx.session.walkin.time = time;
      ctx.session.adminAction = 'walkin_customer_info';

      await ctx.reply(t.admin_walkin_prompt_info(time), { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error in walkin time selection', { error: error.message });
    }
  });

  bot.action('admin_list_all_appts', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const appointments = await Appointment.find({ status: 'confirmed' })
        .populate('user')
        .populate('barber')
        .populate('service')
        .sort({ date: 1, time: 1 })
        .limit(20);

      if (appointments.length === 0) {
        await ctx.reply(t.no_active_appts);
        return;
      }

      await ctx.reply(t.admin_active_appts_header, { parse_mode: 'HTML' });

      for (const app of appointments) {
        const userName = app.user ? app.user.full_name : 'Walk-in Customer';
        const userPhone = app.user ? app.user.phone_number : '-';
        const serviceName = app.service ? app.service.name : 'Service';
        const duration = app.service ? app.service.duration : 30;
        const barberName = app.barber ? app.barber.name : t.appt_barber_auto;

        const startMins = timeToMinutes(app.time);
        const endMins = startMins + duration;
        const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

        const text = `👤 <b>Customer:</b> ${userName} (${userPhone})\n` +
          `💇‍♂️ <b>Service:</b> ${serviceName} (${duration} ${t.service_dur_unit})\n` +
          `💈 <b>Barber:</b> ${barberName}\n` +
          `📅 <b>Date:</b> ${app.date}\n` +
          `⏰ <b>Time:</b> ${app.time} - ${endTimeStr}`;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(t.admin_btn_cancel_appt_admin, `admin_cancel_appt:${app._id}`)]
        ]);

        await ctx.replyWithHTML(text, keyboard);
      }
    } catch (error) {
      logger.error('Error listing all active appointments', { error: error.message });
    }
  });

  bot.action(/^admin_cancel_appt:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const appointmentId = ctx.match[1];
      const appointment = await Appointment.findById(appointmentId).populate('user').populate('service');
      if (!appointment) {
        await ctx.answerCbQuery('Appointment not found.', { show_alert: true });
        return;
      }

      appointment.status = 'cancelled';
      await appointment.save();

      await ctx.answerCbQuery(t.appt_cancel_success, { show_alert: true });

      if (appointment.user && appointment.user.telegram_id) {
        const serviceName = appointment.service ? appointment.service.name : 'Service';
        const cancelNotice = `⚠️ <b>Your appointment has been cancelled by salon management.</b>\n\n` +
          `💇‍♂️ <b>Service:</b> ${serviceName}\n` +
          `📅 <b>Date:</b> ${appointment.date}\n` +
          `⏰ <b>Time:</b> ${appointment.time}`;
        ctx.telegram.sendMessage(appointment.user.telegram_id, cancelNotice, { parse_mode: 'HTML' }).catch(err => {
          logger.error('Failed to notify customer about appointment cancellation', { error: err.message });
        });
      }

      await ctx.editMessageText(
        `${t.admin_cancelled_by_admin}\n\n` +
        `📅 <b>Date:</b> ${appointment.date}\n` +
        `⏰ <b>Time:</b> ${appointment.time}`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      logger.error('Error cancelling appointment by admin', { error: error.message });
    }
  });

  bot.action('admin_admins_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;

      const dbConfig = await getOrCreateConfig();
      let text = t.admin_admins_menu_title;

      const envAdmin = config.adminId ? Number(config.adminId) : null;
      if (envAdmin) {
        text += `• <code>${envAdmin}</code> (Primary .env Admin)\n`;
      }

      dbConfig.admin_ids.forEach(id => {
        if (id !== envAdmin) {
          text += `• <code>${id}</code>\n`;
        }
      });

      const buttons = [
        [Markup.button.callback(t.admin_btn_add_admin, 'admin_add_admin_start')],
        [Markup.button.callback(t.admin_btn_del_admin, 'admin_del_admin_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in admin managers menu', { error: error.message });
    }
  });

  bot.action('admin_add_admin_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'add_admin_id';
      await ctx.reply(t.admin_prompt_add_admin);
    } catch (error) {
      logger.error('Error starting admin add prompt', { error: error.message });
    }
  });

  bot.action('admin_del_admin_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const dbConfig = await getOrCreateConfig();
      const envAdmin = config.adminId ? Number(config.adminId) : null;

      const removableAdmins = dbConfig.admin_ids.filter(id => id !== envAdmin);
      if (removableAdmins.length === 0) {
        await ctx.reply('No additional admins to delete.');
        return;
      }

      const buttons = removableAdmins.map(id => [
        Markup.button.callback(`🗑 Delete ${id}`, `admin_del_admin:${id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_admins, 'admin_admins_menu')]);

      await ctx.editMessageText('Please select an admin ID to remove:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in admin delete menu', { error: error.message });
    }
  });

  bot.action(/^admin_del_admin:(\d+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const targetId = parseInt(ctx.match[1]);
      const dbConfig = await getOrCreateConfig();

      dbConfig.admin_ids = dbConfig.admin_ids.filter(id => id !== targetId);
      await dbConfig.save();

      await ctx.answerCbQuery(`Admin ${targetId} removed successfully.`, { show_alert: true });

      const buttons = [
        [Markup.button.callback(t.admin_btn_add_admin, 'admin_add_admin_start')],
        [Markup.button.callback(t.admin_btn_del_admin, 'admin_del_admin_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];
      await ctx.editMessageText('Admin removed successfully.', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error deleting admin ID', { error: error.message });
    }
  });

  bot.action('admin_services_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;

      const services = await Service.find({});
      const text = t.admin_services_menu_title(services.length);

      const buttons = [
        [Markup.button.callback(t.admin_btn_add_service, 'admin_add_service_start')],
        [Markup.button.callback(t.admin_btn_rename_service, 'admin_rename_service_menu')],
        [Markup.button.callback(t.admin_btn_edit_price, 'admin_edit_price_menu')],
        [Markup.button.callback(t.admin_btn_del_service, 'admin_del_service_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in services menu', { error: error.message });
    }
  });

  bot.action('admin_add_service_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'add_service_name';
      await ctx.reply(t.admin_prompt_service_name);
    } catch (error) {
      logger.error('Error starting service add prompt', { error: error.message });
    }
  });

  bot.action('admin_rename_service_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return;
      }

      const buttons = services.map(s => [
        Markup.button.callback(`✏️ "${s.name}"`, `admin_rename_start:${s._id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]);

      await ctx.editMessageText('Select a service to rename:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in rename service menu', { error: error.message });
    }
  });

  bot.action(/^admin_rename_start:(.+)$/, async (ctx) => {
    try {
      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const serviceId = ctx.match[1];
      const service = await Service.findById(serviceId);
      if (!service) {
        await ctx.reply('Service not found.');
        return;
      }

      ctx.session.adminAction = `rename_service:${serviceId}`;
      await ctx.reply(`Current name: "${service.name}"\nPlease enter the new name:`);
    } catch (error) {
      logger.error('Error starting service rename', { error: error.message });
    }
  });

  bot.action('admin_del_service_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return;
      }

      const buttons = services.map(s => [
        Markup.button.callback(`🗑 "${s.name}"`, `admin_del_service:${s._id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]);

      await ctx.editMessageText('Select a service to delete:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in service delete menu', { error: error.message });
    }
  });

  bot.action(/^admin_del_service:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const serviceId = ctx.match[1];
      await Service.findByIdAndDelete(serviceId);
      await ctx.answerCbQuery('Service deleted successfully.', { show_alert: true });
      
      const services = await Service.find({});
      const buttons = [
        [Markup.button.callback(t.admin_btn_add_service, 'admin_add_service_start')],
        [Markup.button.callback(t.admin_btn_rename_service, 'admin_rename_service_menu')],
        [Markup.button.callback(t.admin_btn_edit_price, 'admin_edit_price_menu')],
        [Markup.button.callback(t.admin_btn_del_service, 'admin_del_service_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];
      await ctx.editMessageText(`Service deleted. Total active services: ${services.length}`, Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error deleting service', { error: error.message });
    }
  });

  bot.action('admin_edit_price_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return;
      }

      const buttons = services.map(s => [
        Markup.button.callback(`💰 "${s.name}" (${s.price.toLocaleString()} ${t.service_price_unit})`, `admin_edit_price_start:${s._id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]);

      await ctx.editMessageText('Select a service to edit price:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in edit price menu', { error: error.message });
    }
  });

  bot.action(/^admin_edit_price_start:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const serviceId = ctx.match[1];
      const service = await Service.findById(serviceId);
      if (!service) {
        await ctx.reply('Service not found.');
        return;
      }

      ctx.session.adminAction = `edit_price:${serviceId}`;
      await ctx.reply(`Current price for "${service.name}": ${service.price.toLocaleString()} ${t.service_price_unit}.\nPlease enter the new price:`);
    } catch (error) {
      logger.error('Error starting price edit', { error: error.message });
    }
  });

  bot.action('admin_barbers_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;

      const barbers = await Barber.find({});
      let barbersText = '';
      barbers.forEach((b, i) => {
        barbersText += `${i + 1}. <b>${b.name}</b>\n`;
      });

      const buttons = [
        [Markup.button.callback(t.admin_btn_add_barber, 'admin_add_barber_start')],
        [Markup.button.callback(t.admin_btn_del_barber, 'admin_del_barber_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(t.admin_barbers_menu_title(barbersText), { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (error) {
      logger.error('Error in barbers menu', { error: error.message });
    }
  });

  bot.action('admin_add_barber_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'add_barber';
      await ctx.reply(t.admin_prompt_add_barber);
    } catch (error) {
      logger.error('Error starting barber add prompt', { error: error.message });
    }
  });

  bot.action('admin_del_barber_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const barbers = await Barber.find({});
      if (barbers.length === 0) {
        await ctx.reply('No barbers registered.');
        return;
      }

      const buttons = barbers.map(b => [
        Markup.button.callback(`🗑 "${b.name}"`, `admin_del_barber:${b._id}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_barbers, 'admin_barbers_menu')]);

      await ctx.editMessageText('Select a barber to delete:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in barber delete menu', { error: error.message });
    }
  });

  bot.action(/^admin_del_barber:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const barberId = ctx.match[1];
      await Barber.findByIdAndDelete(barberId);
      await ctx.answerCbQuery('Barber deleted successfully.', { show_alert: true });

      const barbers = await Barber.find({});
      const buttons = [
        [Markup.button.callback(t.admin_btn_add_barber, 'admin_add_barber_start')],
        [Markup.button.callback(t.admin_btn_del_barber, 'admin_del_barber_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];
      await ctx.editMessageText(`Barber deleted. Total active barbers: ${barbers.length}`, Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error deleting barber', { error: error.message });
    }
  });

  bot.action('admin_holidays_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = null;

      const dbConfig = await getOrCreateConfig();

      const specialDaysText = dbConfig.days_off.length > 0 ? dbConfig.days_off.join(', ') : 'None';
      const recurringNames = dbConfig.recurring_days_off.map(d => WEEKDAYS[d]).join(', ');
      const recurringDaysText = dbConfig.recurring_days_off.length > 0 ? recurringNames : 'None';

      const buttons = [
        [Markup.button.callback(t.admin_btn_recurring_days, 'admin_recurring_menu')],
        [Markup.button.callback(t.admin_btn_add_day_off, 'admin_add_day_off_start')],
        [Markup.button.callback(t.admin_btn_del_day_off, 'admin_del_day_off_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(
        t.admin_holidays_menu_title(specialDaysText, recurringDaysText),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (error) {
      logger.error('Error in holidays menu', { error: error.message });
    }
  });

  bot.action('admin_recurring_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const dbConfig = await getOrCreateConfig();

      await ctx.editMessageText(
        t.admin_recurring_menu_title,
        { parse_mode: 'HTML', ...getAdminRecurringDaysMarkup(dbConfig, lang) }
      );
    } catch (error) {
      logger.error('Error in recurring holidays menu', { error: error.message });
    }
  });

  bot.action(/^admin_toggle_recurring:(\d+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const dayIndex = parseInt(ctx.match[1]);
      const dbConfig = await getOrCreateConfig();

      const idx = dbConfig.recurring_days_off.indexOf(dayIndex);
      if (idx > -1) {
        dbConfig.recurring_days_off.splice(idx, 1);
      } else {
        dbConfig.recurring_days_off.push(dayIndex);
      }

      await dbConfig.save();
      await ctx.answerCbQuery(`Status for ${WEEKDAYS[dayIndex]} updated.`, { show_alert: false });

      await ctx.editMessageReplyMarkup(getAdminRecurringDaysMarkup(dbConfig, lang).reply_markup);
    } catch (error) {
      logger.error('Error toggling recurring holiday', { error: error.message });
    }
  });

  bot.action('admin_add_day_off_start', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      ctx.session.adminAction = 'add_day_off';
      await ctx.reply(t.admin_prompt_add_day_off);
    } catch (error) {
      logger.error('Error starting add day off prompt', { error: error.message });
    }
  });

  bot.action('admin_del_day_off_menu', async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      await ctx.answerCbQuery();
      const dbConfig = await getOrCreateConfig();
      if (dbConfig.days_off.length === 0) {
        await ctx.reply('No specific holidays registered.');
        return;
      }

      const buttons = dbConfig.days_off.map(date => [
        Markup.button.callback(`🗑 Delete ${date}`, `admin_del_day_off:${date}`)
      ]);
      buttons.push([Markup.button.callback(t.admin_btn_back_holidays, 'admin_holidays_menu')]);

      await ctx.editMessageText('Select a date to remove from holidays:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('Error in delete day off menu', { error: error.message });
    }
  });

  bot.action(/^admin_del_day_off:(.+)$/, async (ctx) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const authorized = await isAdmin(ctx.from.id);
      if (!authorized) return;

      const dateStr = ctx.match[1];
      const dbConfig = await getOrCreateConfig();

      dbConfig.days_off = dbConfig.days_off.filter(d => d !== dateStr);
      await dbConfig.save();

      await ctx.answerCbQuery(`Date ${dateStr} deleted from holidays.`, { show_alert: true });

      const specialDaysText = dbConfig.days_off.length > 0 ? dbConfig.days_off.join(', ') : 'None';
      const recurringNames = dbConfig.recurring_days_off.map(d => WEEKDAYS[d]).join(', ');
      const recurringDaysText = dbConfig.recurring_days_off.length > 0 ? recurringNames : 'None';

      const buttons = [
        [Markup.button.callback(t.admin_btn_recurring_days, 'admin_recurring_menu')],
        [Markup.button.callback(t.admin_btn_add_day_off, 'admin_add_day_off_start')],
        [Markup.button.callback(t.admin_btn_del_day_off, 'admin_del_day_off_menu')],
        [Markup.button.callback(t.admin_btn_back, 'admin_menu')]
      ];

      await ctx.editMessageText(
        t.admin_holidays_menu_title(specialDaysText, recurringDaysText),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (error) {
      logger.error('Error deleting day off date', { error: error.message });
    }
  });

  bot.on('text', async (ctx, next) => {
    try {
      const lang = await getUserLang(ctx);
      const t = getTranslation(lang);

      const userId = ctx.from.id;
      const authorized = await isAdmin(userId);

      if (authorized && ctx.session?.adminAction) {
        const action = ctx.session.adminAction;
        const text = ctx.message.text.trim();

        if (text === '/cancel' || text === '/admin') {
          ctx.session.adminAction = null;
          ctx.session.newService = null;
          ctx.session.walkin = null;
          await ctx.reply(t.admin_op_cancelled);
          return;
        }

        if (action === 'edit_opening_time') {
          if (!/^\d{2}:\d{2}$/.test(text)) {
            await ctx.reply('Invalid time format. Please enter in HH:MM format (e.g. 09:00):');
            return;
          }
          ctx.session.adminAction = null;
          const dbConfig = await getOrCreateConfig();
          dbConfig.opening_time = text;
          await dbConfig.save();

          await ctx.reply(
            `🌅 Opening time changed to <code>${text}</code>.`,
            { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_hours, 'admin_hours_menu')]]) }
          );
          return;
        }

        if (action === 'edit_closing_time') {
          if (!/^\d{2}:\d{2}$/.test(text)) {
            await ctx.reply('Invalid time format. Please enter in HH:MM format (e.g. 21:30):');
            return;
          }
          ctx.session.adminAction = null;
          const dbConfig = await getOrCreateConfig();
          dbConfig.closing_time = text;
          await dbConfig.save();

          await ctx.reply(
            `🌇 Closing time changed to <code>${text}</code>.`,
            { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_hours, 'admin_hours_menu')]]) }
          );
          return;
        }

        if (action === 'walkin_customer_info') {
          ctx.session.adminAction = null;
          const walkinData = ctx.session.walkin;

          if (!walkinData || !walkinData.serviceId || !walkinData.date || !walkinData.time) {
            await ctx.reply('Incomplete walk-in appointment data.');
            return;
          }

          const parts = text.split('-').map(p => p.trim());
          const customerName = parts[0] || 'Walk-in Customer';
          const customerPhone = parts[1] || 'Walk-in';

          let user = await User.findOne({ phone_number: customerPhone });
          if (!user) {
            user = new User({
              telegram_id: Math.floor(Math.random() * 1000000000),
              full_name: customerName,
              phone_number: customerPhone,
              language: lang
            });
            await user.save();
          }

          let assignedBarberId = walkinData.barberId;
          const serviceDuration = walkinData.duration || 30;
          const proposedStartMins = timeToMinutes(walkinData.time);
          const proposedEndMins = proposedStartMins + serviceDuration;

          if (!assignedBarberId) {
            const allBarbers = await Barber.find({});
            const allBookedForDate = await Appointment.find({
              date: walkinData.date,
              status: 'confirmed'
            }).populate('service');

            const freeBarber = allBarbers.find(b => {
              const barberApps = allBookedForDate.filter(app => app.barber && app.barber.toString() === b._id.toString());
              const barberConflict = barberApps.some(app => {
                const appStart = timeToMinutes(app.time);
                const appDur = app.service ? (app.service.duration || 30) : 30;
                return areIntervalsOverlapping(proposedStartMins, proposedEndMins, appStart, appStart + appDur);
              });
              return !barberConflict;
            });

            assignedBarberId = freeBarber ? freeBarber._id : (allBarbers[0] ? allBarbers[0]._id : null);
          }

          const existingConflict = await Appointment.find({
            barber: assignedBarberId,
            date: walkinData.date,
            status: 'confirmed'
          }).populate('service');

          const hasConflict = existingConflict.some(app => {
            const appStart = timeToMinutes(app.time);
            const appDur = app.service ? (app.service.duration || 30) : 30;
            return areIntervalsOverlapping(proposedStartMins, proposedEndMins, appStart, appStart + appDur);
          });

          if (hasConflict) {
            await ctx.reply(`❌ Conflict: Slot at ${walkinData.time} on ${walkinData.date} is already booked!`);
            ctx.session.walkin = null;
            return;
          }

          const appointment = new Appointment({
            user: user._id,
            barber: assignedBarberId,
            service: walkinData.serviceId,
            date: walkinData.date,
            time: walkinData.time,
            status: 'confirmed'
          });

          await appointment.save();
          ctx.session.walkin = null;

          const endMins = proposedEndMins;
          const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

          await ctx.reply(
            t.admin_walkin_success(customerName, customerPhone, walkinData.serviceName, serviceDuration, walkinData.dateLabel, walkinData.time, endTimeStr),
            { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_appts, 'admin_appointments_menu')]]) }
          );
          return;
        }

        if (action.startsWith('rename_service:')) {
          const serviceId = action.split(':')[1];
          ctx.session.adminAction = null;
          const service = await Service.findByIdAndUpdate(serviceId, { name: text }, { new: true });
          await ctx.reply(
            `✏️ Service name updated to "${service ? service.name : text}".`,
            Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]])
          );
          return;
        }

        if (action === 'add_admin_id') {
          const newAdminId = parseInt(text);
          if (isNaN(newAdminId) || newAdminId <= 0) {
            await ctx.reply('Please enter a valid numeric Telegram ID:');
            return;
          }

          ctx.session.adminAction = null;
          const dbConfig = await getOrCreateConfig();
          if (!dbConfig.admin_ids.includes(newAdminId)) {
            dbConfig.admin_ids.push(newAdminId);
            await dbConfig.save();
          }

          await ctx.reply(
            t.admin_add_admin_success(newAdminId),
            { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_admins, 'admin_admins_menu')]]) }
          );
          return;
        }

        if (action === 'add_barber') {
          ctx.session.adminAction = null;
          await Barber.create({ name: text });
          await ctx.reply(
            t.admin_add_barber_success(text),
            Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_barbers, 'admin_barbers_menu')]])
          );
          return;
        }

        if (action === 'add_service_name') {
          ctx.session.newService = { name: text };
          ctx.session.adminAction = 'add_service_price';
          await ctx.reply(t.admin_prompt_service_price(text));
          return;
        }

        if (action === 'add_service_price') {
          const price = parseInt(text);
          if (isNaN(price) || price <= 0) {
            await ctx.reply('Please enter a valid numeric price:');
            return;
          }
          ctx.session.newService.price = price;
          ctx.session.adminAction = 'add_service_duration';
          await ctx.reply(t.admin_prompt_service_dur(price));
          return;
        }

        if (action === 'add_service_duration') {
          const duration = parseInt(text);
          if (isNaN(duration) || duration <= 0) {
            await ctx.reply('Please enter a valid numeric duration (minutes):');
            return;
          }
          ctx.session.newService.duration = duration;
          await Service.create(ctx.session.newService);
          const serviceName = ctx.session.newService.name;
          ctx.session.newService = null;
          ctx.session.adminAction = null;

          await ctx.reply(
            t.admin_add_service_success(serviceName),
            Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]])
          );
          return;
        }

        if (action.startsWith('edit_price:')) {
          const serviceId = action.split(':')[1];
          const price = parseInt(text);
          if (isNaN(price) || price <= 0) {
            await ctx.reply('Please enter a valid numeric price:');
            return;
          }
          ctx.session.adminAction = null;
          const service = await Service.findByIdAndUpdate(serviceId, { price }, { new: true });
          await ctx.reply(
            `💰 New price for "${service ? service.name : 'Service'}": ${price.toLocaleString()} ${t.service_price_unit}.`,
            Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_services, 'admin_services_menu')]])
          );
          return;
        }

        if (action === 'add_day_off') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            await ctx.reply('Invalid date format. Please use YYYY-MM-DD (e.g. 1405-05-15):');
            return;
          }
          ctx.session.adminAction = null;
          const dbConfig = await getOrCreateConfig();
          if (!dbConfig.days_off.includes(text)) {
            dbConfig.days_off.push(text);
            await dbConfig.save();
          }
          await ctx.reply(
            t.admin_add_day_off_success(text),
            Markup.inlineKeyboard([[Markup.button.callback(t.admin_btn_back_holidays, 'admin_holidays_menu')]])
          );
          return;
        }
      }
    } catch (error) {
      logger.error('Error handling admin text input', { error: error.message });
    }

    return next();
  });
}
