import { Scenes, Markup } from 'telegraf';
import Service from '../models/Service.js';
import Barber from '../models/Barber.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Config, { getOrCreateConfig } from '../models/Config.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { getNextThreeAvailableDays, timeToMinutes } from '../utils/date.js';
import { buildTimeSlotsKeyboard, hasIntervalConflict } from '../services/appointmentService.js';
import { getTranslation } from '../utils/i18n.js';

export const bookingWizard = new Scenes.WizardScene(
  'BOOKING_WIZARD',
  
  async (ctx) => {
    try {
      const dbConfig = await getOrCreateConfig();
      ctx.wizard.state.config = dbConfig;

      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      const services = await Service.find({});
      if (services.length === 0) {
        await ctx.reply(t.services_empty);
        return ctx.scene.leave();
      }

      const buttons = services.map(service => [
        Markup.button.callback(`${service.name} (${service.price.toLocaleString()} ${t.service_price_unit} - ${service.duration} ${t.service_dur_unit})`, `service:${service._id}`)
      ]);
      buttons.push([Markup.button.callback(t.btn_cancel_booking, 'cancel_booking')]);

      await ctx.reply(t.wizard_step1_title, Markup.inlineKeyboard(buttons));
      return ctx.wizard.next();
    } catch (error) {
      logger.error('Error in booking wizard step 1', { error: error.message });
      await ctx.reply('Error processing booking request.');
      return ctx.scene.leave();
    }
  },

  async (ctx) => {
    try {
      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      if (!ctx.callbackQuery) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
          await ctx.reply(t.wizard_cancel_msg, Markup.removeKeyboard());
          return ctx.scene.leave();
        }
        await ctx.reply(t.wizard_step1_title);
        return;
      }

      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'cancel_booking') {
        await ctx.reply(t.wizard_cancel_msg);
        return ctx.scene.leave();
      }

      if (data.startsWith('service:')) {
        const serviceId = data.split(':')[1];
        const service = await Service.findById(serviceId);
        if (!service) {
          await ctx.reply('Service not found.');
          return ctx.scene.reenter();
        }

        ctx.wizard.state.service = service;
        const dbConfig = ctx.wizard.state.config;

        if (!dbConfig.barber_selection_enabled) {
          ctx.wizard.state.barber = null;

          const nextDays = getNextThreeAvailableDays(dbConfig);
          if (nextDays.length === 0) {
            await ctx.reply('No available dates.');
            return ctx.scene.leave();
          }

          const buttons = nextDays.map(day => [
            Markup.button.callback(day.label, `date:${day.dateString}`)
          ]);
          buttons.push([
            Markup.button.callback(t.btn_back, 'back_to_service'),
            Markup.button.callback(t.btn_cancel, 'cancel_booking')
          ]);

          await ctx.editMessageText(
            t.wizard_step3_title(service.name, service.duration, null),
            { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
          );

          ctx.wizard.selectStep(3);
          return;
        }

        const barbers = await Barber.find({});
        if (barbers.length === 0) {
          await ctx.reply('No barbers registered.');
          return ctx.scene.leave();
        }

        const buttons = barbers.map(barber => 
          Markup.button.callback(barber.name, `barber:${barber._id}`)
        );
        
        const keyboard = Markup.inlineKeyboard([
          ...buttons.map(btn => [btn]),
          [
            Markup.button.callback(t.btn_back, 'back_to_service'),
            Markup.button.callback(t.btn_cancel, 'cancel_booking')
          ]
        ]);

        await ctx.editMessageText(
          t.wizard_step2_title(service.name, service.duration),
          { parse_mode: 'HTML', ...keyboard }
        );

        return ctx.wizard.next();
      }
    } catch (error) {
      logger.error('Error in booking wizard step 2', { error: error.message });
      await ctx.reply('Error processing request.');
      return ctx.scene.leave();
    }
  },

  async (ctx) => {
    try {
      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      if (!ctx.callbackQuery) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
          await ctx.reply(t.wizard_cancel_msg, Markup.removeKeyboard());
          return ctx.scene.leave();
        }
        await ctx.reply('Please select a barber.');
        return;
      }

      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'cancel_booking') {
        await ctx.reply(t.wizard_cancel_msg);
        return ctx.scene.leave();
      }

      if (data === 'back_to_service') {
        const services = await Service.find({});
        const buttons = services.map(s => [
          Markup.button.callback(`${s.name} (${s.price.toLocaleString()} ${t.service_price_unit} - ${s.duration} ${t.service_dur_unit})`, `service:${s._id}`)
        ]);
        buttons.push([Markup.button.callback(t.btn_cancel_booking, 'cancel_booking')]);

        await ctx.editMessageText(t.wizard_step1_title, Markup.inlineKeyboard(buttons));
        ctx.wizard.selectStep(1);
        return;
      }

      if (data.startsWith('barber:')) {
        const barberId = data.split(':')[1];
        const barber = await Barber.findById(barberId);
        if (!barber) {
          await ctx.reply('Barber not found.');
          return ctx.scene.reenter();
        }

        ctx.wizard.state.barber = barber;

        const nextDays = getNextThreeAvailableDays(ctx.wizard.state.config);
        
        const buttons = nextDays.map(day => [
          Markup.button.callback(day.label, `date:${day.dateString}`)
        ]);
        buttons.push([
          Markup.button.callback(t.btn_back, 'back_to_barber'),
          Markup.button.callback(t.btn_cancel, 'cancel_booking')
        ]);

        const service = ctx.wizard.state.service;
        await ctx.editMessageText(
          t.wizard_step3_title(service.name, service.duration, barber.name),
          { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
        );

        return ctx.wizard.next();
      }
    } catch (error) {
      logger.error('Error in booking wizard step 3', { error: error.message });
      await ctx.reply('Error processing request.');
      return ctx.scene.leave();
    }
  },

  async (ctx) => {
    try {
      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      if (!ctx.callbackQuery) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
          await ctx.reply(t.wizard_cancel_msg, Markup.removeKeyboard());
          return ctx.scene.leave();
        }
        await ctx.reply('Please select a date.');
        return;
      }

      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'cancel_booking') {
        await ctx.reply(t.wizard_cancel_msg);
        return ctx.scene.leave();
      }

      if (data === 'back_to_barber') {
        const barbers = await Barber.find({});
        const buttons = barbers.map(b => Markup.button.callback(b.name, `barber:${b._id}`));
        const keyboard = Markup.inlineKeyboard([
          ...buttons.map(btn => [btn]),
          [
            Markup.button.callback(t.btn_back, 'back_to_service'),
            Markup.button.callback(t.btn_cancel, 'cancel_booking')
          ]
        ]);

        const service = ctx.wizard.state.service;
        await ctx.editMessageText(
          t.wizard_step2_title(service.name, service.duration),
          { parse_mode: 'HTML', ...keyboard }
        );
        ctx.wizard.selectStep(2);
        return;
      }

      if (data === 'back_to_service') {
        const services = await Service.find({});
        const buttons = services.map(s => [
          Markup.button.callback(`${s.name} (${s.price.toLocaleString()} ${t.service_price_unit} - ${s.duration} ${t.service_dur_unit})`, `service:${s._id}`)
        ]);
        buttons.push([Markup.button.callback(t.btn_cancel_booking, 'cancel_booking')]);

        await ctx.editMessageText(t.wizard_step1_title, Markup.inlineKeyboard(buttons));
        ctx.wizard.selectStep(1);
        return;
      }

      if (data.startsWith('date:')) {
        const dateString = data.split(':')[1];
        ctx.wizard.state.date = dateString;

        const dbConfig = ctx.wizard.state.config;
        const availableDays = getNextThreeAvailableDays(dbConfig);
        const selectedDay = availableDays.find(d => d.dateString === dateString);
        ctx.wizard.state.dateLabel = selectedDay ? selectedDay.label : dateString;

        const keyboard = await buildTimeSlotsKeyboard(ctx, dateString, false);

        const service = ctx.wizard.state.service;
        await ctx.editMessageText(
          t.wizard_step4_title(ctx.wizard.state.dateLabel, service.name, service.duration),
          { parse_mode: 'HTML', ...keyboard }
        );

        return ctx.wizard.next();
      }
    } catch (error) {
      logger.error('Error in booking wizard step 4', { error: error.message });
      await ctx.reply('Error calculating time slots.');
      return ctx.scene.leave();
    }
  },

  async (ctx) => {
    try {
      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      if (!ctx.callbackQuery) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
          await ctx.reply(t.wizard_cancel_msg, Markup.removeKeyboard());
          return ctx.scene.leave();
        }
        await ctx.reply('Please select a time slot.');
        return;
      }

      const data = ctx.callbackQuery.data;

      if (data === 'cancel_booking') {
        await ctx.answerCbQuery();
        await ctx.reply(t.wizard_cancel_msg);
        return ctx.scene.leave();
      }

      if (data === 'back_to_date') {
        await ctx.answerCbQuery();
        const dbConfig = ctx.wizard.state.config;
        const barber = ctx.wizard.state.barber;
        const nextDays = getNextThreeAvailableDays(dbConfig);
        
        const buttons = nextDays.map(day => [
          Markup.button.callback(day.label, `date:${day.dateString}`)
        ]);

        const backTarget = barber ? 'back_to_barber' : 'back_to_service';

        buttons.push([
          Markup.button.callback(t.btn_back, backTarget),
          Markup.button.callback(t.btn_cancel, 'cancel_booking')
        ]);

        const service = ctx.wizard.state.service;
        const titleText = t.wizard_step3_title(service.name, service.duration, barber ? barber.name : null);

        await ctx.editMessageText(titleText, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });

        ctx.wizard.selectStep(3);
        return;
      }

      if (data.startsWith('slot_full:')) {
        const fullTime = data.split(':')[1];
        await ctx.answerCbQuery(t.wizard_slot_full_alert(fullTime), { show_alert: true });
        return;
      }

      if (data.startsWith('time:')) {
        await ctx.answerCbQuery();
        const time = data.split(':')[1];
        ctx.wizard.state.time = time;

        const service = ctx.wizard.state.service;
        const startMins = timeToMinutes(time);
        const endMins = startMins + (service ? service.duration : 30);
        const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

        await ctx.reply(
          t.wizard_step5_title(time, endTimeStr),
          {
            parse_mode: 'HTML',
            ...Markup.keyboard([
              [Markup.button.contactRequest(t.btn_share_contact)],
              [t.btn_back_to_time, t.btn_cancel_booking]
            ]).oneTime().resize()
          }
        );

        return ctx.wizard.next();
      }
    } catch (error) {
      logger.error('Error in booking wizard step 5', { error: error.message });
      await ctx.reply('Error processing slot choice.');
      return ctx.scene.leave();
    }
  },

  async (ctx) => {
    try {
      const lang = ctx.session?.lang || 'en';
      const t = getTranslation(lang);

      if (ctx.message && ctx.message.text) {
        const text = ctx.message.text.trim();

        if (text === t.btn_cancel_booking || text === '❌ انصراف از نوبت‌دهی' || text === 'انصراف' || text === 'Cancel' || text.startsWith('/')) {
          await ctx.reply(t.wizard_cancel_msg, Markup.removeKeyboard());
          return ctx.scene.leave();
        }

        if (text === t.btn_back_to_time || text === '🔙 بازگشت به انتخاب ساعت' || text === 'بازگشت' || text === 'Back') {
          await ctx.reply(t.btn_back_to_time, Markup.removeKeyboard());
          const keyboard = await buildTimeSlotsKeyboard(ctx, ctx.wizard.state.date, false);

          const service = ctx.wizard.state.service;
          await ctx.reply(
            t.wizard_step4_title(ctx.wizard.state.dateLabel, service.name, service.duration),
            { parse_mode: 'HTML', ...keyboard }
          );

          ctx.wizard.selectStep(4);
          return;
        }
      }

      if (!ctx.message || !ctx.message.contact) {
        await ctx.reply(t.wizard_contact_prompt);
        return;
      }

      const contact = ctx.message.contact;
      const phoneNumber = contact.phone_number;
      const telegramId = ctx.from.id;
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || ctx.from.first_name || 'Customer';
      const date = ctx.wizard.state.date;
      const time = ctx.wizard.state.time;
      const service = ctx.wizard.state.service;
      const serviceDuration = service ? (service.duration || 30) : 30;

      let assignedBarber = ctx.wizard.state.barber;

      if (assignedBarber) {
        const conflict = await hasIntervalConflict(date, time, serviceDuration, assignedBarber._id);
        if (conflict) {
          await ctx.reply(
            t.wizard_conflict_error(time, ctx.wizard.state.dateLabel),
            Markup.removeKeyboard()
          );
          return ctx.scene.leave();
        }
      } else {
        const allBarbers = await Barber.find({});
        const allBookedForDate = await Appointment.find({
          date: date,
          status: 'confirmed'
        }).populate('service');

        const freeBarber = allBarbers.find(b => {
          const barberApps = allBookedForDate.filter(app => app.barber && app.barber.toString() === b._id.toString());
          return !barberApps.some(app => {
            const appStart = timeToMinutes(app.time);
            const appDur = app.service ? (app.service.duration || 30) : 30;
            const proposedStartMins = timeToMinutes(time);
            const proposedEndMins = proposedStartMins + serviceDuration;
            return appStart < proposedEndMins && proposedStartMins < (appStart + appDur);
          });
        });

        if (!freeBarber && allBarbers.length > 0) {
          await ctx.reply(
            t.wizard_conflict_error(time, ctx.wizard.state.dateLabel),
            Markup.removeKeyboard()
          );
          return ctx.scene.leave();
        }

        assignedBarber = freeBarber || allBarbers[0] || null;
        ctx.wizard.state.barber = assignedBarber;
      }

      let user = await User.findOne({ telegram_id: telegramId });
      if (!user) {
        user = new User({
          telegram_id: telegramId,
          full_name: fullName,
          phone_number: phoneNumber,
          language: lang
        });
        await user.save();
      } else {
        user.full_name = fullName;
        user.phone_number = phoneNumber;
        user.language = lang;
        await user.save();
      }

      const appointment = new Appointment({
        user: user._id,
        barber: assignedBarber ? assignedBarber._id : null,
        service: service._id,
        date: date,
        time: time,
        status: 'confirmed'
      });

      await appointment.save();

      await ctx.reply(t.wizard_confirming, Markup.removeKeyboard());

      const barberNameDisplay = assignedBarber ? assignedBarber.name : t.appt_barber_auto;
      const proposedStartMins = timeToMinutes(time);
      const proposedEndMins = proposedStartMins + serviceDuration;
      const endTimeStr = `${Math.floor(proposedEndMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
      const salonName = config.salon.name;

      const summaryText = t.wizard_success_invoice(
        salonName,
        service.name,
        serviceDuration,
        service.price,
        barberNameDisplay,
        ctx.wizard.state.dateLabel,
        time,
        endTimeStr,
        phoneNumber
      );

      await ctx.replyWithHTML(summaryText);

      const dbConfig = await getOrCreateConfig();
      const adminIds = new Set([...dbConfig.admin_ids]);
      if (config.adminId) adminIds.add(config.adminId);

      const adminNotice = `🔔 <b>New Booking Alert!</b>\n\n` +
        `👤 <b>Customer:</b> ${fullName}\n` +
        `📞 <b>Phone:</b> ${phoneNumber}\n` +
        `💇‍♂️ <b>Service:</b> ${service.name} (${serviceDuration} mins)\n` +
        `💈 <b>Barber:</b> ${barberNameDisplay}\n` +
        `📅 <b>Date:</b> ${ctx.wizard.state.dateLabel}\n` +
        `⏰ <b>Time:</b> ${time} - ${endTimeStr}`;

      for (const id of adminIds) {
        ctx.telegram.sendMessage(id, adminNotice, { parse_mode: 'HTML' }).catch(err => {
          logger.error('Failed to notify admin about new booking', { adminId: id, error: err.message });
        });
      }

      logger.info('New appointment confirmed successfully', {
        appointmentId: appointment._id,
        user: fullName,
        date,
        time
      });

      return ctx.scene.leave();
    } catch (error) {
      logger.error('Error in booking wizard step 6 (save)', { error: error.message });
      await ctx.reply('An error occurred during booking. Please try again.', Markup.removeKeyboard());
      return ctx.scene.leave();
    }
  }
);
