import { calculateStopLoss, calculateTakeProfit } from '../indicators/stopLoss';
import { fetchNewsSentiment } from '../news/newsFeed';
import logger from '../utils/logger';

let client: any;
let symbol: string;

export function setClientAndSymbol(_client: any, _symbol: string) {
  client = _client;
  symbol = _symbol;
  logger.info(`Client and symbol set: ${symbol}`);
}

export async function generateSignal(data: {
  volume: { [key: string]: { spike: number; isSignificant: boolean } };
  orderBook: { buyerPressure: boolean };
  rsi: { [key: string]: number };
  macd: { [key: string]: { macd: number; signal: number; histogram: number } };
  currentPrice: number;
}) {
  try {
    if (!client || !symbol) {
      throw new Error('Client or symbol not initialized');
    }
    const { volume, orderBook, rsi, macd, currentPrice } = data;
    const stopLoss = await calculateStopLoss(client, symbol, currentPrice);
    const takeProfit = await calculateTakeProfit(symbol, currentPrice);
    const news = await fetchNewsSentiment();

    const use5mConfirmation = false; // Toggle for 5m (set to true for stricter signals)

    // LONG signal
    if (
      macd['1h'].histogram > 0 && rsi['1h'] > 50 && // Bullish 1h trend
      (!use5mConfirmation || (rsi['5m'] < 25 && volume['5m'].isSignificant)) && // Optional 5m
      rsi['1m'] < 20 && volume['1m'].isSignificant && orderBook.buyerPressure && macd['1m'].histogram > 0 &&
      news.sentiment === 'Positive'
    ) {
      const signal = {
        type: 'LONG',
        rsi,
        macd,
        volume,
        orderBook: { buyerPressure: true },
        stopLoss,
        takeProfit,
        news: news.sentiment,
        confidence: 'High',
      };
      logger.info(`Generated LONG signal for ${symbol}`);
      return signal;
    }

    // SHORT signal
    if (
      macd['1h'].histogram < 0 && rsi['1h'] < 50 &&
      (!use5mConfirmation || (rsi['5m'] > 75 && volume['5m'].isSignificant)) &&
      rsi['1m'] > 80 && volume['1m'].isSignificant && !orderBook.buyerPressure && macd['1m'].histogram < 0 &&
      news.sentiment === 'Negative'
    ) {
      const signal = {
        type: 'SHORT',
        rsi,
        macd,
        volume,
        orderBook: { buyerPressure: false },
        stopLoss,
        takeProfit,
        news: news.sentiment,
        confidence: 'High',
      };
      logger.info(`Generated SHORT signal for ${symbol}`);
      return signal;
    }

    else {
      const signal = {
        type: 'NEUTRAL',
        rsi,
        macd,
        volume,
        orderBook: { buyerPressure: false },
        stopLoss,
        takeProfit,
        news: news.sentiment,
        confidence: 'NEUTRAL',
      };
      logger.info(`No signal generated for ${symbol}`);
      return signal;
    }
    //logger.info(`No signal generated for ${symbol}`);
    // return null;
  } catch (error) {
    logger.error(`Failed to generate signal for ${symbol || 'undefined'}: ${error}`);
    throw error;
  }
}