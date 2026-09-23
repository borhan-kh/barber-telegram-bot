import { Telegraf, Scenes, session } from 'telegraf';
import express from 'express';
import dotenv from 'dotenv';
import config from './config/index.js';
import { connectDB } from './database.js';
import logger from './utils/logger.js';
import { bookingWizard } from './scenes/bookingWizard.js';
import { setupUserHandlers, getMainMarkup, getUserLang } from './controllers/userHandler.js';
import { setupAdminHandlers } from './controllers/adminHandler.js';
import { startAppointmentReminderScheduler } from './utils/scheduler.js';
import { getTranslation } from './utils/i18n.js';

dotenv.config();

if (!config.botToken) {
  logger.error('BOT_TOKEN environment variable is not defined.');
  process.exit(1);
}

await connectDB();

const bot = new Telegraf(config.botToken);
const stage = new Scenes.Stage([bookingWizard]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  try {
    const lang = await getUserLang(ctx);
    const t = getTranslation(lang);
    const welcomeMessage = t.welcome(config.salon.name);
      
    await ctx.replyWithHTML(welcomeMessage, getMainMarkup(lang));
  } catch (error) {
    logger.error('Error handling /start command', { error: error.message });
  }
});

setupUserHandlers(bot);
setupAdminHandlers(bot);

bot.catch((err, ctx) => {
  logger.error('Unhandled bot framework error', {
    userId: ctx.from?.id,
    error: err.message,
    stack: err.stack
  });
  ctx.reply('An error occurred in the bot. ❌').catch(() => {});
});

async function startBot() {
  if (config.useWebhook && config.webhookDomain) {
    const app = express();
    const fullWebhookUrl = `${config.webhookDomain}${config.webhookPath}`;

    app.use(express.json());
    app.use(bot.webhookCallback(config.webhookPath));

    app.get('/', (req, res) => {
      res.send('Barber Telegram Bot is running in Webhook mode.');
    });

    app.listen(config.port, async () => {
      logger.info(`Express server running on port ${config.port}`);
      try {
        await bot.telegram.setWebhook(fullWebhookUrl);
        logger.info(`Telegram Webhook set successfully to ${fullWebhookUrl}`);
      } catch (err) {
        logger.error('Failed to set Telegram webhook', { error: err.message });
      }
    });
  } else {
    try {
      await bot.launch();
      logger.info('Bot launched successfully in Long-Polling mode.');
    } catch (err) {
      logger.error('Failed to launch bot in Long-Polling mode', { error: err.message });
      process.exit(1);
    }
  }

  startAppointmentReminderScheduler(bot);
}

startBot();

process.once('SIGINT', () => {
  logger.info('Received SIGINT signal. Stopping bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM signal. Stopping bot...');
  bot.stop('SIGTERM');
});
