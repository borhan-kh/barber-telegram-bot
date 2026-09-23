import { Markup } from 'telegraf';
import Service from '../models/Service.js';
import Barber from '../models/Barber.js';
import Appointment from '../models/Appointment.js';
import Config, { getOrCreateConfig } from '../models/Config.js';
import { 
  getNextThreeAvailableDays, 
  generateTimeSlots, 
  timeToMinutes, 
  areIntervalsOverlapping 
} from '../utils/date.js';
import { getTranslation } from '../utils/i18n.js';

export async function buildTimeSlotsKeyboard(ctx, dateString, isWalkin = false) {
  const config = ctx.wizard?.state?.config || await getOrCreateConfig();
  const lang = ctx.session?.lang || 'en';
  const t = getTranslation(lang);

  const barber = isWalkin ? (ctx.session?.walkin?.barberId ? { _id: ctx.session.walkin.barberId } : null) : ctx.wizard?.state?.barber;
  const service = isWalkin 
    ? (ctx.session?.walkin?.serviceId ? await Service.findById(ctx.session.walkin.serviceId) : null) 
    : ctx.wizard?.state?.service;
    
  const serviceDuration = service ? (service.duration || 30) : 30;
  const openingTime = config.opening_time || '10:00';
  const closingTime = config.closing_time || '20:00';
  const slotDuration = config.slot_duration || 30;

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

  const todayInfo = getNextThreeAvailableDays({ days_off: [], recurring_days_off: [] })[0];
  const isToday = todayInfo && dateString === todayInfo.dateString;
  let limitHour = -1;
  let limitMinute = -1;
  let isPastDay = false;

  if (isToday) {
    const now = new Date();
    const bufferDate = new Date(now.getTime() + 30 * 60 * 1000);
    const isSameDay = now.toLocaleDateString('en-US', { timeZone: 'Asia/Tehran' }) ===
                      bufferDate.toLocaleDateString('en-US', { timeZone: 'Asia/Tehran' });

    if (!isSameDay) {
      isPastDay = true;
    } else {
      const tehranTimeStr = bufferDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Tehran',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [h, m] = tehranTimeStr.split(':').map(Number);
      limitHour = h;
      limitMinute = m;
    }
  }

  const slotButtons = [];
  const actionPrefix = isWalkin ? 'admin_walkin_time:' : 'time:';
  const fullActionPrefix = isWalkin ? 'admin_walkin_slot_full:' : 'slot_full:';

  for (const time of allSlots) {
    let isAvailable = true;
    const slotStartMins = timeToMinutes(time);
    const proposedEndMins = slotStartMins + serviceDuration;

    if (proposedEndMins > closingMins) {
      isAvailable = false;
    }

    if (isAvailable && isToday) {
      if (isPastDay) {
        isAvailable = false;
      } else {
        const [slotHour, slotMinute] = time.split(':').map(Number);
        if (!(slotHour > limitHour || (slotHour === limitHour && slotMinute > limitMinute))) {
          isAvailable = false;
        }
      }
    }

    if (isAvailable) {
      if (barber) {
        const barberIdStr = barber._id.toString();
        const hasBarberConflict = bookedIntervals.some(inv => 
          inv.barberId === barberIdStr && areIntervalsOverlapping(slotStartMins, proposedEndMins, inv.start, inv.end)
        );

        if (hasBarberConflict) {
          isAvailable = false;
        }
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
      slotButtons.push(Markup.button.callback(time, `${actionPrefix}${time}`));
    } else {
      slotButtons.push(Markup.button.callback(t.wizard_slot_booked(time), `${fullActionPrefix}${time}`));
    }
  }

  const buttons = [];
  for (let i = 0; i < slotButtons.length; i += 2) {
    buttons.push(slotButtons.slice(i, i + 2));
  }

  if (isWalkin) {
    buttons.push([Markup.button.callback(t.btn_cancel, 'admin_appointments_menu')]);
  } else {
    buttons.push([
      Markup.button.callback(t.btn_back, 'back_to_date'),
      Markup.button.callback(t.btn_cancel, 'cancel_booking')
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

export async function hasIntervalConflict(date, time, serviceDuration, barberId = null) {
  const proposedStartMins = timeToMinutes(time);
  const proposedEndMins = proposedStartMins + serviceDuration;

  if (barberId) {
    const existingForBarber = await Appointment.find({
      barber: barberId,
      date: date,
      status: 'confirmed'
    }).populate('service');

    return existingForBarber.some(app => {
      const appStart = timeToMinutes(app.time);
      const appDur = app.service ? (app.service.duration || 30) : 30;
      return areIntervalsOverlapping(proposedStartMins, proposedEndMins, appStart, appStart + appDur);
    });
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
        return areIntervalsOverlapping(proposedStartMins, proposedEndMins, appStart, appStart + appDur);
      });
    });

    return !freeBarber;
  }
}
