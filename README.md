# Barber Shop Telegram Booking Bot

A production-ready, multi-language, modular, and scalable Telegram Appointment Booking Bot built with Node.js, Telegraf (v4+), MongoDB (Mongoose), Winston Logging, and flexible Webhook / Long-Polling support.

---

## Features

- **Customer Booking Wizard**: Step-by-step Telegraf `WizardScene` for selecting services, optional barbers, available dates, time slots, and sharing contact information.
- **Dynamic Slot & Multi-Slot Math**: Calculates multi-slot service durations (e.g. a 60-min service takes 2 consecutive slots) and automatically flags occupied or past time slots as `Booked`.
- **Full Reversible Navigation**: Includes `Back` and `Cancel` buttons at every step of the booking process.
- **Interactive Admin Panel**:
  - View daily appointment reports with manual reminder dispatch trigger.
  - Configure opening/closing working hours and slot durations (15, 30, 45, 60 minutes).
  - Register in-person walk-in appointments for salon customers.
  - Manage services (add, rename, edit price, delete).
  - Manage barbers (add, delete, toggle barber selection on/off).
  - Manage holidays (specific dates off and recurring weekly days off).
  - Multi-admin management (add/remove admin IDs dynamically).
  - Full English & Persian admin panel support.
- **Automated Appointment Reminders**: Background scheduler runs every 15 minutes to send Telegram notifications to customers for today's appointments.
- **Flexible Deployment**: Supports both Webhook and Long-Polling modes for deployment on Docker, VPS, PM2, Render, Railway, or Heroku.

---

## Project Architecture

```
BarberTelegramBot/
├── config/
│   ├── default.json          # Business configuration (branding, hours, initial seed data)
│   └── index.js              # Environment & config loader
├── controllers/
│   ├── adminHandler.js       # Admin panel routes & interactive menus
│   └── userHandler.js        # Main user commands & menus
├── models/
│   ├── Appointment.js        # Appointment Mongoose schema
│   ├── Barber.js             # Barber schema
│   ├── Config.js             # System configuration schema
│   ├── Service.js            # Service schema
│   └── User.js               # Customer schema with language preference
├── scenes/
│   └── bookingWizard.js      # Customer booking wizard scene
├── services/
│   └── appointmentService.js # Interval overlap math & slot availability service
├── utils/
│   ├── date.js               # Jalaali calendar & time conversion utilities
│   ├── i18n.js               # English & Persian localization dictionaries
│   ├── logger.js             # Winston structured logging utility
│   └── scheduler.js          # Appointment reminder scheduler
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration
├── bot.js                    # Main entry point & server setup
├── database.js               # MongoDB connection setup with connection pooling
├── LICENSE                   # MIT License file
├── package.json              # Project manifest
└── seed.js                   # Database initial seeder script
```

---

## Prerequisites

- **Node.js** v18.0.0 or higher
- **MongoDB** v6.0+
- **Telegram Bot Token** (Obtained from Telegram's [@BotFather](https://t.me/BotFather))

---

## Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/borhan-kh/barber-telegram-bot.git
cd barber-telegram-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyZ
MONGO_URI=mongodb://127.0.0.1:27017/barber_bot
ADMIN_ID=671813462
PORT=3000
USE_WEBHOOK=false
WEBHOOK_DOMAIN=https://your-domain.com
SALON_NAME=Barber Salon
SALON_ADDRESS=123 Main Street
SALON_PHONE=+1 555-0000
```

### 4. Customize Default Settings
You can modify default services, barbers, and salon info in `config/default.json`:

### 5. Seed the Database
Populate initial barbers and services into MongoDB:
```bash
npm run seed
```

### 6. Run the Bot
```bash
npm start
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `BOT_TOKEN` | **Yes** | - | Telegram Bot API token from BotFather |
| `MONGO_URI` | **Yes** | `mongodb://127.0.0.1:27017/barber_bot` | MongoDB connection URI string |
| `ADMIN_ID` | **Yes** | - | Telegram numeric user ID of primary admin |
| `PORT` | No | `3000` | Port for Webhook Express server |
| `USE_WEBHOOK` | No | `false` | Set `true` to enable Webhook mode |
| `WEBHOOK_DOMAIN` | If webhook | - | Public HTTPS URL for Webhook endpoint |
| `SALON_NAME` | No | `Barber Salon` | Salon display name |
| `SALON_ADDRESS` | No | `123 Main Street` | Salon location address |
| `SALON_PHONE` | No | `+1 555-0000` | Salon phone number |

---

## Production Deployment

### Option A: PM2 (VPS / Dedicated Server)
```bash
npm install -g pm2
pm2 start bot.js --name "barber-bot"
pm2 save
pm2 startup
```

### Option B: Docker
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t barber-bot .
docker run -d --name barber-bot --env-file .env -p 3000:3000 barber-bot
```

### Option C: Cloud Platforms (Render, Railway, Heroku)
1. Push repository to GitHub.
2. Connect repo to cloud platform.
3. Add environment variables (`BOT_TOKEN`, `MONGO_URI`, `ADMIN_ID`, `USE_WEBHOOK=true`, `WEBHOOK_DOMAIN=https://your-app.onrender.com`).
4. Set build command: `npm install`
5. Set start command: `npm start`

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
