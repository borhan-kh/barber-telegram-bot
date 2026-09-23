export const WEEKDAYS = {
  0: 'یکشنبه',
  1: 'دوشنبه',
  2: 'سه‌شنبه',
  3: 'چهارشنبه',
  4: 'پنجشنبه',
  5: 'جمعه',
  6: 'شنبه'
};

const MONTHS = [
  '',
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export function getJalaaliParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  const parts = formatter.formatToParts(date);
  const partsMap = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partsMap[part.type] = part.value;
    }
  }
  
  return {
    year: parseInt(partsMap.year),
    month: parseInt(partsMap.month),
    day: parseInt(partsMap.day)
  };
}

export function getJalaaliDateInfo(date) {
  const { year, month, day } = getJalaaliParts(date);
  const weekday = date.getDay();
  const weekdayName = WEEKDAYS[weekday];
  const monthName = MONTHS[month];
  
  const pad = (num) => String(num).padStart(2, '0');
  const dateString = `${year}-${pad(month)}-${pad(day)}`;
  const label = `${weekdayName} ${day} ${monthName}`;
  
  return {
    dateString,
    label
  };
}

export function getNextThreeDays() {
  const days = [];
  const today = new Date();
  
  for (let i = 0; i < 3; i++) {
    const nextDate = new Date();
    nextDate.setDate(today.getDate() + i);
    days.push(getJalaaliDateInfo(nextDate));
  }
  
  return days;
}

export function getNextThreeAvailableDays(config = { days_off: [], recurring_days_off: [] }) {
  const days = [];
  let checkedDate = new Date();
  
  const daysOff = config.days_off || [];
  const recurringDaysOff = config.recurring_days_off || [];

  for (let i = 0; i < 30 && days.length < 3; i++) {
    const info = getJalaaliDateInfo(checkedDate);
    const weekday = checkedDate.getDay();

    const isSpecificDayOff = daysOff.includes(info.dateString);
    const isRecurringDayOff = recurringDaysOff.includes(weekday);

    if (!isSpecificDayOff && !isRecurringDayOff) {
      days.push(info);
    }

    checkedDate.setDate(checkedDate.getDate() + 1);
  }

  return days;
}

export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(h)}:${pad(m)}`;
}

export function areIntervalsOverlapping(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

export function generateTimeSlots(openingTime = '10:00', closingTime = '20:00', slotDuration = 30) {
  const slots = [];
  const startMins = timeToMinutes(openingTime);
  const endMins = timeToMinutes(closingTime);
  const dur = Number(slotDuration) > 0 ? Number(slotDuration) : 30;

  for (let m = startMins; m + dur <= endMins; m += dur) {
    slots.push(minutesToTime(m));
  }

  return slots;
}
