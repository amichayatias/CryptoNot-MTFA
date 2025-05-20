import dotenv from 'dotenv';

dotenv.config();

export const config = {
  binance: {
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || '',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '', // Replace with your chat ID
  },
  cryptopanic: {
    apiKey: process.env.CRYPTOPANIC_API_KEY || '',
  },
  taapi: {
    apiKey: process.env.TAAPI_IO_KEY || '',
  },
};