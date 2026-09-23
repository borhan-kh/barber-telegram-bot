const translations = {
  fa: {
    welcome: (salonName) => `💈 <b>به سالن زیبایی "${salonName}" خوش آمدید!</b> 💇‍♂️\n\nما بهترین خدمات پیرایش و مراقبت از پوست و مو را به شما ارائه می‌دهیم.\n\nلطفاً یکی از گزینه‌های زیر را برای شروع انتخاب کنید:`,
    btn_book: '📅 رزرو نوبت جدید',
    btn_my_appts: '📋 نوبت‌های من',
    btn_services: '💇‍♂️ خدمات و قیمت‌ها',
    btn_contact: '📞 تماس با ما',
    btn_lang_toggle: '🇺🇸 English',
    btn_back_to_menu: '🏠 بازگشت به منوی اصلی',
    btn_back: '🔙 بازگشت',
    btn_cancel: '❌ انصراف',
    btn_cancel_appt: '❌ لغو این نوبت',
    btn_share_contact: '📱 اشتراک‌گذاری شماره همراه',
    btn_back_to_time: '🔙 بازگشت به انتخاب ساعت',
    btn_cancel_booking: '❌ انصراف از نوبت‌دهی',

    services_title: (salonName) => `💇‍♂️ <b>لیست خدمات و تعرفه‌های سالن "${salonName}":</b>\n\n`,
    services_empty: 'در حال حاضر خدماتی در سیستم ثبت نشده است.',
    service_price_unit: 'تومان',
    service_dur_unit: 'دقیقه',

    contact_info: (salonName, address, phone, openTime, closeTime) => 
      `📞 <b>راه‌های ارتباطی با سالن زیبایی "${salonName}":</b>\n\n` +
      `📍 <b>آدرس:</b> ${address}\n` +
      `☎️ <b>تلفن تماس:</b> ${phone}\n\n` +
      `⏰ <b>ساعت کاری سالن:</b>\n` +
      `از ساعت ${openTime} الی ${closeTime}\n\n` +
      `<i>منتظر حضور شما در سالن هستیم! 🌹</i>`,

    no_user_found: 'شما هنوز هیچ نوبتی در سیستم ثبت نکرده‌اید.',
    no_active_appts: 'شما در حال حاضر هیچ نوبت فعالی در سیستم ندارید.',
    active_appts_title: '📋 <b>لیست نوبت‌های فعال شما:</b>',
    appt_barber_auto: 'تخصیص توسط سالن',
    appt_cancelled_msg: '❌ <b>این نوبت لغو شده است:</b>\n\nنوبت با موفقیت در سیستم سالن آزاد شد.',
    appt_cancel_success: 'نوبت شما با موفقیت لغو شد.',

    wizard_step1_title: '💇‍♂️ لطفاً خدمت مورد نظر خود را انتخاب کنید:',
    wizard_step2_title: (serviceName, duration) => `انتخاب شما: <b>${serviceName} (${duration} دقیقه)</b>\n\n👤 لطفاً آرایشگر مورد نظر خود را انتخاب کنید:`,
    wizard_step3_title: (serviceName, duration, barberName) => 
      barberName 
        ? `آرایشگر انتخابی شما: <b>${barberName}</b>\n\n📅 لطفاً تاریخ نوبت خود را انتخاب کنید:`
        : `انتخاب شما: <b>${serviceName} (${duration} دقیقه)</b>\n\n📅 لطفاً تاریخ نوبت خود را انتخاب کنید:`,
    wizard_step4_title: (dateLabel, serviceName, duration) =>
      `تاریخ انتخابی: <b>${dateLabel}</b>\n` +
      `خدمت انتخابی: <b>${serviceName}</b> (مدت زمان: <b>${duration} دقیقه</b>)\n\n` +
      `⏰ لطفاً یکی از ساعت‌های شروع خالی زیر را انتخاب کنید:`,
    wizard_step5_title: (time, endTimeStr) =>
      `ساعت شروع انتخاب شده: <b>${time}</b> (پایان: <b>${endTimeStr}</b>)\n\n📱 جهت نهایی‌سازی نوبت خود، لطفاً دکمه زیر را لمس کرده و شماره تلفن خود را به اشتراک بگذارید:`,

    wizard_slot_booked: (time) => `❌ ${time} (رزرو شده)`,
    wizard_slot_full_alert: (time) => `سانس ساعت ${time} یا بازه زمان مورد نیاز آن قبلاً رزرو شده است. ❌`,
    wizard_cancel_msg: 'عملیات نوبت‌دهی لغو شد. ❌',
    wizard_contact_prompt: 'لطفاً برای ثبت نوبت حتماً دکمه "📱 اشتراک‌گذاری شماره همراه" را لمس کنید.',
    wizard_confirming: 'تایید شماره همراه انجام شد. در حال صدور فاکتور...',
    wizard_success_invoice: (salonName, serviceName, duration, price, barberName, dateLabel, time, endTimeStr, phone) =>
      `<b>🎉 نوبت شما با موفقیت در سالن "${salonName}" ثبت شد!</b>\n\n` +
      `📌 <b>جزئیات نوبت شما:</b>\n` +
      `💇‍♂️ <b>خدمت:</b> ${serviceName} (${duration} دقیقه)\n` +
      `💰 <b>هزینه:</b> ${price.toLocaleString()} تومان\n` +
      `👤 <b>آرایشگر:</b> ${barberName}\n` +
      `📅 <b>تاریخ:</b> ${dateLabel}\n` +
      `⏰ <b>ساعت:</b> ${time} تا ${endTimeStr}\n` +
      `📱 <b>شماره همراه:</b> ${phone}\n\n` +
      `<i>منتظر حضور گرم شما هستیم! ❤️</i>`,
    wizard_conflict_error: (time, dateLabel) => `❌ متاسفانه بازه زمانی ساعت ${time} در تاریخ ${dateLabel} لحظاتی پیش رزرو شد. لطفاً ساعت دیگری را انتخاب نمایید.`,

    lang_changed: 'زبان برنامه به فارسی تغییر یافت. 🇮🇷',

    admin_unauthorized: 'شما دسترسی لازم برای اجرای این دستور را ندارید. ⛔',
    admin_panel_title: (salonName) => `👑 <b>پنل مدیریت سالن زیبایی "${salonName}":</b>\n\nلطفاً بخش مورد نظر را انتخاب کنید:`,
    admin_btn_today_report: '📊 گزارش نوبت‌های امروز',
    admin_btn_hours: '⏰ ساعت کاری و طول سانس‌ها',
    admin_btn_appointments: '📅 مدیریت نوبت‌ها (حضوری و آنلاین)',
    admin_btn_toggle_barber: (enabled) => enabled ? '👤 انتخاب آرایشگر: ✅ فعال' : '👤 انتخاب آرایشگر: ❌ غیرفعال (تخصیص خودکار)',
    admin_btn_services: '💇‍♂️ مدیریت خدمات سالن',
    admin_btn_barbers: '💈 مدیریت آرایشگران',
    admin_btn_holidays: '📅 مدیریت تعطیلات سالن',
    admin_btn_admins: '👥 مدیریت مدیران (ادمین‌ها)',
    admin_btn_back: '🔙 بازگشت به پنل ادمین',
    admin_btn_trigger_reminders: '🔔 ارسال دستی یادآوری‌های امروز',
    admin_today_empty: (dateLabel) => `📅 <b>نوبت‌های امروز (${dateLabel}):</b>\n\nامروز هیچ نوبتی ثبت نشده است.`,
    admin_today_report_header: (dateLabel) => `📅 <b>لیست نوبت‌های امروز (${dateLabel}):</b>\n\n`,
    admin_remind_status: (reminded) => reminded ? '✅ ارسال شده' : '⏳ ارسال نشده',
    admin_remind_done: (count) => `✅ فرایند ارسال یادآوری پایان یافت. تعداد ${count} یادآوری با موفقیت به مشتریان ارسال گردید.`,
    admin_hours_title: (openTime, closingTime, duration) => 
      `⏰ <b>تنظیمات ساعت کاری و طول سانس‌های سالن:</b>\n\n` +
      `🌅 <b>ساعت شروع کار:</b> <code>${openTime}</code>\n` +
      `🌇 <b>ساعت پایان کار:</b> <code>${closingTime}</code>\n` +
      `⏱ <b>مدت زمان هر سانس:</b> <code>${duration} دقیقه</code>\n\n` +
      `جهت ویرایش هر قسمت دکمه مربوطه را انتخاب کنید:`,
    admin_btn_edit_opening: '🌅 تغییر ساعت شروع کار',
    admin_btn_edit_closing: '🌇 تغییر ساعت پایان کار',
    admin_btn_edit_slot_dur: '⏱ تغییر طول هر سانس (۱۵ / ۳۰ / ۴۵ / ۶۰ دقیقه)',
    admin_prompt_opening: '🌅 لطفاً ساعت شروع کار جدید سالن را به فرمت HH:MM وارد کنید (مثال: 09:00):',
    admin_prompt_closing: '🌇 لطفاً ساعت پایان کار جدید سالن را به فرمت HH:MM وارد کنید (مثال: 21:30):',
    admin_slot_dur_title: (dur) => `⏱ <b>انتخاب مدت زمان هر سانس کاری:</b>\n\nمدت زمان فعلی: <b>${dur} دقیقه</b>`,
    admin_btn_back_hours: '🔙 بازگشت به ساعت کاری',
    admin_slot_dur_changed: (dur) => `طول سانس کاری به ${dur} دقیقه تغییر یافت.`,
    admin_barber_toggle_alert: (enabled) => `انتخاب آرایشگر ${enabled ? 'فعال' : 'غیرفعال'} شد.`,
    admin_appts_menu_title: '📅 <b>مدیریت نوبت‌های سالن (حضوری و آنلاین):</b>\n\nجهت ثبت نوبت حضوری یا مشاهده/لغو نوبت‌ها انتخاب کنید:',
    admin_btn_walkin: '➕ ثبت نوبت حضوری جدید (مشتری سالن)',
    admin_btn_list_appts: '📋 لیست و لغو نوبت‌های ثبت شده',
    admin_walkin_step1: '➕ <b>ثبت نوبت حضوری - گام ۱/۴:</b>\n\nلطفاً خدمت مورد نظر را انتخاب کنید:',
    admin_walkin_step2: (name, dur) => `خدمت انتخابی: <b>${name} (${dur} دقیقه)</b>\n\n<b>گام ۲/۴:</b> آرایشگر را انتخاب کنید:`,
    admin_walkin_any_barber: '🎲 هر آرایشگر آزاد',
    admin_walkin_step3: '<b>گام ۳/۴:</b> لطفاً تاریخ نوبت حضوری را انتخاب کنید:',
    admin_walkin_step4: (dateLabel, name, dur) => `تاریخ: <b>${dateLabel}</b> (خدمت: <b>${name}</b> - ${dur} دقیقه)\n\n<b>گام ۴/۴:</b> ساعت شروع را برای ثبت حضوری انتخاب کنید:`,
    admin_walkin_prompt_info: (time) => `ساعت انتخاب شده: <b>${time}</b>\n\nلطفاً نام مشتری و شماره تماس وی را وارد کنید (مثال: علی محمدی - 09121234567):`,
    admin_walkin_success: (name, phone, serviceName, dur, dateLabel, time, endTimeStr) =>
      `✅ <b>نوبت حضوری با موفقیت در سیستم ثبت گردید!</b>\n\n` +
      `👤 <b>مشتری:</b> ${name} (${phone})\n` +
      `💇‍♂️ <b>خدمت:</b> ${serviceName} (${dur} دقیقه)\n` +
      `📅 <b>تاریخ:</b> ${dateLabel}\n` +
      `⏰ <b>ساعت:</b> ${time} تا ${endTimeStr}`,
    admin_btn_back_appts: '🔙 بازگشت به مدیریت نوبت‌ها',
    admin_active_appts_header: '📋 <b>لیست ۲۰ نوبت فعال آینده:</b>',
    admin_btn_cancel_appt_admin: '❌ لغو این نوبت (توسط ادمین)',
    admin_cancelled_by_admin: '❌ <b>این نوبت توسط ادمین لغو گردید:</b>',
    admin_admins_menu_title: '👥 <b>مدیریت مدیران سالن (ادمین‌ها):</b>\n\nلیست آیدی‌های ادمین فعلی:\n',
    admin_btn_add_admin: '➕ افزودن ادمین جدید با آیدی تلگرام',
    admin_btn_del_admin: '🗑 حذف یک ادمین',
    admin_prompt_add_admin: '👥 لطفاً آیدی عددی تلگرام (Telegram User ID) ادمین جدید را وارد کنید (مثال: 123456789):',
    admin_add_admin_success: (id) => `👥 کاربر با آیدی <code>${id}</code> با موفقیت به عنوان ادمین جدید ثبت شد.`,
    admin_btn_back_admins: '🔙 بازگشت به مدیریت ادمین‌ها',
    admin_services_menu_title: (count) => `💇‍♂️ <b>مدیریت خدمات سالن:</b>\n\nتعداد خدمات فعال: ${count}\n\n`,
    admin_btn_add_service: '➕ افزودن خدمت جدید',
    admin_btn_rename_service: '✏️ تغییر نام خدمت',
    admin_btn_edit_price: '💰 تغییر قیمت خدمت',
    admin_btn_del_service: '🗑 حذف یک خدمت',
    admin_prompt_service_name: '➕ لطفاً نام خدمت جدید را وارد کنید (مثال: اصلاح مو و سشوار):',
    admin_prompt_service_price: (name) => `نام خدمت: "${name}" ثبت شد.\nلطفاً هزینه این خدمت را به تومان وارد کنید (مثال: 180000):`,
    admin_prompt_service_dur: (price) => `هزینه: ${price.toLocaleString()} تومان ثبت شد.\nلطفاً مدت زمان خدمت را به دقیقه وارد کنید (مثال: 45):`,
    admin_add_service_success: (name) => `💇‍♂️ خدمت جدید "${name}" با موفقیت ثبت شد.`,
    admin_btn_back_services: '🔙 بازگشت به مدیریت خدمات',
    admin_barbers_menu_title: (barbersText) => `💈 <b>مدیریت آرایشگران سالن:</b>\n\nآرایشگران فعلی:\n${barbersText}`,
    admin_btn_add_barber: '➕ افزودن آرایشگر جدید',
    admin_btn_del_barber: '🗑 حذف یک آرایشگر',
    admin_prompt_add_barber: '💈 لطفاً نام و عنوان آرایشگر جدید را وارد کنید (مثال: رضا استایلیست):',
    admin_add_barber_success: (name) => `💈 آرایشگر جدید "${name}" با موفقیت اضافه شد.`,
    admin_btn_back_barbers: '🔙 بازگشت به مدیریت آرایشگران',
    admin_holidays_menu_title: (specialDaysText, recurringDaysText) =>
      `📅 <b>مدیریت روزهای تعطیل سالن:</b>\n\n` +
      `🔴 <b>تعطیلات خاص ثبت شده:</b> ${specialDaysText}\n` +
      `🔴 <b>تعطیلات هفتگی ثابت:</b> ${recurringDaysText}\n`,
    admin_btn_recurring_days: '📆 تنظیم تعطیلات هفتگی ثابت (جمعه‌ها...)',
    admin_btn_add_day_off: '➕ افزودن تاریخ تعطیل خاص',
    admin_btn_del_day_off: '🗑 حذف تاریخ تعطیل خاص',
    admin_prompt_add_day_off: '➕ لطفاً تاریخ روز تعطیل را به صورت شمسی و با فرمت YYYY-MM-DD وارد کنید (مثال: 1405-05-15):',
    admin_add_day_off_success: (dateStr) => `🛑 تاریخ ${dateStr} با موفقیت به عنوان روز تعطیل سالن ثبت گردید.`,
    admin_btn_back_holidays: '🔙 بازگشت به مدیریت تعطیلات',
    admin_recurring_menu_title: '📆 <b>مدیریت روزهای تعطیل هفتگی ثابت:</b>\n\nبرای تغییر وضعیت تعطیلی روی روز مورد نظر کلیک کنید:',
    admin_op_cancelled: 'عملیات مدیریت لغو شد.'
  },

  en: {
    welcome: (salonName) => `💈 <b>Welcome to "${salonName}" Barber Salon!</b> 💇‍♂️\n\nWe provide the finest grooming, hair, and skincare services.\n\nPlease select an option below to begin:`,
    btn_book: '📅 Book Appointment',
    btn_my_appts: '📋 My Appointments',
    btn_services: '💇‍♂️ Services & Prices',
    btn_contact: '📞 Contact Us',
    btn_lang_toggle: '🇮🇷 فارسی',
    btn_back_to_menu: '🏠 Back to Main Menu',
    btn_back: '🔙 Back',
    btn_cancel: '❌ Cancel',
    btn_cancel_appt: '❌ Cancel Appointment',
    btn_share_contact: '📱 Share Phone Number',
    btn_back_to_time: '🔙 Back to Time Selection',
    btn_cancel_booking: '❌ Cancel Booking',

    services_title: (salonName) => `💇‍♂️ <b>Services & Price List for "${salonName}":</b>\n\n`,
    services_empty: 'No services are currently registered in the system.',
    service_price_unit: 'Tomans',
    service_dur_unit: 'mins',

    contact_info: (salonName, address, phone, openTime, closeTime) => 
      `📞 <b>Contact Information for "${salonName}":</b>\n\n` +
      `📍 <b>Address:</b> ${address}\n` +
      `☎️ <b>Phone:</b> ${phone}\n\n` +
      `⏰ <b>Opening Hours:</b>\n` +
      `From ${openTime} to ${closeTime}\n\n` +
      `<i>We look forward to seeing you! 🌹</i>`,

    no_user_found: 'You have not booked any appointments yet.',
    no_active_appts: 'You currently have no active appointments.',
    active_appts_title: '📋 <b>Your Active Appointments:</b>',
    appt_barber_auto: 'Assigned by Salon',
    appt_cancelled_msg: '❌ <b>This appointment has been cancelled.</b>\n\nThe slot is now available.',
    appt_cancel_success: 'Your appointment has been cancelled successfully.',

    wizard_step1_title: '💇‍♂️ Please select a service:',
    wizard_step2_title: (serviceName, duration) => `Selection: <b>${serviceName} (${duration} mins)</b>\n\n👤 Please select a barber:`,
    wizard_step3_title: (serviceName, duration, barberName) => 
      barberName 
        ? `Selected Barber: <b>${barberName}</b>\n\n📅 Please select a date:`
        : `Selection: <b>${serviceName} (${duration} mins)</b>\n\n📅 Please select a date:`,
    wizard_step4_title: (dateLabel, serviceName, duration) =>
      `Selected Date: <b>${dateLabel}</b>\n` +
      `Selected Service: <b>${serviceName}</b> (Duration: <b>${duration} mins</b>)\n\n` +
      `⏰ Please select an available start time:`,
    wizard_step5_title: (time, endTimeStr) =>
      `Selected Start Time: <b>${time}</b> (End: <b>${endTimeStr}</b>)\n\n📱 To finalize your appointment, please tap the button below to share your contact phone number:`,

    wizard_slot_booked: (time) => `❌ ${time} (Booked)`,
    wizard_slot_full_alert: (time) => `The slot at ${time} or its duration is already booked. ❌`,
    wizard_cancel_msg: 'Booking operation cancelled. ❌',
    wizard_contact_prompt: 'Please use the "📱 Share Phone Number" button to confirm your booking.',
    wizard_confirming: 'Phone number verified. Generating booking invoice...',
    wizard_success_invoice: (salonName, serviceName, duration, price, barberName, dateLabel, time, endTimeStr, phone) =>
      `<b>🎉 Your appointment at "${salonName}" has been confirmed!</b>\n\n` +
      `📌 <b>Appointment Details:</b>\n` +
      `💇‍♂️ <b>Service:</b> ${serviceName} (${duration} mins)\n` +
      `💰 <b>Price:</b> ${price.toLocaleString()} Tomans\n` +
      `👤 <b>Barber:</b> ${barberName}\n` +
      `📅 <b>Date:</b> ${dateLabel}\n` +
      `⏰ <b>Time:</b> ${time} to ${endTimeStr}\n` +
      `📱 <b>Phone:</b> ${phone}\n\n` +
      `<i>We look forward to serving you! ❤️</i>`,
    wizard_conflict_error: (time, dateLabel) => `❌ Sorry, the slot at ${time} on ${dateLabel} was just booked by someone else. Please select another time.`,

    lang_changed: 'Application language changed to English. 🇺🇸',

    admin_unauthorized: 'You do not have permission to execute this command. ⛔',
    admin_panel_title: (salonName) => `👑 <b>Admin Panel for "${salonName}":</b>\n\nPlease select a section below:`,
    admin_btn_today_report: "📊 Today's Appointments Report",
    admin_btn_hours: '⏰ Working Hours & Slot Duration',
    admin_btn_appointments: '📅 Manage Appointments (Walk-in & Online)',
    admin_btn_toggle_barber: (enabled) => enabled ? '👤 Barber Selection: ✅ Enabled' : '👤 Barber Selection: ❌ Disabled (Auto)',
    admin_btn_services: '💇‍♂️ Manage Services',
    admin_btn_barbers: '💈 Manage Barbers',
    admin_btn_holidays: '📅 Manage Holidays',
    admin_btn_admins: '👥 Manage Admins',
    admin_btn_back: '🔙 Back to Admin Panel',
    admin_btn_trigger_reminders: '🔔 Send Reminders Now',
    admin_today_empty: (dateLabel) => `📅 <b>Today's Appointments (${dateLabel}):</b>\n\nNo appointments booked for today.`,
    admin_today_report_header: (dateLabel) => `📅 <b>Today's Appointments List (${dateLabel}):</b>\n\n`,
    admin_remind_status: (reminded) => reminded ? '✅ Sent' : '⏳ Pending',
    admin_remind_done: (count) => `✅ Reminder dispatch completed. ${count} reminders sent successfully.`,
    admin_hours_title: (openTime, closingTime, duration) => 
      `⏰ <b>Working Hours & Slot Duration Settings:</b>\n\n` +
      `🌅 <b>Opening Time:</b> <code>${openTime}</code>\n` +
      `🌇 <b>Closing Time:</b> <code>${closingTime}</code>\n` +
      `⏱ <b>Slot Duration:</b> <code>${duration} mins</code>\n\n` +
      `Select an option below to edit:`,
    admin_btn_edit_opening: '🌅 Change Opening Time',
    admin_btn_edit_closing: '🌇 Change Closing Time',
    admin_btn_edit_slot_dur: '⏱ Change Slot Duration (15 / 30 / 45 / 60 mins)',
    admin_prompt_opening: '🌅 Please enter the new opening time in HH:MM format (e.g. 09:00):',
    admin_prompt_closing: '🌇 Please enter the new closing time in HH:MM format (e.g. 21:30):',
    admin_slot_dur_title: (dur) => `⏱ <b>Select Slot Duration:</b>\n\nCurrent duration: <b>${dur} mins</b>`,
    admin_btn_back_hours: '🔙 Back to Working Hours',
    admin_slot_dur_changed: (dur) => `Slot duration changed to ${dur} mins.`,
    admin_barber_toggle_alert: (enabled) => `Barber selection is now ${enabled ? 'enabled' : 'disabled'}.`,
    admin_appts_menu_title: '📅 <b>Appointments Management (Walk-in & Online):</b>\n\nSelect an option to add walk-in booking or view/cancel appointments:',
    admin_btn_walkin: '➕ Register New Walk-in Appointment',
    admin_btn_list_appts: '📋 List & Cancel Registered Appointments',
    admin_walkin_step1: '➕ <b>Walk-in Booking - Step 1/4:</b>\n\nPlease select a service:',
    admin_walkin_step2: (name, dur) => `Selected Service: <b>${name} (${dur} mins)</b>\n\n<b>Step 2/4:</b> Select a barber:`,
    admin_walkin_any_barber: '🎲 Any Available Barber',
    admin_walkin_step3: '<b>Step 3/4:</b> Please select a date for walk-in appointment:',
    admin_walkin_step4: (dateLabel, name, dur) => `Date: <b>${dateLabel}</b> (Service: <b>${name}</b> - ${dur} mins)\n\n<b>Step 4/4:</b> Select a start time:`,
    admin_walkin_prompt_info: (time) => `Selected Time: <b>${time}</b>\n\nPlease enter the customer name and phone number (e.g. John Doe - +1 555-0199):`,
    admin_walkin_success: (name, phone, serviceName, dur, dateLabel, time, endTimeStr) =>
      `✅ <b>Walk-in appointment registered successfully!</b>\n\n` +
      `👤 <b>Customer:</b> ${name} (${phone})\n` +
      `💇‍♂️ <b>Service:</b> ${serviceName} (${dur} mins)\n` +
      `📅 <b>Date:</b> ${dateLabel}\n` +
      `⏰ <b>Time:</b> ${time} to ${endTimeStr}`,
    admin_btn_back_appts: '🔙 Back to Appointments Management',
    admin_active_appts_header: '📋 <b>Top 20 Active Upcoming Appointments:</b>',
    admin_btn_cancel_appt_admin: '❌ Cancel Appointment (by Admin)',
    admin_cancelled_by_admin: '❌ <b>This appointment has been cancelled by Admin:</b>',
    admin_admins_menu_title: '👥 <b>Manage Salon Administrators:</b>\n\nCurrent admin IDs:\n',
    admin_btn_add_admin: '➕ Add New Admin by Telegram ID',
    admin_btn_del_admin: '🗑 Delete an Admin',
    admin_prompt_add_admin: '👥 Please enter the Telegram User ID of the new admin (e.g. 123456789):',
    admin_add_admin_success: (id) => `👥 User ID <code>${id}</code> registered successfully as a new admin.`,
    admin_btn_back_admins: '🔙 Back to Admins Management',
    admin_services_menu_title: (count) => `💇‍♂️ <b>Salon Services Management:</b>\n\nActive Services Count: ${count}\n\n`,
    admin_btn_add_service: '➕ Add New Service',
    admin_btn_rename_service: '✏️ Rename Service',
    admin_btn_edit_price: '💰 Edit Service Price',
    admin_btn_del_service: '🗑 Delete a Service',
    admin_prompt_service_name: '➕ Please enter the name of the new service (e.g. Haircut & Styling):',
    admin_prompt_service_price: (name) => `Service name "${name}" saved.\nPlease enter the price in Tomans (e.g. 180000):`,
    admin_prompt_service_dur: (price) => `Price: ${price.toLocaleString()} Tomans saved.\nPlease enter duration in minutes (e.g. 45):`,
    admin_add_service_success: (name) => `💇‍♂️ New service "${name}" created successfully.`,
    admin_btn_back_services: '🔙 Back to Services Management',
    admin_barbers_menu_title: (barbersText) => `💈 <b>Salon Barbers Management:</b>\n\nCurrent Barbers:\n${barbersText}`,
    admin_btn_add_barber: '➕ Add New Barber',
    admin_btn_del_barber: '🗑 Delete a Barber',
    admin_prompt_add_barber: '💈 Please enter the name of the new barber (e.g. Barber Alex):',
    admin_add_barber_success: (name) => `💈 New barber "${name}" added successfully.`,
    admin_btn_back_barbers: '🔙 Back to Barbers Management',
    admin_holidays_menu_title: (specialDaysText, recurringDaysText) =>
      `📅 <b>Salon Holidays Management:</b>\n\n` +
      `🔴 <b>Special Holidays Registered:</b> ${specialDaysText}\n` +
      `🔴 <b>Weekly Recurring Holidays:</b> ${recurringDaysText}\n`,
    admin_btn_recurring_days: '📆 Set Recurring Weekly Holidays (Fridays...)',
    admin_btn_add_day_off: '➕ Add Specific Day Off Date',
    admin_btn_del_day_off: '🗑 Delete Specific Day Off Date',
    admin_prompt_add_day_off: '➕ Please enter the day off date in YYYY-MM-DD format (e.g. 1405-05-15):',
    admin_add_day_off_success: (dateStr) => `🛑 Date ${dateStr} added successfully as a salon holiday.`,
    admin_btn_back_holidays: '🔙 Back to Holidays Management',
    admin_recurring_menu_title: '📆 <b>Recurring Weekly Days Off Management:</b>\n\nClick on any weekday to toggle holiday status:',
    admin_op_cancelled: 'Admin operation cancelled.'
  }
};

export function getTranslation(lang = 'en') {
  return translations[lang] || translations.en;
}
