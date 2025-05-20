import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config';
import logger from '../utils/logger';

const bot = new TelegramBot(config.telegram.botToken, { polling: false });

export async function sendTelegramMessage(message: string) {
  try {
    await bot.sendMessage(config.telegram.chatId, message, { parse_mode: 'Markdown' });
    logger.info('Telegram message sent successfully');
  } catch (error) {
    logger.error(`Telegram error: ${error}`);
    throw error;
  }
}